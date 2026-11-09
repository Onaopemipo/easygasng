import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL;
  if (!base?.startsWith("https://") || process.env.EASYGAS_INDEXABLE !== "true")
    return [];
  return [
    "/",
    "/gas-order",
    "/products",
    "/services",
    "/how-it-works",
    "/about",
    "/help",
    "/delivery",
    "/contact",
    "/terms",
    "/privacy",
  ].map((path) => ({
    url: new URL(path, base).href,
    changeFrequency: "weekly" as const,
  }));
}
