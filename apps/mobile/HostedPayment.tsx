import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, Linking, AppState } from "react-native";
import { randomUUID } from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { type CustomerAPI, money, Feedback } from "./CustomerUI";
import {
  NextText,
  NextIntro,
  NextNotice,
  NextButton,
  NextCard,
  NextField,
  NextIcon,
} from "./MobileNextUI";
import { useTheme } from "./theme";
import { nairaToKobo } from "../../packages/business-rules/src/pos-money";
export function NativePaymentReturn({
  api,
  intentId,
  onDone,
  onTerminal,
}: {
  api: CustomerAPI;
  intentId: string | null;
  onDone?: () => void;
  onTerminal?: (status: string) => void;
}) {
  const [result, setResult] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    alive = useRef(true),
    checking = useRef(new Set<number>()),
    generation = useRef(0),
    identity = useRef(intentId),
    apiRef = useRef(api),
    done = useRef(onDone),
    terminal = useRef(onTerminal);
  apiRef.current = api;
  done.current = onDone;
  terminal.current = onTerminal;
  identity.current = intentId;
  async function check() {
    const id = intentId;
    const run = generation.current;
    if (!id || checking.current.has(run)) return;
    checking.current.add(run);
    setBusy(true);
    setError("");
    try {
      const value = await apiRef.current("payments/paystack/verify", {
        intentId: id,
      });
      if (
        !alive.current ||
        identity.current !== id ||
        generation.current !== run
      )
        return;
      setResult(value);
      if (value.status === "paid") done.current?.();
      else if (["failed", "expired"].includes(value.status))
        terminal.current?.(value.status);
    } catch (e: any) {
      if (
        alive.current &&
        identity.current === id &&
        generation.current === run
      )
        setError(e.message);
    } finally {
      checking.current.delete(run);
      if (
        alive.current &&
        identity.current === id &&
        generation.current === run
      )
        setBusy(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    generation.current += 1;
    setResult(null);
    setError("");
    void check();
    const listener = AppState.addEventListener("change", (s) => {
      if (s === "active") void check();
    });
    return () => {
      alive.current = false;
      listener.remove();
    };
  }, [intentId]);
  const paid = result?.status === "paid";
  return (
    <View style={{ gap: 18 }}>
      <View style={{ alignItems: "center", gap: 14, paddingVertical: 20 }}>
        <NextIcon name={paid ? "check-circle-2" : "shield-check"} size={48} />
        <NextText kind="heading">
          {paid
            ? "Payment verified"
            : busy
              ? "Checking your payment…"
              : "Your payment attempt is saved."}
        </NextText>
        <NextText style={{ textAlign: "center" }}>
          {paid
            ? "Your payment was verified by the server."
            : !intentId
              ? "Open the original payment return link."
              : "Your order stays saved while we confirm the result securely."}
        </NextText>
      </View>
      {error && <NextNotice error>{error}</NextNotice>}
      {!paid && result?.status && (
        <NextNotice>
          {["failed", "expired"].includes(result.status)
            ? "Payment " +
              result.status +
              ". Check your saved order before trying another payment."
            : "Payment is still being confirmed. No new charge has been started."}
        </NextNotice>
      )}
      {!paid && (
        <NextButton
          label={busy ? "Checking payment…" : "Check again"}
          disabled={busy || !intentId}
          onPress={() => void check()}
        />
      )}
      <NextText kind="small">
        Sandbox payments only. No live-money payment or physical delivery is
        confirmed by this screen.
      </NextText>
    </View>
  );
}
export function NativeHostedPayment({
  api,
  userId,
  purpose,
  invoiceId,
  bookingId,
  orderId,
  amountKobo,
  autoReview = false,
  onPaid,
}: {
  api: CustomerAPI;
  userId: string;
  purpose: "invoice" | "wallet" | "service" | "order";
  invoiceId?: string;
  bookingId?: string;
  orderId?: string;
  amountKobo?: number;
  autoReview?: boolean;
  onPaid?: () => void;
}) {
  const { colors } = useTheme(),
    [config, setConfig] = useState<any>(null),
    [quote, setQuote] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false),
    [paid, setPaid] = useState(false),
    [configurationRevision, reloadConfiguration] = useState(0);
  const active = useRef(true),
    lock = useRef(false),
    attempted = useRef(false),
    onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;
  const storage =
      "easygas.paymentIntent." +
      userId +
      (purpose === "order"
        ? ".order." + orderId
        : purpose === "invoice"
          ? ".invoice." + invoiceId
          : purpose === "service"
            ? ".service." + bookingId
            : ".wallet"),
    signature = JSON.stringify({
      purpose,
      invoiceId,
      bookingId,
      orderId,
      amountKobo,
    });
  useEffect(() => {
    active.current = true;
    api("payments/paystack/configuration")
      .then((c) => {
        if (active.current) setConfig(c);
      })
      .catch((e) => {
        if (active.current) setError(e.message);
      })
      .finally(() => {
        if (active.current) setLoaded(true);
      });
    return () => {
      active.current = false;
    };
  }, [userId, configurationRevision]);
  async function paidResult() {
    setPaid(true);
    await SecureStore.deleteItemAsync(storage).catch(() => {});
    await SecureStore.deleteItemAsync(storage + ".request").catch(() => {});
    if (active.current) onPaidRef.current?.();
  }
  async function review() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      let saved = await SecureStore.getItemAsync(storage);
      if (!saved && purpose === "wallet") {
        const legacy = await SecureStore.getItemAsync(
          "easygas.paymentIntent." + userId,
        );
        if (legacy) {
          const old = await api(
            "payments/paystack/status?intentId=" + encodeURIComponent(legacy),
          );
          if (old.purpose === "wallet") saved = legacy;
        }
      }
      if (saved) {
        const previous = await api(
          "payments/paystack/status?intentId=" + encodeURIComponent(saved),
        );
        if (
          previous.purpose !== purpose ||
          (orderId && previous.orderId !== orderId) ||
          (invoiceId && previous.invoiceId !== invoiceId) ||
          (bookingId && previous.bookingId !== bookingId)
        )
          throw Error(
            "This saved payment belongs to a different purpose. Check your payment history.",
          );
        if (previous.status === "paid") {
          await paidResult();
          return;
        }
        if (!["failed", "expired"].includes(previous.status)) {
          if (!active.current) return;
          setQuote(previous);
          setPending(previous.status !== "quoted");
          await SecureStore.setItemAsync(storage, saved);
          return;
        }
        await SecureStore.deleteItemAsync(storage + ".request");
        await SecureStore.deleteItemAsync(storage);
      }
      let request = JSON.parse(
        (await SecureStore.getItemAsync(storage + ".request")) || "null",
      );
      if (request?.signature !== signature)
        request = { signature, key: randomUUID() };
      await SecureStore.setItemAsync(
        storage + ".request",
        JSON.stringify(request),
      );
      const value = await api("payments/paystack/quote", {
        purpose,
        ...(invoiceId ? { invoiceId } : {}),
        ...(bookingId ? { bookingId } : {}),
        ...(orderId ? { orderId } : {}),
        ...(amountKobo ? { amountKobo } : {}),
        requestKey: request.key,
      });
      await SecureStore.setItemAsync(storage, value.id);
      if (active.current) {
        setQuote(value);
        setPending(value.status !== "quoted");
      }
    } catch (e: any) {
      if (active.current) setError(e.message);
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (config?.available && autoReview && !attempted.current) {
      attempted.current = true;
      void review();
    }
  }, [config?.available, autoReview]);
  async function proceed() {
    if (lock.current || !quote) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api("payments/paystack/initialize", {
        intentId: quote.id,
        acceptedGrossKobo: quote.quote.grossKobo,
        acceptedPolicyVersion: quote.quote.gatewayPolicyVersion,
      });
      if (!active.current) return;
      setPending(true);
      if (result.checkoutUrl) {
        const url = new URL(result.checkoutUrl);
        if (
          url.origin !== "https://checkout.paystack.com" ||
          url.username ||
          url.password
        )
          throw Error("Hosted checkout address rejected.");
        await Linking.openURL(url.href);
      } else
        setError(
          "The payment is awaiting confirmation. Check this same attempt before starting another charge.",
        );
    } catch (e: any) {
      if (active.current) {
        setPending(true);
        setError(e.message);
      }
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  if (paid)
    return (
      <NextNotice>
        Your payment was verified. Your saved order and receipt remain
        available.
      </NextNotice>
    );
  return (
    <View style={{ gap: 18 }}>
      <Feedback
        loading={!loaded && !error}
        error={!loaded ? error : undefined}
        retry={() => void review()}
      />
      {loaded &&
      (!config?.available ||
        (purpose === "wallet" && !config.walletFunding)) ? (
        <NextNotice>
          Online {purpose === "wallet" ? "wallet funding" : "payment"} is
          unavailable. Your saved order and other enabled payment methods remain
          available.
        </NextNotice>
      ) : pending && quote ? (
        <NativePaymentReturn
          api={api}
          intentId={quote.id}
          onDone={() => void paidResult()}
          onTerminal={(status) => {
            setPending(false);
            setQuote(null);
            setError(
              "Payment " +
                status +
                ". Review a new amount before trying again.",
            );
          }}
        />
      ) : quote ? (
        <>
          <NextCard>
            {[
              ["Order amount", quote.quote.baseKobo],
              ["Processing fee", quote.quote.customerFeeKobo],
              ["Total to pay", quote.quote.grossKobo],
            ].map(([label, amount], i) => (
              <View
                key={String(label)}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 14,
                  paddingTop: i === 2 ? 15 : 0,
                  borderTopWidth: i === 2 ? 1 : 0,
                  borderColor: colors.border,
                }}
              >
                <NextText kind={i === 2 ? "label" : "small"}>{label}</NextText>
                <NextText kind={i === 2 ? "heading" : "label"}>
                  {money(Number(amount))}
                </NextText>
              </View>
            ))}
          </NextCard>
          <View
            style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}
          >
            <NextIcon name="shield-check" />
            <NextText kind="small" style={{ flex: 1, color: colors.muted }}>
              Payment returns to EasyGas for secure verification using your app
              session.
            </NextText>
          </View>
          <NextText kind="small" style={{ color: colors.muted }}>
            Sandbox only. No live-money payment.{" "}
            {purpose === "wallet"
              ? "Wallet credit excludes the processing fee."
              : "The processing fee is separate from your purchase amount."}
          </NextText>
          <NextButton
            label={busy ? "Opening secure payment…" : "Accept total & continue"}
            disabled={busy}
            onPress={() => void proceed()}
          />
        </>
      ) : (
        loaded && (
          <NextButton
            label={busy ? "Checking amount…" : "Review payment amount"}
            onPress={() => void review()}
            disabled={busy}
          />
        )
      )}
      {!!error && <NextNotice error>{error}</NextNotice>}
      {loaded && !config && (
        <NextButton
          label="Retry payment connection"
          secondary
          onPress={() => {
            setLoaded(false);
            setError("");
            reloadConfiguration((n) => n + 1);
          }}
        />
      )}
    </View>
  );
}
export function NativeWalletFunding({
  api,
  userId,
  onPaid,
}: {
  api: CustomerAPI;
  userId: string;
  onPaid?: () => void;
}) {
  const [amount, setAmount] = useState(""),
    [reviewed, setReviewed] = useState<number | null>(null),
    [error, setError] = useState("");
  if (reviewed !== null)
    return (
      <NativeHostedPayment
        api={api}
        userId={userId}
        purpose="wallet"
        amountKobo={reviewed}
        autoReview
        onPaid={onPaid}
      />
    );
  return (
    <View style={{ gap: 18 }}>
      <NextText>
        Choose how much purchase credit to add. The processing fee is disclosed
        before payment.
      </NextText>
      <NextField
        label="Amount (₦)"
        value={amount}
        onChange={setAmount}
        keyboardType="decimal-pad"
      />
      {!!error && <NextNotice error>{error}</NextNotice>}
      <NextButton
        label="Review payment"
        onPress={() => {
          try {
            const value = nairaToKobo(amount);
            if (!value || value <= 0)
              throw Error("Enter a positive naira amount.");
            setReviewed(value);
          } catch (e: any) {
            setError(e.message);
          }
        }}
      />
    </View>
  );
}
