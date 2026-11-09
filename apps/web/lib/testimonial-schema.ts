import { z } from "zod";
export const testimonialPolicy = z
  .object({
    enabled: z.boolean(),
    minimumLength: z.number().int().min(20).max(500),
    maximumLength: z.number().int().min(100).max(2000),
    publishedLimit: z.number().int().min(1).max(30),
    moderationRequired: z.literal(true),
    imagesEnabled: z.boolean(),
    dailyLimit: z.number().int().min(1).max(10),
    notificationsEnabled: z.boolean().default(true),
    retentionDays: z.number().int().min(90).max(3650).default(730),
    photoMaxMb: z.number().int().min(1).max(8).default(8),
    photoFormats: z
      .array(z.enum(["image/jpeg", "image/png", "image/webp"]))
      .min(1)
      .max(3)
      .default(["image/jpeg", "image/png", "image/webp"]),
  })
  .strict()
  .refine((p) => p.maximumLength >= p.minimumLength);
