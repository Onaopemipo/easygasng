import { z } from "zod";
const plain = z
  .string()
  .trim()
  .min(3)
  .max(150)
  .refine((s) => !/[<>]/.test(s), "Use plain text only.");
const phone = z.string().regex(/^\+234[789][01]\d{8}$/);
const social = (host: string) =>
  z
    .string()
    .url()
    .refine((s) => {
      const u = new URL(s);
      return (
        u.protocol === "https:" &&
        u.hostname === host &&
        !u.username &&
        !u.password
      );
    }, "Use the official HTTPS social profile URL.");
export const websiteContent = z
  .object({
    heroHeading: plain,
    heroEmphasis: plain,
    heroSubheading: plain,
    serviceHeading: plain,
    heroImage: z.enum([
      "/assets/easygas-cooking-hero-v1.webp",
      "/assets/delivery-illustration.png",
    ]),
    phonePrimary: phone,
    phoneSecondary: phone,
    address: plain,
    email: z.union([z.literal(""), z.string().email().max(150)]),
    instagram: social("www.instagram.com"),
    linktree: social("linktr.ee"),
  })
  .strict();
