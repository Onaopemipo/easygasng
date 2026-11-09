import sharp from "sharp";
import { one, type SQL, type Row } from "./db";
import { allow, AppError, type Actor } from "./auth";
export async function authorizeMedia(
  tx: SQL,
  user: Actor,
  link: {
    testimonialId?: string;
    productId?: string;
    bookingId?: string;
    serviceId?: string;
    branchId?: string;
  },
  write = false,
) {
  if (link.testimonialId) {
    const row = await one(
      tx,
      "SELECT * FROM customer_testimonials WHERE id=$1" +
        (write ? " FOR UPDATE" : ""),
      [link.testimonialId],
    );
    if (!row) throw new AppError(404, "Testimonial not found.");
    if (row.customer_id !== user.id) {
      if (write)
        throw new AppError(
          403,
          "Only the customer may upload a testimonial photo.",
        );
      allow(user, ["owner"]);
    }
    if (write) {
      if (row.status !== "DRAFT")
        throw new AppError(
          409,
          "Edit your testimonial back to a draft before uploading a photo.",
        );
      const policy = await one(
        tx,
        "SELECT value FROM settings WHERE key='testimonials.policy' AND scope='lagos'",
      );
      const v = await one(
        tx,
        "SELECT consent FROM testimonial_versions WHERE testimonial_id=$1 AND version=$2",
        [row.id, row.current_version],
      );
      if (!policy?.value?.enabled || !policy.value.imagesEnabled || !v?.consent)
        throw new AppError(
          409,
          "Photo uploads require enabled images and explicit publication consent.",
        );
    }
    return;
  }
  if (link.productId) {
    allow(user, ["owner"]);
    if (
      !(await one(tx, "SELECT id FROM products WHERE id=$1", [link.productId]))
    )
      throw new AppError(404, "Product not found.");
    return;
  }
  if (link.serviceId) {
    allow(
      user,
      write
        ? ["owner", "service_manager"]
        : ["owner", "service_manager", "safety_officer"],
      link.branchId,
    );
    if (
      !(await one(
        tx,
        "SELECT id FROM service_catalogue WHERE id=$1 AND branch_id=$2",
        [link.serviceId, link.branchId],
      ))
    )
      throw new AppError(404, "Service not found.");
    return;
  }
  const b = await one(tx, "SELECT * FROM service_bookings WHERE id=$1", [
    link.bookingId,
  ]);
  if (!b) throw new AppError(404, "Booking not found.");
  if (["customer", "commercial"].includes(user.role)) {
    if (b.customer_id !== user.id)
      throw new AppError(404, "Booking not found.");
  } else if (user.role === "technician") {
    allow(user, ["technician"], b.branch_id);
    if (
      !(await one(
        tx,
        "SELECT q.id FROM technician_qualifications q JOIN users v ON v.id=q.verified_by JOIN branches br ON br.id=$3 AND br.active=true WHERE q.user_id=$1 AND q.code=$2 AND q.expires_at>now() AND v.active=true AND v.role IN ('owner','safety_officer') AND (v.role='owner' OR v.branch_id=$3)",
        [user.id, b.snapshot.qualification, b.branch_id],
      ))
    )
      throw new AppError(
        403,
        "A current independent qualification is required for service evidence.",
      );
    if (b.technician_id !== user.id)
      throw new AppError(
        403,
        "Only the assigned technician may access these images.",
      );
  } else
    allow(user, ["owner", "service_manager", "safety_officer"], b.branch_id);
  if (
    write &&
    (await one(tx, "SELECT id FROM service_reports WHERE booking_id=$1", [
      b.id,
    ]))
  )
    throw new AppError(
      409,
      "Submitted report evidence cannot be silently changed.",
    );
}
export async function prepareImage(
  bytes: Uint8Array,
  options?: { maximumMb?: number; formats?: string[] },
) {
  const maximumMb = Math.min(8, options?.maximumMb ?? 8);
  if (bytes.length > maximumMb * 1024 * 1024 || bytes.length < 12)
    throw new AppError(
      400,
      `Upload an approved PNG, JPEG or WebP image under ${maximumMb} MB.`,
    );
  try {
    const image = sharp(bytes, { limitInputPixels: 40000000 }),
      metadata = await image.metadata();
    if (
      !["png", "jpeg", "webp"].includes(metadata.format ?? "") ||
      (options?.formats &&
        !options.formats.includes("image/" + metadata.format)) ||
      (metadata.pages && metadata.pages > 1)
    )
      throw new AppError(
        400,
        "Only still PNG, JPEG and WebP images are accepted.",
      );
    const data = await image
      .rotate()
      .resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 88 })
      .toBuffer();
    if (data.length > 4000000)
      throw new AppError(400, "The optimised image is too large.");
    return data;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(400, "The image could not be decoded safely.");
  }
}
export function imageBytes(row: Row) {
  return typeof row.data === "string"
    ? Buffer.from(row.data.replace(/^\\x/, ""), "hex")
    : Buffer.from(row.data);
}
