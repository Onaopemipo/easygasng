"use client";
import { useEffect, useId, useRef, useState } from "react";
import { api, money } from "./ui";
import { FieldCaption } from "./field-caption";
import Link from "./workspace-link";
import {
  orderPaymentMethods,
  walletPaymentHint,
  type OrderPaymentOptions,
} from "../../../packages/business-rules/src/order-payment";

export function CheckoutPaymentMethods({
  userId,
  branchId = "lagos",
  locations,
  value,
  onChange,
  onAvailabilityChange,
  amountKobo,
}: {
  userId?: string;
  branchId?: string;
  locations?: { name: string; branch_id: string }[];
  value?: string;
  onChange?: (value: string) => void;
  onAvailabilityChange?: (value: boolean) => void;
  amountKobo?: number;
}) {
  const [loaded, setLoaded] = useState<{
    key: string;
    data?: OrderPaymentOptions;
    error?: string;
  }>();
  const [selected, setSelected] = useState("cash_on_delivery");
  const [revision, retry] = useState(0);
  const select = useRef<HTMLSelectElement>(null);
  const [deliveryBranch, setDeliveryBranch] = useState(branchId);
  const currentBranch = locations ? deliveryBranch : branchId;
  const id = useId();
  const key = `${userId}:${currentBranch}`;
  const data = loaded?.key === key ? loaded.data : undefined;
  const error = loaded?.key === key ? loaded.error : undefined;
  const method = value ?? selected;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    api(
      "checkout.payment-options?branchId=" + encodeURIComponent(currentBranch),
      undefined,
      { signal: controller.signal },
    )
      .then((data) => {
        if (active) setLoaded({ key, data });
      })
      .catch(() => {
        if (active)
          setLoaded({
            key,
            error:
              "Payment choices and wallet balance could not be loaded. Please retry.",
          });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [key, revision]);
  useEffect(() => {
    const form = select.current?.form;
    if (!form || !locations) return;
    const update = () => {
      const zone = form.querySelector<HTMLSelectElement>(
        'select[name="zone"]',
      )?.value;
      setDeliveryBranch(
        locations.find((item) => item.name === zone)?.branch_id ?? branchId,
      );
    };
    const changed = () => queueMicrotask(update);
    const observer = new MutationObserver(update);
    update();
    form.addEventListener("change", changed);
    observer.observe(form, { childList: true, subtree: true });
    return () => {
      form.removeEventListener("change", changed);
      observer.disconnect();
    };
  }, [locations, branchId]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") retry((n) => n + 1);
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  useEffect(() => {
    const shortfall =
      method === "wallet" &&
      amountKobo !== undefined &&
      data !== undefined &&
      data.balanceKobo < amountKobo;
    select.current?.setCustomValidity(
      shortfall
        ? "Top up your wallet or choose Card or Cash for this order."
        : data?.methods.includes(method)
          ? ""
          : "Choose an available payment method, or retry loading payment choices.",
    );
    onAvailabilityChange?.(
      data?.methods.includes(method) === true && !shortfall,
    );
  }, [data, method, onAvailabilityChange, amountKobo]);
  return (
    <div className="stack checkout-payment-methods">
      <label htmlFor={id}>
        <FieldCaption required>Payment method</FieldCaption>
      </label>
      <select
        ref={select}
        id={id}
        name="paymentMethod"
        value={method}
        required
        aria-describedby={id + "-help"}
        onChange={(event) => {
          setSelected(event.target.value);
          onChange?.(event.target.value);
        }}
      >
        <option value="" disabled>
          Choose how to pay
        </option>
        {orderPaymentMethods.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={!data?.methods.includes(option.value)}
          >
            {option.label}
            {option.value === "wallet" && data
              ? ` · ${money(data.balanceKobo)} available`
              : ""}
            {data && !data.methods.includes(option.value)
              ? " · unavailable"
              : ""}
          </option>
        ))}
      </select>
      <div id={id + "-help"} aria-live="polite">
        {!data && !error ? (
          <p>Loading payment choices and wallet balance…</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : (
          <>
            <p>
              Wallet balance: <strong>{money(data!.balanceKobo)}</strong>
            </p>
            <p>
              {method === "wallet"
                ? walletPaymentHint(data!.balanceKobo, amountKobo)
                : method === "card"
                  ? `Pay securely by card${data!.environment === "test" ? " in Paystack sandbox" : ""}. Review any processing charge before paying.`
                  : "Pay cash when your order is delivered."}
            </p>
            {method === "wallet" && (
              <Link
                href="/wallet#top-up"
                target="_blank"
                rel="noopener noreferrer"
              >
                Top up wallet (opens a new tab)
              </Link>
            )}
          </>
        )}
      </div>
      <button
        type="button"
        className="button secondary"
        onClick={() => retry((n) => n + 1)}
      >
        {error ? "Retry payment choices" : "Refresh wallet balance"}
      </button>
    </div>
  );
}
