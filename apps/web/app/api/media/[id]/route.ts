import { photoOrder } from "../../../../lib/delivery-photos";
import { testimonialPhotoPublished } from "../../../../lib/testimonials";
import { NextRequest, NextResponse } from "next/server";
import { getDb, one } from "../../../../lib/db";
import { actor, AppError } from "../../../../lib/auth";
import { authorizeMedia, imageBytes } from "../../../../lib/media";
export const runtime = "nodejs";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!/^[a-f0-9-]{36}$/.test(id))
      throw new AppError(404, "Image not found.");
    const db = await getDb();
    const photo = await one(
      db,
      "SELECT * FROM delivery_photos WHERE id=$1 AND retain_until>now()",
      [id],
    );
    if (photo) {
      const token =
        req.headers.get("authorization")?.replace(/^Bearer /, "") ??
        req.cookies.get("easygas_session")?.value ??
        null;
      const u = await actor(db, token);
      await photoOrder(db, u, photo.order_id);
      return new NextResponse(new Uint8Array(imageBytes(photo)), {
        headers: {
          "Content-Type": "image/webp",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, no-store",
          "Content-Security-Policy": "default-src 'none'; sandbox",
        },
      });
    }
    const m = await one(
      db,
      "SELECT * FROM media_assets WHERE id=$1 AND archived=false",
      [id],
    );
    if (!m) throw new AppError(404, "Image not found.");
    if (
      m.booking_id &&
      m.service_retain_until &&
      new Date(m.service_retain_until).getTime() <= Date.now()
    )
      throw new AppError(404, "Image not found.");
    const productPublished =
      m.product_id &&
      (await one(
        db,
        "SELECT p.id FROM products p JOIN inventory i ON i.product_id=p.id JOIN product_categories c ON c.name=p.category WHERE p.id=$1 AND p.archived=false AND i.published=true AND c.active=true",
        [m.product_id],
      ));
    const published =
      (m.testimonial_id && (await testimonialPhotoPublished(db, m.id))) ||
      productPublished ||
      (m.service_id &&
        (await one(
          db,
          "SELECT id FROM service_catalogue WHERE id=$1 AND branch_id=$2 AND (config->>'active')::boolean=true",
          [m.service_id, m.branch_id],
        )));
    if (!published) {
      const token =
        req.headers.get("authorization")?.replace(/^Bearer /, "") ??
        req.cookies.get("easygas_session")?.value ??
        null;
      await authorizeMedia(db, await actor(db, token), {
        testimonialId: m.testimonial_id ?? undefined,
        productId: m.product_id ?? undefined,
        bookingId: m.booking_id ?? undefined,
        serviceId: m.service_id ?? undefined,
        branchId: m.branch_id ?? undefined,
      });
    }
    return new NextResponse(new Uint8Array(imageBytes(m)), {
      headers: {
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": m.testimonial_id
          ? "private, no-store, max-age=0"
          : published
            ? "public, max-age=300"
            : "private, no-store",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Image not available." },
      { status: e instanceof AppError ? e.status : 500 },
    );
  }
}
