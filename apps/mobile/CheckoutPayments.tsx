import React, { useEffect, useState } from "react";
import { AppState } from "react-native";
import { Copy, Button, money, type CustomerAPI } from "./CustomerUI";
import {
  orderPaymentMethods,
  walletPaymentHint,
  type OrderPaymentOptions,
} from "../../packages/business-rules/src/order-payment";
export function useCheckoutPayments(
  api: CustomerAPI,
  userId?: string,
  branchId = "lagos",
  enabled = true,
) {
  const [result, setResult] = useState<{
    key: string;
    data?: OrderPaymentOptions;
    error?: string;
  }>();
  const [version, reload] = useState(0);
  const key = `${userId}:${branchId}`;
  useEffect(() => {
    if (!userId || !enabled) return;
    let active = true;
    const timeout = setTimeout(() => {
      if (active) {
        active = false;
        setResult({
          key,
          error:
            "Payment choices could not be loaded. Retry before confirming.",
        });
      }
    }, 15000);
    api("checkout.payment-options?branchId=" + encodeURIComponent(branchId))
      .then((data) => {
        if (active) setResult({ key, data });
      })
      .catch(() => {
        if (active)
          setResult({
            key,
            error:
              "Payment choices could not be loaded. Retry before confirming.",
          });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [key, enabled, version]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") reload((n) => n + 1);
    });
    return () => listener.remove();
  }, []);
  const current = enabled && result?.key === key ? result : undefined;
  const data = current?.data;
  return {
    data,
    error: current?.error,
    refresh: () => reload((n) => n + 1),
    options: orderPaymentMethods
      .filter((item) => data?.methods.includes(item.value))
      .map((item) => ({
        ...item,
        label:
          item.value === "wallet"
            ? `Wallet · ${money(data!.balanceKobo)} available`
            : item.label,
      })),
  };
}
export function CheckoutWalletBalance({
  payments,
  selected,
  amountKobo,
}: {
  payments: ReturnType<typeof useCheckoutPayments>;
  selected?: string;
  amountKobo?: number;
}) {
  return (
    <>
      <Copy>
        {payments.data
          ? `Wallet balance: ${money(payments.data.balanceKobo)}`
          : (payments.error ?? "Loading payment choices and wallet balance…")}
      </Copy>
      {payments.data && selected === "wallet" && (
        <Copy>{walletPaymentHint(payments.data.balanceKobo, amountKobo)}</Copy>
      )}
      {!!payments.error && <Button
        label={
          payments.error ? "Retry payment choices" : "Refresh wallet balance"
        }
        secondary
        onPress={payments.refresh}
      />}
    </>
  );
}
