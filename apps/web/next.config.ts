import type { NextConfig } from "next";
import path from "node:path";
const config: NextConfig = {
  distDir: process.env.EASYGAS_ORDER_PREVIEW === "true" ? ".next-order-modal" : process.env.EASYGAS_GROWTH_PREVIEW === "true" ? ".next-growth-compact" : process.env.EASYGAS_COMPACT_PREVIEW === "true" ? ".next-admin-compact" : process.env.EASYGAS_PREVIEW === "true" ? ".next-qa" : ".next",
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  poweredByHeader: false,
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  outputFileTracingIncludes: {
    "/api/payments/paystack/*": ["./assets/fonts/*.ttf", "./public/assets/easygas-logo-hd.png"],
    "/api/receipts": ["./assets/fonts/*.ttf", "./public/assets/easygas-logo-hd.png"],
    "/api/invoices/*": [
      "./assets/fonts/*.ttf",
      "./public/assets/easygas-logo-hd.png",
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};
export default config;
