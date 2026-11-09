import { AppError } from "../auth";
import { appOrigin } from "../request-origin";
import { PaystackProvider, type WebhookKeys } from "./paystack-provider";
export function paystackRuntime(env: NodeJS.ProcessEnv = process.env) {
  if (
    env.EASYGAS_PAYSTACK_ENABLED !== "true" ||
    env.EASYGAS_PAYSTACK_MODE !== "test" ||
    env.EASYGAS_PAYMENT_DATA_CLASS !== "synthetic"
  )
    throw new AppError(
      503,
      "Paystack sandbox is not configured for this isolated synthetic environment.",
    );
  const secret = env.PAYSTACK_TEST_SECRET_KEY ?? "";
  if (!/^sk_test_[A-Za-z0-9]+$/.test(secret))
    throw new AppError(
      503,
      "A server-only Paystack test key is required. Live credentials are unsupported.",
    );
  const origin =
    env === process.env
      ? appOrigin()
      : new URL(env.APP_URL ?? "http://127.0.0.1:3003").origin;
  return {
    provider: new PaystackProvider(secret, origin),
    callbackOrigin: origin,
  };
}
export function paystackWebhookKeys(
  env: NodeJS.ProcessEnv = process.env,
): WebhookKeys {
  paystackRuntime(env);
  if (env.PAYSTACK_WEBHOOK_SIGNATURE_MODE === "timestamped") {
    const secrets = (env.PAYSTACK_TEST_WEBHOOK_SECRETS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!secrets.length || secrets.some((s) => !/^whsec_[A-Za-z0-9]+$/.test(s)))
      throw new AppError(503, "Configure test webhook signing secrets.");
    return { mode: "timestamped", secrets };
  }
  if (env.PAYSTACK_WEBHOOK_SIGNATURE_MODE === "legacy")
    return { mode: "legacy", secret: env.PAYSTACK_TEST_SECRET_KEY! };
  throw new AppError(503, "Explicit webhook signature mode is required.");
}
export async function paystackAvailability(
  tx: import("../db").SQL,
  branch = "lagos",
) {
  const { one } = await import("../db");
  const row = await one(
    tx,
    "SELECT value FROM settings WHERE key='payment.gateway' AND scope=$1",
    [branch],
  );
  const p = row?.value;
  let configured = false;
  try {
    paystackRuntime();
    configured = true;
  } catch {}
  return {
    available: Boolean(configured && p?.enabled),
    walletFunding: Boolean(configured && p?.enabled && p?.walletFunding),
    channels: p?.channels ?? [],
    environment: "test",
    walletMinimumKobo: p?.walletMinimumKobo ?? null,
    walletMaximumKobo: p?.walletMaximumKobo ?? null,
  };
}
