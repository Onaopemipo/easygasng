"use client";
import React, { useEffect, useRef, useState } from "react";
import { FieldCaption } from "./field-caption";
import {
  paymentDecimal,
  paymentUnits,
} from "../../../packages/business-rules/src/payment-editor";
import {
  maximumPaymentPrincipal,
  quotePaymentFee,
} from "../../../packages/business-rules/src/payment-fees";

function Amount({
  label,
  value,
  onChange,
  percent = false,
  nullable = false,
  min = 0,
  max = 1e12,
  error = "",
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  percent?: boolean;
  nullable?: boolean;
  min?: number;
  max?: number;
  error?: string;
}) {
  const [raw, setRaw] = useState(() => paymentDecimal(value));
  const last = useRef(value),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!Object.is(value, last.current)) {
      last.current = value;
      setRaw(paymentDecimal(value));
    }
  }, [value]);
  useEffect(() => {
    let message = error;
    try {
      paymentUnits(raw, min, max, nullable);
    } catch (e) {
      message = (e as Error).message;
    }
    input.current?.setCustomValidity(message);
  }, [raw, min, max, nullable, error]);
  return (
    <label className="wp-amount">
      <FieldCaption required={!nullable}>{label}</FieldCaption>
      <span className="wp-input">
        <span aria-hidden="true">{percent ? "%" : "₦"}</span>
        <input
          ref={input}
          type="text"
          inputMode="decimal"
          required={!nullable}
          pattern="[0-9]+(\.[0-9]{1,2})?"
          value={raw}
          onChange={(e) => {
            const next = e.target.value;
            setRaw(next);
            let units: number | null;
            try {
              units = paymentUnits(next, min, max, nullable);
              e.target.setCustomValidity(error);
            } catch (err) {
              units = NaN;
              e.target.setCustomValidity((err as Error).message);
            }
            last.current = units;
            onChange(units);
          }}
          onBlur={() => {
            try {
              setRaw(paymentDecimal(paymentUnits(raw, min, max, nullable)));
            } catch {
              /* Retain invalid text for correction. */
            }
          }}
        />
      </span>
      {nullable && <small>Leave blank for no cap.</small>}
    </label>
  );
}
function Toggle({
  label,
  description,
  checked,
  onChange,
  required = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  required?: boolean;
}) {
  return (
    <label className="wp-toggle">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        required={required}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
export default function PaymentGatewayPolicy({
  value,
  setValue,
  section = "all",
}: {
  value: any;
  setValue: (v: any) => void;
  section?: "all" | "checkout" | "fees" | "wallet";
}) {
  const update = (key: string, v: any) => setValue({ ...value, [key]: v });
  const fee = (key: string, v: any) =>
    update("fee", { ...value.fee, [key]: v });
  const amount = (
    key: string,
    label: string,
    opts: Partial<Parameters<typeof Amount>[0]> = {},
  ) => (
    <Amount
      key={key}
      label={label}
      value={value.fee[key]}
      onChange={(v) => fee(key, v)}
      {...opts}
    />
  );
  let example: ReturnType<typeof quotePaymentFee> | null = null;
  try {
    if (value.fee) {
      const base = Math.min(1000000, maximumPaymentPrincipal(value.fee));
      if (base > 0) example = quotePaymentFee(base, value.fee);
    }
  } catch {
    /* Invalid drafts have no illustrative quote. */
  }
  const money = (n: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(n / 100);
  return (
    <div className="wp-section">
      {(section === "all" || section === "checkout") && (
        <>
          <div className="wp-note">
            <strong>Sandbox / test mode</strong>
            <span>
              Only test payments are available. Keep API keys on the server.
            </span>
          </div>
          <Toggle
            label="Sandbox checkout"
            description="Accept payments through approved test channels."
            checked={!!value.enabled}
            onChange={(v) => update("enabled", v)}
          />
          <div className="wp-methods">
            <p className="wp-label">Payment methods</p>
            <div className="wp-grid">
              {[
                ["card", "Credit / debit card"],
                ["bank_transfer", "Bank transfer"],
                ["bank", "Bank"],
                ["ussd", "USSD"],
              ].map(([key, label]) => (
                <label className="wp-method" key={key}>
                  <input
                    type="checkbox"
                    required={!!value.enabled && !value.channels?.length}
                    checked={value.channels?.includes(key) ?? false}
                    onChange={(e) =>
                      update(
                        "channels",
                        e.target.checked
                          ? [...(value.channels ?? []), key]
                          : value.channels.filter((v: string) => v !== key),
                      )
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
          <label>
            <FieldCaption required={!!value.enabled}>
              Merchant approval reference
            </FieldCaption>
            <textarea
              rows={2}
              maxLength={200}
              required={!!value.enabled}
              value={value.merchantApprovalReference ?? ""}
              onChange={(e) =>
                update("merchantApprovalReference", e.target.value)
              }
            />
            <small>
              Reference the verified merchant configuration, not a secret key.
            </small>
          </label>
          <details className="wp-advanced">
            <summary>Quote timing</summary>
            <label>
              <FieldCaption required>Quote validity (seconds)</FieldCaption>
              <input
                type="number"
                min={60}
                max={1800}
                step={1}
                required
                value={value.quoteLifetimeSeconds}
                onChange={(e) =>
                  update(
                    "quoteLifetimeSeconds",
                    e.target.value === "" ? NaN : Number(e.target.value),
                  )
                }
              />
              <small>
                60–1,800 seconds. Existing quotes retain their fee version.
              </small>
            </label>
          </details>
        </>
      )}
      {(section === "all" || section === "fees") && (
        <>
          {!value.fee ? (
            <div className="wp-empty">
              <strong>No fee schedule configured</strong>
              <p>Add verified merchant rates before enabling checkout.</p>
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  update("fee", {
                    version: 1,
                    currency: "NGN",
                    percentageBps: 0,
                    fixedKobo: 0,
                    fixedWaivedBelowKobo: 0,
                    capKobo: null,
                    rounding: "ceil",
                    maximumGrossKobo: 10000000,
                    bearer: "merchant",
                  })
                }
              >
                Configure fees
              </button>
            </div>
          ) : (
            <>
              <p className="wp-intro">
                Use your verified merchant rates. Amounts are in naira.
              </p>
              <label>
                <FieldCaption required>Fee paid by</FieldCaption>
                <select
                  value={value.fee.bearer}
                  onChange={(e) => fee("bearer", e.target.value)}
                >
                  <option value="merchant">EasyGas</option>
                  <option value="customer">Customer</option>
                </select>
              </label>
              <div className="wp-grid">
                {amount("percentageBps", "Percentage fee", {
                  percent: true,
                  max: 9999,
                })}
                {amount("fixedKobo", "Fixed fee")}
                {amount("capKobo", "Fee cap", { nullable: true })}
              </div>
              {example && (
                <div className="wp-example" role="note">
                  <span>Illustration · {money(example.baseKobo)} payment</span>
                  <strong>Customer pays {money(example.grossKobo)}</strong>
                  <small>
                    Estimated provider fee {money(example.estimatedFeeKobo)}.
                    Uses this draft’s fee rules; final checkout requires an
                    approved quote.
                  </small>
                </div>
              )}
              <details className="wp-advanced">
                <summary>Advanced fee rules</summary>
                <div className="wp-grid">
                  {amount("fixedWaivedBelowKobo", "Waive fixed fee below")}
                  {amount("maximumGrossKobo", "Maximum total charge", {
                    min: 1,
                  })}
                  <label>
                    <FieldCaption required>Provider rounding</FieldCaption>
                    <select
                      value={value.fee.rounding}
                      onChange={(e) => fee("rounding", e.target.value)}
                    >
                      <option value="ceil">Round up to next kobo</option>
                      <option value="floor">Round down to previous kobo</option>
                      <option value="nearest">Round to nearest kobo</option>
                    </select>
                  </label>
                </div>
              </details>
            </>
          )}
          <label>
            <FieldCaption required={!!value.enabled}>
              Paystack automatic fees
            </FieldCaption>
            <select
              value={value.providerAutomaticFees}
              ref={(el) => {
                el?.setCustomValidity(
                  value.enabled && value.providerAutomaticFees !== "off"
                    ? "Verify that Paystack automatic fee collection is off before enabling checkout."
                    : "",
                );
              }}
              onChange={(e) => update("providerAutomaticFees", e.target.value)}
            >
              <option value="unknown">Not verified</option>
              <option value="off">Verified off</option>
            </select>
            <small>
              Must be off before checkout is enabled to prevent duplicate fees.
            </small>
          </label>
          {value.fee?.bearer === "customer" && (
            <Toggle
              label="Customer fee verified"
              description="Merchant permission to pass the disclosed fee to customers is confirmed."
              checked={!!value.passThroughApproved}
              required={!!value.enabled}
              onChange={(v) => update("passThroughApproved", v)}
            />
          )}
        </>
      )}
      {(section === "all" || section === "wallet") && (
        <>
          <Toggle
            label="Wallet top-ups"
            description="Allow approved sandbox funding for use within EasyGas."
            checked={!!value.walletFunding}
            onChange={(v) => update("walletFunding", v)}
          />
          <div className="wp-grid">
            <Amount
              label="Minimum top-up"
              value={value.walletMinimumKobo}
              min={1}
              max={100000000}
              error={
                value.walletMinimumKobo > value.walletMaximumKobo
                  ? "Minimum top-up must not exceed the maximum."
                  : ""
              }
              onChange={(v) => update("walletMinimumKobo", v)}
            />
            <Amount
              label="Maximum top-up / balance"
              value={value.walletMaximumKobo}
              min={1}
              max={100000000}
              onChange={(v) => update("walletMaximumKobo", v)}
            />
          </div>
          <Toggle
            label="Partial invoice payments"
            description="Allow customers to pay an invoice in approved instalments."
            checked={!!value.partialInvoices}
            onChange={(v) => update("partialInvoices", v)}
          />
        </>
      )}
    </div>
  );
}
