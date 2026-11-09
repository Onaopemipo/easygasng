import type { NextConfig } from "next";
import path from "node:path";
const config: NextConfig = {
  distDir: process.env.EASYGAS_PREVIEW === "true" ? ".next-qa" : ".next",
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  poweredByHeader: false,
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  outputFileTracingIncludes: {
    "/api/payments/paystack/*": ["./assets/fonts/*.ttf", "./public/assets/easygas-logo-hd.png"],
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
