import { z } from "zod";
import { one, type SQL, type Row } from "./db";
import { allow, AppError, id, recentVerification, type Actor } from "./auth";
import { audit, notify } from "./governance";
import { testimonialPolicy } from "./testimonial-schema";
const safeText = z
  .string()
  .trim()
  .refine(
    (t) => !/[<>]|https?:|www\.|@|\+?\d[\d\s()-]{7,}\d/i.test(t),
    "Remove HTML, links, contact details and personal information.",
  );
const content = z
  .object({
    rating: z.number().int().min(1).max(5),
    body: safeText.pipe(z.string().min(20).max(2000)),
    nameStyle: z.enum(["first", "initials", "custom"]),
    displayName: safeText.pipe(z.string().min(2).max(60)),
    consent: z.boolean(),
  })
  .strict();
const transitions: Record<string, string[]> = {
  DRAFT: ["PENDING_REVIEW", "WITHDRAWN"],
  PENDING_REVIEW: ["APPROVED", "REJECTED", "CHANGES_REQUESTED", "WITHDRAWN"],
  CHANGES_REQUESTED: ["DRAFT", "PENDING_REVIEW", "WITHDRAWN"],
  APPROVED: ["PUBLISHED", "HIDDEN", "WITHDRAWN"],
  PUBLISHED: ["HIDDEN", "WITHDRAWN"],
  HIDDEN: ["PUBLISHED", "WITHDRAWN"],
  REJECTED: [],
  WITHDRAWN: [],
};
export async function testimonialPolicyValue(tx: SQL) {
  const r = await one(
    tx,
    "SELECT value FROM settings WHERE key='testimonials.policy' AND scope='lagos'",
  );
  return testimonialPolicy.parse(r?.value);
}
async function eligible(
  tx: SQL,
  userId: string,
  orderId?: string,
  bookingId?: string,
) {
  const row = orderId
    ? await one(
        tx,
        "SELECT id,address->>'zone' AS zone,address->>'street' AS street FROM orders o WHERE id=$1 AND customer_id=$2 AND status='delivered' AND payment_status='verified' AND EXISTS(SELECT 1 FROM verified_payments p WHERE p.order_id=o.id)",
        [orderId, userId],
      )
    : await one(
        tx,
        "SELECT id,address->>'zone' AS zone,address->>'street' AS street FROM service_bookings b WHERE id=$1 AND customer_id=$2 AND status='completed' AND EXISTS(SELECT 1 FROM service_reports r WHERE r.booking_id=b.id)",
        [bookingId, userId],
      );
  if (!row)
    throw new AppError(
      409,
      "A delivered, verified-paid order or completed service report is required.",
    );
  return row;
}
async function record(
  tx: SQL,
  user: Actor,
  row: Row,
  action: string,
  from: string | null,
  reason: string,
) {
  await tx.query(
    "INSERT INTO testimonial_events(id,testimonial_id,actor_id,action,from_status,to_status,revision,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
    [id(), row.id, user.id, action, from, row.status, row.revision, reason],
  );
  await audit(tx, user, "testimonial." + action, row.id, "success", {
    from,
    status: row.status,
    revision: row.revision,
    reason,
  });
}
async function version(
  tx: SQL,
  row: Row,
  data: z.infer<typeof content>,
  user: Actor,
) {
  let name = data.displayName;
  if (data.nameStyle === "first") name = user.name.trim().split(/\s+/)[0];
  if (data.nameStyle === "initials")
    name =
      user.name
        .trim()
        .split(/\s+/)
        .map((s) => s[0])
        .join(". ") + ".";
  safeText.pipe(z.string().min(2).max(60)).parse(name);
  await tx.query(
    "INSERT INTO testimonial_versions(testimonial_id,version,rating,body,display_name,name_style,public_location,consent,consent_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [
      row.id,
      row.current_version,
      data.rating,
      data.body,
      name,
      data.nameStyle,
      "",
      data.consent,
      data.consent ? new Date().toISOString() : null,
    ],
  );
}
export async function testimonialAction(
  tx: SQL,
  action: string,
  user: Actor | null,
  input: unknown,
): Promise<any> {
  const p = await testimonialPolicyValue(tx);
  if (action === "testimonials.public") {
    z.object({}).strict().parse(input);
    if (!p.enabled) return [];
    return (
      await tx.query(
        "SELECT v.rating,v.body,v.display_name,v.public_location,CASE WHEN v.photo_consent=true AND $2::boolean THEN '/api/media/'||v.image_id ELSE NULL END AS image_url FROM customer_testimonials t JOIN testimonial_versions v ON v.testimonial_id=t.id AND v.version=t.current_version WHERE t.status='PUBLISHED' AND t.reviewed_version=t.current_version AND v.consent=true ORDER BY t.published_at DESC,t.id LIMIT $1",
        [p.publishedLimit, p.imagesEnabled],
      )
    ).rows;
  }
  if (!user) throw new AppError(401, "Sign in to continue.");
  if (action === "testimonials.mine") {
    allow(user, ["customer", "commercial"]);
    const d = z
      .object({
        orderId: z.string().uuid().optional(),
        bookingId: z.string().uuid().optional(),
      })
      .strict()
      .parse(input);
    const submissions = (
      await tx.query(
        "SELECT t.*,v.rating,v.body,v.display_name,v.name_style,v.consent,v.image_id,v.photo_consent,(SELECT reason FROM testimonial_events e WHERE e.testimonial_id=t.id ORDER BY e.created_at DESC,e.revision DESC LIMIT 1) AS latest_reason FROM customer_testimonials t JOIN testimonial_versions v ON v.testimonial_id=t.id AND v.version=t.current_version WHERE t.customer_id=$1 ORDER BY (COALESCE(t.order_id=$2,false) OR COALESCE(t.booking_id=$3,false)) DESC,t.created_at DESC LIMIT 100",
        [user.id, d.orderId ?? null, d.bookingId ?? null],
      )
    ).rows;
    const orders = (
      await tx.query(
        "SELECT o.id,o.reference FROM orders o WHERE customer_id=$1 AND status='delivered' AND payment_status='verified' AND EXISTS(SELECT 1 FROM verified_payments p WHERE p.order_id=o.id) AND NOT EXISTS(SELECT 1 FROM customer_testimonials t WHERE t.order_id=o.id) ORDER BY COALESCE(o.id=$2,false) DESC,created_at DESC LIMIT 50",
        [user.id, d.orderId ?? null],
      )
    ).rows;
    const bookings = (
      await tx.query(
        "SELECT b.id,b.reference FROM service_bookings b WHERE customer_id=$1 AND status='completed' AND EXISTS(SELECT 1 FROM service_reports r WHERE r.booking_id=b.id) AND NOT EXISTS(SELECT 1 FROM customer_testimonials t WHERE t.booking_id=b.id) ORDER BY COALESCE(b.id=$2,false) DESC,created_at DESC LIMIT 50",
        [user.id, d.bookingId ?? null],
      )
    ).rows;
    const selectedTransaction = orders.some((r) => r.id === d.orderId)
      ? "order:" + d.orderId
      : bookings.some((r) => r.id === d.bookingId)
        ? "booking:" + d.bookingId
        : "";
    return { submissions, orders, bookings, selectedTransaction, policy: p };
  }
  if (action === "testimonials.manage" || action === "testimonials.export") {
    allow(user, ["owner"]);
    const d = z
      .object({
        q: z.string().trim().max(200).optional(),
        status: z
          .enum([
            "DRAFT",
            "PENDING_REVIEW",
            "APPROVED",
            "PUBLISHED",
            "REJECTED",
            "CHANGES_REQUESTED",
            "HIDDEN",
            "WITHDRAWN",
          ])
          .optional(),
        rating: z.coerce.number().int().min(1).max(5).optional(),
        since: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .refine((s) => Number.isFinite(Date.parse(s)))
          .optional(),
        sort: z.enum(["newest", "oldest", "rating"]).default("newest"),
        page: z.coerce.number().int().min(0).max(100000).default(0),
        limit: z.coerce.number().int().min(1).max(100).default(10),
      })
      .strict()
      .parse(input);
    const search = d.q ? "%" + d.q.replace(/[\\%_]/g, "\\$&") + "%" : null;
    const params = [
      d.status ?? null,
      d.rating ?? null,
      search,
      d.since ?? null,
    ];
    const from =
      "FROM customer_testimonials t JOIN testimonial_versions v ON v.testimonial_id=t.id AND v.version=t.current_version JOIN users u ON u.id=t.customer_id WHERE ($1::text IS NULL OR t.status=$1) AND ($2::integer IS NULL OR v.rating=$2) AND ($3::text IS NULL OR v.body ILIKE $3 OR v.display_name ILIKE $3 OR u.name ILIKE $3) AND ($4::date IS NULL OR t.created_at>=($4::date::timestamp AT TIME ZONE 'Africa/Lagos'))";
    const total = Number(
      (await one(tx, "SELECT count(*) AS n " + from, params))?.n ?? 0,
    );
    if (action === "testimonials.export" && total > 5000)
      throw new AppError(
        413,
        "Narrow your filters to export at most 5,000 testimonials per file.",
      );
    const order = {
      newest: "t.created_at DESC,t.id",
      oldest: "t.created_at,t.id",
      rating: "v.rating,t.created_at DESC,t.id",
    }[d.sort];
    const rows = (
      await tx.query(
        "SELECT t.*,v.rating,v.body,v.display_name,v.consent,u.name AS customer_name " +
          from +
          " ORDER BY " +
          order +
          " LIMIT $5 OFFSET $6",
        [
          ...params,
          action === "testimonials.export" ? 5000 : d.limit,
          action === "testimonials.export" ? 0 : d.page * d.limit,
        ],
      )
    ).rows;
    return { rows, total, page: d.page, limit: d.limit };
  }
  if (action === "testimonials.analytics") {
    allow(user, ["owner"]);
    z.object({}).strict().parse(input);
    return {
      counts: (
        await tx.query(
          "SELECT status,count(*)::integer AS count FROM customer_testimonials GROUP BY status",
        )
      ).rows,
      publishedRatings: (
        await tx.query(
          "SELECT v.rating,count(*)::integer AS count FROM customer_testimonials t JOIN testimonial_versions v ON v.testimonial_id=t.id AND v.version=t.current_version WHERE t.status='PUBLISHED' AND t.reviewed_version=t.current_version AND v.consent GROUP BY v.rating ORDER BY v.rating",
        )
      ).rows,
      monthly: (
        await tx.query(
          "SELECT to_char(date_trunc('month',created_at),'YYYY-MM') AS month,count(*)::integer AS count FROM customer_testimonials WHERE created_at>now()-interval '6 months' GROUP BY 1 ORDER BY 1",
        )
      ).rows,
      retention: await one(
        tx,
        "SELECT count(*)::integer AS due FROM customer_testimonials WHERE created_at<now()-($1::integer*interval '1 day')",
        [p.retentionDays],
      ),
      turnaround: await one(
        tx,
        "SELECT avg(extract(epoch FROM (e.created_at-t.created_at))/3600) AS average_hours FROM customer_testimonials t JOIN testimonial_events e ON e.testimonial_id=t.id WHERE e.to_status='APPROVED'",
      ),
    };
  }
  if (action === "testimonial.detail") {
    const d = z.object({ id: z.string() }).strict().parse(input);
    const row = await one(
      tx,
      "SELECT * FROM customer_testimonials WHERE id=$1",
      [d.id],
    );
    if (!row) throw new AppError(404, "Testimonial not found.");
    if (row.customer_id !== user.id) allow(user, ["owner"]);
    return {
      testimonial: row,
      versions: (
        await tx.query(
          "SELECT * FROM testimonial_versions WHERE testimonial_id=$1 ORDER BY version",
          [row.id],
        )
      ).rows,
      events: (
        await tx.query(
          "SELECT action,from_status,to_status,revision,reason,created_at FROM testimonial_events WHERE testimonial_id=$1 ORDER BY created_at,id",
          [row.id],
        )
      ).rows,
    };
  }
  if (action === "testimonial.create") {
    allow(user, ["customer", "commercial"]);
    if (!p.enabled)
      throw new AppError(
        409,
        "Testimonial submissions are currently disabled.",
      );
    const d = z
      .object({
        orderId: z.string().optional(),
        bookingId: z.string().optional(),
        content,
      })
      .strict()
      .refine((d) => !!d.orderId !== !!d.bookingId)
      .parse(input);
    if (
      d.content.body.length < p.minimumLength ||
      d.content.body.length > p.maximumLength
    )
      throw new AppError(
        400,
        "Feedback length is outside the configured limits.",
      );
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
    const count = await one(
      tx,
      "SELECT count(*) AS n FROM customer_testimonials WHERE customer_id=$1 AND created_at>now()-interval '24 hours'",
      [user.id],
    );
    if (Number(count?.n) >= p.dailyLimit)
      throw new AppError(
        429,
        "Daily testimonial limit reached. Please try tomorrow.",
      );
    const transaction = await eligible(tx, user.id, d.orderId, d.bookingId);
    if (
      transaction.street?.length >= 8 &&
      d.content.body.toLowerCase().includes(transaction.street.toLowerCase())
    )
      throw new AppError(
        400,
        "Remove your delivery address from public feedback.",
      );
    if (
      await one(
        tx,
        "SELECT id FROM customer_testimonials WHERE order_id=$1 OR booking_id=$2",
        [d.orderId ?? null, d.bookingId ?? null],
      )
    )
      throw new AppError(409, "Feedback already exists for this transaction.");
    const row = { id: id(), status: "DRAFT", revision: 1, current_version: 1 };
    await tx.query(
      "INSERT INTO customer_testimonials(id,customer_id,order_id,booking_id) VALUES($1,$2,$3,$4)",
      [row.id, user.id, d.orderId ?? null, d.bookingId ?? null],
    );
    await version(tx, row, d.content, user);
    await record(
      tx,
      user,
      row,
      "created",
      null,
      "Customer saved original feedback.",
    );
    return row;
  }
  const d = z
    .object({
      id: z.string(),
      revision: z.number().int().positive(),
      status: z.string().optional(),
      reason: z.string().trim().min(5).max(1000).optional(),
      content: content.optional(),
    })
    .strict()
    .parse(input);
  const row = await one(
    tx,
    "SELECT * FROM customer_testimonials WHERE id=$1 FOR UPDATE",
    [d.id],
  );
  if (!row) throw new AppError(404, "Testimonial not found.");
  const own =
    row.customer_id === user.id &&
    ["customer", "commercial"].includes(user.role);
  if (!own) allow(user, ["owner"]);
  const withdrawal =
    own && action === "testimonial.transition" && d.status === "WITHDRAWN";
  if (withdrawal && row.status === "WITHDRAWN") return row;
  // Revoking consent must not lose to an older UI revision or concurrent moderation.
  if (row.revision !== d.revision && !withdrawal)
    throw new AppError(
      409,
      "This testimonial changed. Refresh before continuing.",
    );
  const from = row.status;
  if (action === "testimonial.edit") {
    if (!own)
      throw new AppError(403, "Only the customer may edit original feedback.");
    if (["WITHDRAWN", "REJECTED"].includes(from))
      throw new AppError(409, "This submission is closed.");
    if (!d.content) throw new AppError(400, "Feedback content is required.");
    if (
      d.content.body.length < p.minimumLength ||
      d.content.body.length > p.maximumLength
    )
      throw new AppError(
        400,
        "Feedback length is outside the configured limits.",
      );
    const transaction = await eligible(
      tx,
      row.customer_id,
      row.order_id,
      row.booking_id,
    );
    if (
      transaction.street?.length >= 8 &&
      d.content.body.toLowerCase().includes(transaction.street.toLowerCase())
    )
      throw new AppError(
        400,
        "Remove your delivery address from public feedback.",
      );
    row.current_version++;
    row.status = "DRAFT";
    row.reviewed_version = null;
    await version(tx, row, d.content, user);
  } else if (action === "testimonial.transition") {
    if (!d.status || !transitions[from]?.includes(d.status))
      throw new AppError(409, "This status transition is not permitted.");
    if (own) {
      if (!["PENDING_REVIEW", "WITHDRAWN"].includes(d.status))
        throw new AppError(
          403,
          "Only an authorised moderator may approve or publish.",
        );
    } else {
      if (["PENDING_REVIEW", "WITHDRAWN"].includes(d.status))
        throw new AppError(
          403,
          "Only the customer may submit or withdraw consent.",
        );
      recentVerification(user);
      if (!d.reason)
        throw new AppError(400, "A moderation reason is required.");
    }
    const v = await one(
      tx,
      "SELECT * FROM testimonial_versions WHERE testimonial_id=$1 AND version=$2",
      [row.id, row.current_version],
    );
    if (["PENDING_REVIEW", "APPROVED", "PUBLISHED"].includes(d.status)) {
      if (!v?.consent)
        throw new AppError(409, "Explicit publication consent is required.");
      if (!p.enabled) throw new AppError(409, "Testimonials are disabled.");
      await eligible(tx, row.customer_id, row.order_id, row.booking_id);
    }
    if (d.status === "APPROVED") row.reviewed_version = row.current_version;
    if (
      d.status === "PUBLISHED" &&
      row.reviewed_version !== row.current_version
    )
      throw new AppError(409, "The current feedback version must be approved.");
    row.status = d.status;
  } else throw new AppError(404, "Unknown testimonial action.");
  row.revision++;
  await tx.query(
    "UPDATE customer_testimonials SET status=$2,revision=$3,current_version=$4,reviewed_version=$5,updated_at=now(),published_at=CASE WHEN $2='PUBLISHED' THEN now() ELSE published_at END WHERE id=$1",
    [
      row.id,
      row.status,
      row.revision,
      row.current_version,
      row.reviewed_version,
    ],
  );
  await record(
    tx,
    user,
    row,
    action.split(".")[1],
    from,
    d.reason ?? "Customer changed publication preference.",
  );
  if (p.notificationsEnabled)
    await notify(
      tx,
      row.customer_id,
      "Testimonial updated",
      "Your testimonial status is now " +
        row.status.toLowerCase().replaceAll("_", " ") +
        ".",
      row.id,
    );
  if (p.notificationsEnabled && row.status === "PENDING_REVIEW") {
    const reviewers = (
      await tx.query(
        "SELECT id FROM users WHERE role='owner' AND active=true ORDER BY id LIMIT 100",
      )
    ).rows;
    for (const reviewer of reviewers)
      await notify(
        tx,
        reviewer.id,
        "Testimonial awaiting review",
        "A customer has submitted feedback for independent publication review.",
        row.id,
      );
  }
  return row;
}
// Reuse the existing validated image store; publication never exposes old versions.
export async function attachTestimonialPhoto(
  tx: SQL,
  user: Actor,
  testimonialId: string,
  imageId: string,
) {
  const row = await one(
    tx,
    "SELECT * FROM customer_testimonials WHERE id=$1 FOR UPDATE",
    [testimonialId],
  );
  const image = await one(
    tx,
    "SELECT id FROM media_assets WHERE id=$1 AND testimonial_id=$2 AND owner_id=$3 AND archived=false",
    [imageId, testimonialId, user.id],
  );
  if (!row || row.customer_id !== user.id || row.status !== "DRAFT" || !image)
    throw new AppError(403, "Photo cannot be attached to this testimonial.");
  const p = await testimonialPolicyValue(tx);
  if (!p.enabled || !p.imagesEnabled)
    throw new AppError(409, "Testimonial images are disabled.");
  const old = await one(
    tx,
    "SELECT * FROM testimonial_versions WHERE testimonial_id=$1 AND version=$2",
    [row.id, row.current_version],
  );
  if (!old?.consent)
    throw new AppError(409, "Publication consent is required.");
  await tx.query(
    "INSERT INTO testimonial_versions(testimonial_id,version,rating,body,display_name,name_style,public_location,consent,consent_at,image_id,photo_consent) SELECT testimonial_id,version+1,rating,body,display_name,name_style,public_location,consent,consent_at,$3,true FROM testimonial_versions WHERE testimonial_id=$1 AND version=$2",
    [row.id, row.current_version, imageId],
  );
  row.current_version++;
  row.revision++;
  await tx.query(
    "UPDATE customer_testimonials SET current_version=$2,revision=$3,reviewed_version=NULL,updated_at=now() WHERE id=$1",
    [row.id, row.current_version, row.revision],
  );
  await record(
    tx,
    user,
    row,
    "photo_attached",
    "DRAFT",
    "Customer explicitly consented to publication of this photo.",
  );
}
export async function testimonialPhotoPublished(tx: SQL, imageId: string) {
  const p = await testimonialPolicyValue(tx);
  if (!p.enabled || !p.imagesEnabled) return false;
  return !!(await one(
    tx,
    "SELECT t.id FROM customer_testimonials t JOIN testimonial_versions v ON v.testimonial_id=t.id AND v.version=t.current_version JOIN media_assets m ON m.id=v.image_id WHERE v.image_id=$1 AND m.archived=false AND t.status='PUBLISHED' AND t.reviewed_version=t.current_version AND v.consent=true AND v.photo_consent=true",
    [imageId],
  ));
}
