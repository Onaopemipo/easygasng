"use client";
import { useState, type FormEvent } from "react";
import { Notice } from "./ui";
export function ImageUpload({
  testimonialId,
  productId,
  bookingId,
  serviceId,
  branchId,
  done,
}: {
  testimonialId?: string;
  productId?: string;
  bookingId?: string;
  serviceId?: string;
  branchId?: string;
  done: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    if (testimonialId) fd.set("testimonialId", testimonialId);
    if (productId) fd.set("productId", productId);
    if (bookingId) fd.set("bookingId", bookingId);
    if (serviceId) {
      fd.set("serviceId", serviceId);
      fd.set("branchId", branchId ?? "lagos");
    }
    try {
      const r = await fetch("/api/media", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      done();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="surface workflow-form" onSubmit={upload}>
      <h3>
        {testimonialId
          ? "Add your testimonial photo"
          : productId
            ? "Upload a product photograph"
            : serviceId
              ? "Upload a service image"
              : "Attach a service photograph"}
      </h3>
      <p>
        PNG, JPEG or WebP, up to 8 MB. Images are validated, optimised and
        stripped of embedded metadata. Booking evidence is private and locked
        when the report is submitted.
      </p>
      {bookingId && (
        <label className="testimonial-consent">
          <input type="checkbox" name="photoConsent" required />I have consent
          to attach this private service evidence. Avoid faces and unrelated
          personal details.
        </label>
      )}
      {testimonialId && (
        <label className="testimonial-consent">
          <input type="checkbox" name="photoConsent" required />I consent to
          this photo being published alongside my testimonial after moderation.
          I have permission from everyone pictured.
        </label>
      )}
      <label>
        Image
        <input
          type="file"
          name="image"
          accept="image/png,image/jpeg,image/webp"
          required
        />
      </label>
      <label>
        Description
        <input name="alt" required minLength={3} maxLength={250} />
      </label>
      {error && <Notice type="error" message={error} />}
      <button className="button secondary" disabled={busy}>
        {busy ? "Uploading…" : "Upload image"}
      </button>
    </form>
  );
}
