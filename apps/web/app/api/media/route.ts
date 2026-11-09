import { attachServicePhoto } from "../../../lib/service-photos";
import { attachDeliveryPhoto, photoOrder } from "../../../lib/delivery-photos";
import { assertRequestOrigin } from "../../../lib/request-origin";
import {
  attachTestimonialPhoto,
  testimonialPolicyValue,
} from "../../../lib/testimonials";
import { NextRequest, NextResponse } from "next/server";
import { getDb, one } from "../../../lib/db";
import { actor, id, AppError } from "../../../lib/auth";
import { authorizeMedia, prepareImage } from "../../../lib/media";
import { audit } from "../../../lib/governance";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    assertRequestOrigin(req);
    if (!req.headers.get("content-type")?.startsWith("multipart/form-data;"))
      throw new AppError(415, "Send an image upload.");
    const db = await getDb(),
      token =
        req.headers.get("authorization")?.replace(/^Bearer /, "") ??
        req.cookies.get("easygas_session")?.value ??
        null;
    await actor(db, token);
    const reader = req.body?.getReader();
    if (!reader) throw new AppError(400, "Choose an image.");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 9 * 1024 * 1024) {
        await reader.cancel();
        throw new AppError(
          413,
          "Image upload exceeds 8 MB plus form metadata.",
        );
      }
      chunks.push(value);
    }
    const form = await new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": req.headers.get("content-type")! },
      body: Buffer.concat(chunks),
    }).formData();
    const file = form.get("image"),
      orderId = String(form.get("orderId") ?? ""),
      testimonialId = String(form.get("testimonialId") ?? ""),
      productId = String(form.get("productId") ?? ""),
      bookingId = String(form.get("bookingId") ?? ""),
      serviceId = String(form.get("serviceId") ?? ""),
      branchId = String(form.get("branchId") ?? ""),
      alt = String(form.get("alt") ?? "").trim();
    if (
      !(file instanceof File) ||
      Number(Boolean(orderId)) +
        Number(Boolean(testimonialId)) +
        Number(Boolean(productId)) +
        Number(Boolean(bookingId)) +
        Number(Boolean(serviceId)) !==
        1 ||
      alt.length < 3 ||
      alt.length > 250
    )
      throw new AppError(
        400,
        "Choose one product or booking, an image and a descriptive label.",
      );
    if (orderId) {
      await photoOrder(db, await actor(db, token), orderId, true);
      const data = await prepareImage(new Uint8Array(await file.arrayBuffer()));
      const result = await db.transaction(async (tx) =>
        attachDeliveryPhoto(
          tx,
          await actor(tx, token),
          orderId,
          data,
          alt,
          form.get("photoConsent") === "on",
          form.get("capturedAt") ? String(form.get("capturedAt")) : undefined,
        ),
      );
      return NextResponse.json(result, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (bookingId) {
      const result = await db.transaction(async (tx) =>
        attachServicePhoto(
          tx,
          await actor(tx, token),
          bookingId,
          new Uint8Array(await file.arrayBuffer()),
          alt,
          form.get("photoConsent") === "on",
          form.has("bookingVersion")
            ? Number(form.get("bookingVersion"))
            : undefined,
        ),
      );
      return NextResponse.json(result);
    }
    await authorizeMedia(
      db,
      await actor(db, token),
      {
        testimonialId: testimonialId || undefined,
        productId: productId || undefined,
        bookingId: bookingId || undefined,
        serviceId: serviceId || undefined,
        branchId: branchId || undefined,
      },
      true,
    );
    if (testimonialId && form.get("photoConsent") !== "on")
      throw new AppError(
        400,
        "Explicit photo publication consent is required.",
      );
    const photoPolicy = testimonialId ? await testimonialPolicyValue(db) : null;
    const data = await prepareImage(
        new Uint8Array(await file.arrayBuffer()),
        photoPolicy
          ? {
              maximumMb: photoPolicy.photoMaxMb,
              formats: photoPolicy.photoFormats,
            }
          : undefined,
      ),
      mid = id();
    await db.transaction(async (tx) => {
      const user = await actor(tx, token);
      await authorizeMedia(
        tx,
        user,
        {
          testimonialId: testimonialId || undefined,
          productId: productId || undefined,
          bookingId: bookingId || undefined,
          serviceId: serviceId || undefined,
          branchId: branchId || undefined,
        },
        true,
      );
      const count = Number(
        (await one(
          tx,
          "SELECT count(*) AS n FROM media_assets WHERE (product_id=$1 OR booking_id=$2 OR (service_id=$3 AND branch_id=$4) OR testimonial_id=$5) AND archived=false",
          [
            productId || null,
            bookingId || null,
            serviceId || null,
            branchId || null,
            testimonialId || null,
          ],
        ))!.n,
      );
      if (count >= 12)
        throw new AppError(409, "At most twelve images may be attached.");
      await tx.query(
        "INSERT INTO media_assets(id,owner_id,product_id,booking_id,mime,data,alt,position,service_id,branch_id,testimonial_id) VALUES ($1,$2,$3,$4,'image/webp',$5,$6,$7,$8,$9,$10)",
        [
          mid,
          user.id,
          productId || null,
          bookingId || null,
          data,
          alt,
          count,
          serviceId || null,
          branchId || null,
          testimonialId || null,
        ],
      );
      if (testimonialId)
        await attachTestimonialPhoto(tx, user, testimonialId, mid);
      await audit(tx, user, "media.uploaded", mid);
    });
    return NextResponse.json(
      { id: mid, url: "/api/media/" + mid },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    if (e instanceof AppError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json(
      { error: "The image could not be uploaded." },
      { status: 400 },
    );
  }
}
