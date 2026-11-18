import { z } from "zod";
import { allow, AppError, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { settingValue } from "./operations";
import { paystackAvailability } from "./payments/runtime";
import { gatewayPolicy } from "./payments/policy";
export async function checkoutPaymentOptions(
  tx: SQL,
  user: Actor,
  input: unknown,
) {
  allow(user, ["customer", "commercial", "owner", "manager"]);
  const { branchId } = z
    .object({ branchId: z.string().min(1).max(100).default("lagos") })
    .strict()
    .parse(input);
  const branch = await one(
    tx,
    "SELECT id FROM branches WHERE id=$1 AND active=true AND EXISTS(SELECT 1 FROM delivery_locations l WHERE l.branch_id=branches.id AND l.active=true AND l.visible=true AND l.archived=false)",
    [branchId],
  );
  if (!branch) throw new AppError(404, "This delivery branch is unavailable.");
  const policy = gatewayPolicy.safeParse(
    await settingValue(tx, "payment.gateway", branchId),
  );
  const gateway = policy.success
    ? await paystackAvailability(tx, branchId)
    : null;
  const balance = Number(
    (await one(
      tx,
      "SELECT COALESCE(sum(amount_kobo),0) AS n FROM wallet_entries WHERE customer_id=$1",
      [user.id],
    ))!.n,
  );
  if (!Number.isSafeInteger(balance))
    throw new AppError(
      503,
      "Your wallet balance could not be loaded. Please retry.",
    );
  return {
    branchId,
    methods: [
      ...(gateway?.available && gateway.channels.includes("card")
        ? ["card"]
        : []),
      ...((await settingValue(tx, "payment.cod", branchId)) === true
        ? ["cash_on_delivery"]
        : []),
      ...((await settingValue(tx, "wallet.enabled", branchId)) === true
        ? ["wallet"]
        : []),
    ],
    balanceKobo: balance,
    environment: "test" as const,
  };
}
