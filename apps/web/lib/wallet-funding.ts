import { z } from "zod";
import { one, type SQL } from "./db";
import { allow, AppError, id, type Actor } from "./auth";
import { audit, notify } from "./governance";
import { settingValue } from "./operations";

const bankSchema = z
  .object({
    bankName: z.string().trim().min(2).max(100),
    accountName: z.string().trim().min(2).max(150),
    accountNumber: z.string().regex(/^\d{10}$/),
  })
  .strict();
// Deployment configuration is branch-keyed. Never invent destination details or expose secrets.
export function walletBank(branch: string) {
  try {
    return bankSchema.parse(
      JSON.parse(process.env.EASYGAS_WALLET_BANK_ACCOUNTS ?? "{}")[branch],
    );
  } catch {
    return null;
  }
}
export async function walletFundingAction(
  tx: SQL,
  action: string,
  user: Actor,
  input: unknown,
) {
  if (!["wallet.funding", "wallet.transfer.request"].includes(action))
    return undefined;
  allow(user, ["customer", "commercial"]);
  const branch = user.branch_id;
  if (!branch) throw new AppError(409, "A customer branch is required.");
  const bank = walletBank(branch);
  const enabled = Boolean(await settingValue(tx, "wallet.enabled", branch));
  const maximumKobo = Number(
    (await settingValue(tx, "wallet.maximum", branch)) ?? 100000000,
  );
  if (action === "wallet.funding")
    return {
      bank: enabled ? bank : null,
      enabled,
      maximumKobo,
      requests: (
        await tx.query(
          "SELECT id,amount_kobo,status,receipt_reference,created_at,decided_at FROM credit_requests WHERE customer_id=$1 AND kind='bank_transfer' ORDER BY created_at DESC LIMIT 100",
          [user.id],
        )
      ).rows,
    };
  if (
    !enabled ||
    !bank ||
    !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
      branch,
    ]))
  )
    throw new AppError(
      409,
      "Bank-transfer wallet funding is not configured for your branch.",
    );
  const d = z
    .object({
      amountKobo: z.number().int().positive().max(100000000),
      receiptReference: z
        .string()
        .trim()
        .min(5)
        .max(80)
        .regex(/^[A-Za-z0-9-]+$/)
        .transform((v) => v.toUpperCase()),
      senderName: z.string().trim().min(2).max(150),
      transferDate: z.iso.date(),
    })
    .strict()
    .parse(input);
  if (d.transferDate > new Date().toISOString().slice(0, 10))
    throw new AppError(400, "Transfer date cannot be in the future.");
  if (d.amountKobo > maximumKobo)
    throw new AppError(
      409,
      "Transfer exceeds the configured wallet funding limit.",
    );
  // Serializes same-reference claims; the existing unique receipt constraint is a second guard.
  await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
    "wallet-transfer:" + d.receiptReference,
  ]);
  const reference = "BANK:" + d.receiptReference;
  const prior = await one(
    tx,
    "SELECT * FROM credit_requests WHERE receipt_reference=$1",
    [reference],
  );
  if (prior) {
    if (
      prior.customer_id === user.id &&
      Number(prior.amount_kobo) === d.amountKobo &&
      prior.funding_details?.senderName === d.senderName &&
      prior.funding_details?.transferDate === d.transferDate
    )
      return { id: prior.id, status: prior.status };
    throw new AppError(
      409,
      "Transfer reference already submitted with different details.",
    );
  }
  const requestId = id();
  await tx.query(
    "INSERT INTO credit_requests(id,branch_id,customer_id,amount_kobo,kind,requested_by,reason,receipt_reference,funding_details) VALUES($1,$2,$3,$4,'bank_transfer',$3,$5,$6,$7)",
    [
      requestId,
      branch,
      user.id,
      d.amountKobo,
      "Customer-reported bank transfer; finance must independently confirm receipt.",
      reference,
      JSON.stringify({
        ...bank,
        senderName: d.senderName,
        transferDate: d.transferDate,
      }),
    ],
  );
  await audit(tx, user, "wallet.transfer_requested", requestId);
  for (const u of (
    await tx.query(
      "SELECT id FROM users WHERE active=true AND (role='owner' OR (role='finance' AND branch_id=$1))",
      [branch],
    )
  ).rows)
    await notify(
      tx,
      u.id,
      "Wallet transfer requires verification",
      "Confirm the actual bank receipt before approving this customer wallet credit.",
      requestId,
    );
  return { id: requestId, status: "pending" };
}
