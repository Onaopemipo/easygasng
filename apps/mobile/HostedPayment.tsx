import React, { useEffect, useRef, useState } from "react";
import { View, Switch, Linking } from "react-native";
import { randomUUID } from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import {
  Card,
  Copy,
  Title,
  Button,
  money,
  type CustomerAPI,
} from "./CustomerUI";
import { FieldCaption, TextInput } from "./typography";
import { useTheme } from "./theme";
export function NativePaymentReturn({
  api,
  intentId,
  onDone,
}: {
  api: CustomerAPI;
  intentId: string | null;
  onDone?: () => void;
}) {
  const [state, setState] = useState("Not verified"),
    [busy, setBusy] = useState(false);
  async function check() {
    if (!intentId) return;
    setBusy(true);
    try {
      const r = await api("payments/paystack/verify", { intentId });
      setState(
        r.status === "paid"
          ? "Sandbox payment verified. Only the requested principal was posted."
          : `Payment ${r.status}. Do not start another charge.`,
      );
      if (r.status === "paid") onDone?.();
    } catch (e: any) {
      setState(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <Title>Verify Payment</Title>
      <Copy>
        A browser return is not proof of payment. Verification requires an
        online connection and your current account.
      </Copy>
      <Copy>{state}</Copy>
      <Button
        label="Check payment status"
        disabled={busy || !intentId}
        onPress={check}
      />
    </Card>
  );
}
export function NativeHostedPayment({
  api,
  userId,
  purpose,
  invoiceId,
  bookingId,
  amountKobo,
}: {
  api: CustomerAPI;
  userId: string;
  purpose: "invoice" | "wallet" | "service";
  invoiceId?: string;
  bookingId?: string;
  amountKobo?: number;
}) {
  const [config, setConfig] = useState<any>(null),
    [quote, setQuote] = useState<any>(null),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const request = useRef<string | null>(null),
    active = useRef(true);
  const storage = "easygas.paymentIntent." + userId;
  useEffect(() => {
    active.current = true;
    api("payments/paystack/configuration")
      .then((c) => active.current && setConfig(c))
      .catch(() => {});
    return () => {
      active.current = false;
    };
  }, [userId]);
  if (!config?.available || (purpose === "wallet" && !config.walletFunding))
    return null;
  async function review() {
    setBusy(true);
    setError("");
    try {
      const saved = await SecureStore.getItemAsync(storage);
      if (saved) {
        const previous = await api(
          "payments/paystack/status?intentId=" + encodeURIComponent(saved),
        );
        if (!["paid", "failed", "expired"].includes(previous.status)) {
          setQuote(previous);
          setPending(previous.status !== "quoted");
          setAccepted(false);
          setError(
            previous.status === "quoted"
              ? "Review your existing payment quote before continuing."
              : "An existing payment needs verification before starting another charge.",
          );
          return;
        }
      }
      request.current = randomUUID();
      const q = await api("payments/paystack/quote", {
        purpose,
        ...(invoiceId ? { invoiceId } : {}),
        ...(bookingId ? { bookingId } : {}),
        ...(amountKobo ? { amountKobo } : {}),
        requestKey: request.current,
      });
      if (!active.current) return;
      setQuote(q);
      setPending(q.status !== "quoted");
      setAccepted(false);
      await SecureStore.setItemAsync(storage, q.id);
    } catch (e: any) {
      if (active.current) setError(e.message);
    } finally {
      if (active.current) setBusy(false);
    }
  }
  async function proceed() {
    if (!accepted || busy || !quote) return;
    setBusy(true);
    try {
      const result = await api("payments/paystack/initialize", {
        intentId: quote.id,
        acceptedGrossKobo: quote.quote.grossKobo,
        acceptedPolicyVersion: quote.quote.gatewayPolicyVersion,
      });
      if (!active.current) return;
      setPending(true);
      if (result.checkoutUrl) {
        const u = new URL(result.checkoutUrl);
        if (u.origin !== "https://checkout.paystack.com")
          throw new Error("Hosted checkout address rejected.");
        await Linking.openURL(u.href);
      } else
        setError(
          "Initialization is uncertain. Verify this attempt; do not create another charge.",
        );
    } catch (e: any) {
      if (active.current) setError(e.message);
    } finally {
      if (active.current) setBusy(false);
    }
  }
  return (
    <Card>
      <Title>Paystack Sandbox</Title>
      <Copy>Test mode only — not a live-money payment.</Copy>
      {!!error && <Copy>{error}</Copy>}
      {!quote ? (
        <Button
          label="Review amount and processing charge"
          disabled={busy}
          onPress={review}
        />
      ) : (
        <>
          <Copy>Purpose: {quote.purpose}</Copy>
          <Copy>Principal: {money(quote.quote.baseKobo)}</Copy>
          <Copy>
            Payment processing charge: {money(quote.quote.customerFeeKobo)}
          </Copy>
          <Title>Total: {money(quote.quote.grossKobo)}</Title>
          <Copy>
            Expires {new Date(quote.expiresAt).toLocaleString()}. Wallet credit
            excludes the processing charge.
          </Copy>
          {pending ? (
            <NativePaymentReturn
              api={api}
              intentId={quote.id}
              onDone={() => SecureStore.deleteItemAsync(storage)}
            />
          ) : (
            <>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Switch
                  accessibilityLabel="Accept payment amount and processing charge"
                  value={accepted}
                  onValueChange={setAccepted}
                />
                <Copy>I accept the disclosed total and processing charge.</Copy>
              </View>
              <Button
                label="Continue to Paystack sandbox"
                disabled={busy || !accepted}
                onPress={proceed}
              />
            </>
          )}
        </>
      )}
    </Card>
  );
}
export function NativeWalletFunding({
  api,
  userId,
}: {
  api: CustomerAPI;
  userId: string;
}) {
  const { colors } = useTheme(),
    [config, setConfig] = useState<any>(null),
    [amount, setAmount] = useState("");
  useEffect(() => {
    let live = true;
    api("payments/paystack/configuration")
      .then((c) => live && setConfig(c))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [userId]);
  if (!config?.walletFunding) return null;
  const n = /^\d+(\.\d{1,2})?$/.test(amount)
    ? Math.round(Number(amount) * 100)
    : 0;
  return (
    <Card>
      <Title>Fund Purchase Credit</Title>
      <FieldCaption required={true}>Amount (NGN)</FieldCaption>
      <TextInput
        accessibilityLabel="Wallet credit amount in naira, required"
        placeholder="Amount (NGN)"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        style={{ color: colors.text, minHeight: 44, fontSize: 15 }}
      />
      {n > 0 && (
        <NativeHostedPayment
          key={n}
          api={api}
          userId={userId}
          purpose="wallet"
          amountKobo={n}
        />
      )}
    </Card>
  );
}
