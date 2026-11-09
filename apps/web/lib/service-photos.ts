import { createHash } from "node:crypto";
import { z } from "zod";
import { authorizeMedia, prepareImage } from "./media";
import { AppError, id, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { audit } from "./governance";
export async function attachServicePhoto(
  tx: SQL,
  user: Actor,
  bookingId: string,
  raw: Uint8Array,
  alt: string,
  consent: boolean,
  expectedVersion?: number,
) {
  z.string().uuid().parse(bookingId);
  alt = z.string().trim().min(3).max(500).parse(alt);
  if (!consent)
    throw new AppError(
      400,
      "Explicit consent for private service evidence is required.",
    );
  // Lock the canonical job against completion/reassignment while evidence attaches.
  const b = await one(
    tx,
    "SELECT id,version,work_started_at FROM service_bookings WHERE id=$1 FOR UPDATE",
    [bookingId],
  );
  if (!b) throw new AppError(404, "Booking not found.");
  await authorizeMedia(tx, user, { bookingId }, true);
  if (
    expectedVersion !== undefined &&
    (!Number.isSafeInteger(expectedVersion) ||
      Number(b.version) !== expectedVersion)
  )
    throw new AppError(
      409,
      "Service booking changed. Review the retained photograph before uploading.",
    );
  const data = await prepareImage(raw);
  const days = z.coerce
    .number()
    .int()
    .min(1)
    .max(365)
    .parse(process.env.EASYGAS_PROOF_RETENTION_DAYS ?? 30);
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.EASYGAS_PROOF_RETENTION_DAYS
  )
    throw new AppError(
      503,
      "Approve proof-photo retention before production uploads.",
    );
  const hash = createHash("sha256").update(data).digest("hex");
  const prior = await one(
    tx,
    "SELECT id,archived,created_at,service_retain_until,octet_length(data) AS bytes FROM media_assets WHERE booking_id=$1 AND owner_id=$2 AND service_sha256=$3",
    [bookingId, user.id, hash],
  );
  if (prior) {
    if (
      prior.archived ||
      Number(prior.bytes) === 0 ||
      new Date(prior.service_retain_until).getTime() <= Date.now() ||
      (b.work_started_at &&
        new Date(prior.created_at).getTime() <
          new Date(b.work_started_at).getTime())
    )
      throw new AppError(
        409,
        "A new photograph is required for the current work visit; expired/historical evidence cannot be reused.",
      );
    return { id: prior.id, replayed: true };
  }
  if (
    Number(
      (await one(
        tx,
        "SELECT count(*)::int n FROM media_assets WHERE booking_id=$1 AND archived=false",
        [bookingId],
      ))!.n,
    ) >= 12
  )
    throw new AppError(
      409,
      "At most twelve service photographs may be retained.",
    );
  const mid = id();
  await tx.query(
    "INSERT INTO media_assets(id,owner_id,booking_id,mime,data,alt,service_photo_consent,service_retain_until,service_sha256) VALUES($1,$2,$3,'image/webp',$4,$5,true,now()+($6::int*interval '1 day'),$7)",
    [mid, user.id, bookingId, data, alt, days, hash],
  );
  await audit(tx, user, "service.photo.attached", mid, "success", {
    bookingId,
  });
  return { id: mid };
}
