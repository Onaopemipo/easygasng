import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL,
    indexable =
      base?.startsWith("https://") && process.env.EASYGAS_INDEXABLE === "true";
  return {
    rules: {
      userAgent: "*",
      ...(indexable
        ? {
            allow: "/",
            disallow: [
              "/admin",
              "/api",
              "/account",
              "/checkout",
              "/orders",
              "/wallet",
            ],
          }
        : { disallow: "/" }),
    },
    ...(indexable ? { sitemap: new URL("/sitemap.xml", base).href } : {}),
  };
}
