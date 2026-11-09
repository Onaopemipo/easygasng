import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
export class PaymentProviderError extends Error {
  constructor(
    public code: string,
    public retryable = false,
  ) {
    super("Payment provider is unavailable or returned an invalid response.");
  }
}
export type ProviderPayment = {
  reference: string;
  status: string;
  currency: string;
  amountKobo: number;
  environment: "test";
  providerId: string;
  feeKobo: number | null;
  email: string;
  attemptId: string;
};
export interface PaymentProvider {
  readonly environment: "test";
  initialize(input: {
    reference: string;
    email: string;
    amountKobo: number;
    callbackUrl: string;
    attemptId: string;
    channels: string[];
  }): Promise<{ checkoutUrl: string }>;
  verify(reference: string): Promise<ProviderPayment>;
}
const reference = z.string().regex(/^[A-Za-z0-9.=-]{10,100}$/),
  amount = z.number().int().positive().max(1_000_000_000_000);
export class PaystackProvider implements PaymentProvider {
  readonly environment = "test" as const;
  constructor(
    private secret: string,
    private callbackOrigin: string,
    private transport: typeof fetch = fetch,
  ) {
    if (!/^sk_test_[A-Za-z0-9]+$/.test(secret))
      throw new PaymentProviderError("test_key_required");
    const u = new URL(callbackOrigin);
    if (
      u.username ||
      u.password ||
      u.origin !== callbackOrigin ||
      !(
        u.protocol === "https:" ||
        (u.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname))
      )
    )
      throw new PaymentProviderError("callback_origin");
  }
  private async request(path: string, input?: unknown) {
    let r: Response;
    try {
      r = await this.transport("https://api.paystack.co" + path, {
        method: input ? "POST" : "GET",
        headers: {
          Authorization: "Bearer " + this.secret,
          "Content-Type": "application/json",
        },
        ...(input ? { body: JSON.stringify(input) } : {}),
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      });
    } catch {
      throw new PaymentProviderError("transport_unknown", true);
    }
    if (!r.ok)
      throw new PaymentProviderError(
        "http_" + r.status,
        r.status === 429 || r.status >= 500,
      );
    let body: any;
    try {
      body = await r.json();
    } catch {
      throw new PaymentProviderError("response_json");
    }
    if (body.status !== true || !body.data)
      throw new PaymentProviderError("response_status");
    return body.data;
  }
  async initialize(input: {
    reference: string;
    email: string;
    amountKobo: number;
    callbackUrl: string;
    attemptId: string;
    channels: string[];
  }) {
    reference.parse(input.reference);
    z.email().parse(input.email);
    amount.parse(input.amountKobo);
    const callback = new URL(input.callbackUrl);
    if (
      callback.origin !== this.callbackOrigin ||
      callback.username ||
      callback.password ||
      callback.pathname !== "/payment-return" ||
      callback.hash
    )
      throw new PaymentProviderError("callback_not_permitted");
    if (
      !input.channels.length ||
      input.channels.some(
        (v) => !["card", "bank", "ussd", "bank_transfer"].includes(v),
      )
    )
      throw new PaymentProviderError("channel_not_permitted");
    const d = await this.request("/transaction/initialize", {
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      callback_url: callback.href,
      channels: input.channels,
      metadata: { easygas_attempt_id: input.attemptId },
    });
    if (
      d.reference !== input.reference ||
      typeof d.authorization_url !== "string"
    )
      throw new PaymentProviderError("initialize_mismatch");
    const u = new URL(d.authorization_url);
    if (
      u.origin !== "https://checkout.paystack.com" ||
      u.username ||
      u.password ||
      u.hash
    )
      throw new PaymentProviderError("checkout_origin");
    return { checkoutUrl: u.href };
  }
  async verify(ref: string): Promise<ProviderPayment> {
    reference.parse(ref);
    const d = await this.request(
      "/transaction/verify/" + encodeURIComponent(ref),
    );
    if (
      d.reference !== ref ||
      d.domain !== "test" ||
      d.currency !== "NGN" ||
      !Number.isSafeInteger(d.amount) ||
      d.amount <= 0 ||
      !z.email().safeParse(d.customer?.email).success ||
      typeof d.metadata?.easygas_attempt_id !== "string" ||
      !["number", "string"].includes(typeof d.id)
    )
      throw new PaymentProviderError("verification_mismatch");
    if (
      d.fees != null &&
      (!Number.isSafeInteger(d.fees) || d.fees < 0 || d.fees > d.amount)
    )
      throw new PaymentProviderError("invalid_fees");
    return {
      reference: d.reference,
      status: String(d.status),
      currency: d.currency,
      amountKobo: d.amount,
      environment: "test",
      providerId: String(d.id),
      feeKobo: d.fees ?? null,
      email: d.customer.email,
      attemptId: d.metadata.easygas_attempt_id,
    };
  }
}
export type WebhookKeys =
  | { mode: "timestamped"; secrets: string[] }
  | { mode: "legacy"; secret: string };
export function verifyPaystackSignature(
  raw: Uint8Array,
  headers: { current?: string | null; legacy?: string | null },
  keys: WebhookKeys,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  const matches = (expected: Buffer, hex: string) =>
    /^[a-f0-9]{128}$/.test(hex) &&
    timingSafeEqual(expected, Buffer.from(hex, "hex"));
  if (raw.byteLength === 0 || raw.byteLength > 262144) return false;
  if (keys.mode === "timestamped") {
    if (
      !headers.current ||
      !keys.secrets.length ||
      keys.secrets.some((s) => !/^whsec_[A-Za-z0-9]+$/.test(s))
    )
      return false;
    const parts = headers.current.split(",").map((s) => s.trim()),
      times = parts.filter((s) => s.startsWith("t="));
    if (times.length !== 1 || !/^t=\d{10,12}$/.test(times[0])) return false;
    const t = times[0].slice(2);
    if (Math.abs(Number(t) - nowSeconds) > 300) return false;
    const signatures = parts
      .filter((s) => s.startsWith("v1="))
      .map((s) => s.slice(s.indexOf(":") + 1));
    return keys.secrets.some((secret) => {
      const expected = createHmac("sha512", secret)
        .update(t + ".")
        .update(raw)
        .digest();
      return signatures.some((hex) => matches(expected, hex));
    });
  }
  // Explicitly configured legacy mode only; never downgrade a timestamped request.
  if (
    headers.current ||
    !/^sk_test_[A-Za-z0-9]+$/.test(keys.secret) ||
    !headers.legacy
  )
    return false;
  return matches(
    createHmac("sha512", keys.secret).update(raw).digest(),
    headers.legacy,
  );
}
