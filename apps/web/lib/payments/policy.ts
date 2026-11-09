import { z } from "zod";
import { paymentFeePolicy } from "../../../../packages/business-rules/src/payment-fees";
export const gatewayPolicy = z
  .object({
    enabled: z.boolean(),
    environment: z.literal("test"),
    channels: z.array(z.enum(["card", "bank", "ussd", "bank_transfer"])).max(4),
    fee: paymentFeePolicy.nullable(),
    providerAutomaticFees: z.enum(["unknown", "off"]),
    passThroughApproved: z.boolean(),
    merchantApprovalReference: z.string().max(200),
    quoteLifetimeSeconds: z.number().int().min(60).max(1800),
    walletFunding: z.boolean(),
    walletMinimumKobo: z.number().int().positive().max(100000000),
    walletMaximumKobo: z.number().int().positive().max(100000000),
    partialInvoices: z.boolean(),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.walletMinimumKobo > p.walletMaximumKobo)
      ctx.addIssue({
        code: "custom",
        message: "Wallet minimum exceeds maximum.",
      });
    if (
      p.enabled &&
      (!p.fee ||
        !p.channels.length ||
        p.providerAutomaticFees !== "off" ||
        !p.merchantApprovalReference.trim())
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Approved fee policy, channels and provider fee setting are required.",
      });
    if (p.enabled && p.fee?.bearer === "customer" && !p.passThroughApproved)
      ctx.addIssue({
        code: "custom",
        message: "Customer fee pass-through approval is required.",
      });
  });
export type GatewayPolicy = z.infer<typeof gatewayPolicy>;
