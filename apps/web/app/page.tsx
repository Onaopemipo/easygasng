import Site from "@/components/site";
import { dispatch } from "@/lib/service";
import type { Metadata } from "next";
export const dynamic = "force-dynamic";
const publicUrl = process.env.APP_URL?.startsWith("https://")
  ? process.env.APP_URL
  : undefined;
export const metadata: Metadata = {
  title: "Cooking gas delivered to your door | EasyGas Energy Solutions",
  description:
    "Order cooking gas for home delivery, explore cylinders and book professional cooking equipment services with EasyGas in supported Lagos locations.",
  ...(publicUrl ? { alternates: { canonical: publicUrl } } : {}),
  openGraph: {
    title: "EasyGas | More Cooking. Less Worry.",
    description:
      "Cooking gas delivered to your door in supported Lagos locations.",
    type: "website",
    ...(publicUrl
      ? {
          url: publicUrl,
          images: [
            {
              url: new URL("/assets/easygas-cooking-hero-v1.webp", publicUrl)
                .href,
              width: 1600,
              height: 900,
              alt: "Illustrative cooking scene",
            },
          ],
        }
      : {}),
  },
  robots: {
    index: process.env.EASYGAS_INDEXABLE === "true",
    follow: process.env.EASYGAS_INDEXABLE === "true",
  },
};
export default async function Page() {
  try {
    const [catalogue, testimonials] = await Promise.all([
      dispatch("catalogue", null, { view: "homepage" }),
      dispatch("testimonials.public", null),
    ]);
    const initial = JSON.parse(
      JSON.stringify({ ...catalogue, testimonials }, (_key, value) =>
        typeof value === "bigint" ? String(value) : value,
      ),
    );
    const c = initial.website;
    const business = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "EasyGas Energy Solutions",
      ...(publicUrl ? { url: publicUrl } : {}),
      ...(c
        ? {
            telephone: [c.phonePrimary, c.phoneSecondary],
            address: c.address,
            sameAs: [c.instagram, c.linktree],
            ...(c.email ? { email: c.email } : {}),
          }
        : {}),
    };
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(business).replace(/</g, "\\u003c"),
          }}
        />
        <Site initialCatalogue={initial} />
      </>
    );
  } catch {
    // The client renders the existing retry/error state if public data is unavailable.
    return <Site />;
  }
}
