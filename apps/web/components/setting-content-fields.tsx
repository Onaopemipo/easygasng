import React, { useState } from "react";
import { FormInput } from "./password-input";
import { FieldCaption } from "./field-caption";
import {
  paymentDecimal,
  paymentUnits,
} from "../../../packages/business-rules/src/payment-editor";
import { effectiveDateInLagos } from "../../../packages/business-rules/src/effective-date";
function Amount({
  label,
  value,
  nullable = false,
  max,
  onChange,
}: {
  label: string;
  value: number | null;
  nullable?: boolean;
  max: number;
  onChange: (n: number | null) => void;
}) {
  const [raw, setRaw] = useState(paymentDecimal(value));
  return (
    <label>
      <FieldCaption required={!nullable}>{label}</FieldCaption>
      <FormInput
        type="number"
        min="0"
        max={max / 100}
        step="0.01"
        required={!nullable}
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          try {
            const n = paymentUnits(e.target.value, 0, max, nullable);
            e.target.setCustomValidity("");
            onChange(n);
          } catch {
            e.target.setCustomValidity(
              "Enter a valid naira amount with up to two decimal places.",
            );
          }
        }}
      />
    </label>
  );
}
export default function SettingContentFields({
  type,
  value,
  onChange,
  section,
}: {
  type: string;
  value: any;
  onChange: (v: any) => void;
  section: string;
}) {
  const [zones, setZones] = useState((value?.zones ?? []).join(", "));
  const v = value || {},
    set = (key: string, next: any) => onChange({ ...v, [key]: next });
  const text = (
    key: string,
    label: string,
    min: number,
    max: number,
    multiline = false,
  ) => (
    <label key={key}>
      <FieldCaption required>{label}</FieldCaption>
      {multiline ? (
        <textarea
          required
          minLength={min}
          maxLength={max}
          rows={4}
          value={v[key] ?? ""}
          onChange={(e) => set(key, e.target.value)}
        />
      ) : (
        <FormInput
          required
          minLength={min}
          maxLength={max}
          value={v[key] ?? ""}
          onChange={(e) => set(key, e.target.value)}
        />
      )}
    </label>
  );
  const toggle = (key: string, label: string) => (
    <label>
      <FormInput
        type="checkbox"
        checked={!!v[key]}
        onChange={(e) => set(key, e.target.checked)}
      />
      <FieldCaption required={false}>{label}</FieldCaption>
    </label>
  );
  if (type === "legal")
    return section === "content" ? (
      <>
        {text("title", "Policy title", 3, 150)}
        <label>
          <FieldCaption required={false}>Reviewed policy text</FieldCaption>
          <textarea
            rows={10}
            maxLength={20000}
            value={v.content ?? ""}
            onChange={(e) => set("content", e.target.value)}
          />
        </label>
      </>
    ) : (
      <>
        {toggle("published", "Publish this policy")}
        <label>
          <FieldCaption required={!!v.published}>
            Policy effective date · Lagos time
          </FieldCaption>
          <FormInput
            type="date"
            required={!!v.published}
            value={
              v.effectiveAt
                ? new Date(Date.parse(v.effectiveAt) + 3600000)
                    .toISOString()
                    .slice(0, 10)
                : ""
            }
            onInput={(e) =>
              set(
                "effectiveAt",
                e.currentTarget.value
                  ? new Date(
                      effectiveDateInLagos(e.currentTarget.value),
                    ).toISOString()
                  : null,
              )
            }
            onChange={(e) =>
              set(
                "effectiveAt",
                e.target.value
                  ? new Date(effectiveDateInLagos(e.target.value)).toISOString()
                  : null,
              )
            }
          />
        </label>
        <p>
          Publishing requires reviewed text of at least 100 characters and an
          effective date. This date controls public visibility; scheduling this
          setting change is separate.
        </p>
      </>
    );
  if (type === "checklist") {
    const checks = Array.isArray(value) ? value : [];
    return (
      <>
        <p>
          Keep at least one mandatory safety check. Existing identifiers link
          recorded responses and should be retained. Independent qualified
          review is required before activation.
        </p>
        {checks.map((check, i) => (
          <fieldset key={i}>
            <legend>Safety check {i + 1}</legend>
            <label>
              <FieldCaption required>Check identifier</FieldCaption>
              <FormInput
                required
                pattern="[a-z][a-z0-9_-]{1,60}"
                value={check.id}
                onChange={(e) =>
                  onChange(
                    checks.map((c, j) =>
                      j === i ? { ...c, id: e.target.value } : c,
                    ),
                  )
                }
              />
            </label>
            <label>
              <FieldCaption required>Inspection step</FieldCaption>
              <FormInput
                required
                minLength={5}
                maxLength={250}
                value={check.label}
                onChange={(e) =>
                  onChange(
                    checks.map((c, j) =>
                      j === i ? { ...c, label: e.target.value } : c,
                    ),
                  )
                }
              />
            </label>
            <label>
              <FormInput
                type="checkbox"
                checked={check.required}
                onChange={(e) =>
                  onChange(
                    checks.map((c, j) =>
                      j === i ? { ...c, required: e.target.checked } : c,
                    ),
                  )
                }
              />
              <FieldCaption required={false}>Mandatory check</FieldCaption>
            </label>
            <button
              type="button"
              className="text-link"
              onClick={() => onChange(checks.filter((_, j) => j !== i))}
            >
              Remove check {i + 1}
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          className="button secondary"
          disabled={checks.length >= 40}
          onClick={() => {
            let n = 1;
            while (checks.some((c) => c.id === `check_${n}`)) n++;
            onChange([
              ...checks,
              { id: `check_${n}`, label: "", required: true },
            ]);
          }}
        >
          Add safety check
        </button>
      </>
    );
  }
  if (section === "details")
    return (
      <>
        {text("name", "Service name", 3, 100)}
        {text("description", "Service description", 10, 2000, true)}
        {toggle("active", "Offer this service")}
        <label>
          <FieldCaption required={false}>
            Service areas · comma separated
          </FieldCaption>
          <FormInput
            value={zones}
            onChange={(e) => {
              setZones(e.target.value);
              set(
                "zones",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              );
            }}
          />
        </label>
        <label>
          <FieldCaption required>Duration · minutes</FieldCaption>
          <FormInput
            type="number"
            required
            min={15}
            max={480}
            step={1}
            value={v.durationMinutes ?? ""}
            onChange={(e) => set("durationMinutes", Number(e.target.value))}
          />
        </label>
        <p>
          An active offering needs service areas and the required
          qualifications. Availability still depends on operational checks.
        </p>
      </>
    );
  if (section === "pricing")
    return (
      <>
        <label>
          <FieldCaption required>Pricing model</FieldCaption>
          <select
            value={v.pricingModel ?? "quote"}
            onChange={(e) => set("pricingModel", e.target.value)}
          >
            {[
              ["fixed", "Fixed price"],
              ["starting", "Starting price"],
              ["quote", "Quotation required"],
              ["labour_materials", "Labour and materials"],
              ["custom", "Custom pricing"],
            ].map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Amount
          label="Service price · ₦"
          value={v.priceKobo ?? null}
          nullable
          max={100000000}
          onChange={(n) => set("priceKobo", n)}
        />
        <Amount
          label="Call-out fee · ₦"
          value={v.calloutKobo ?? 0}
          max={10000000}
          onChange={(n) => set("calloutKobo", n)}
        />
        {text("inclusions", "What is included", 5, 2000, true)}
        {text("exclusions", "What is excluded", 5, 2000, true)}
        <p>
          A fixed-price active offering requires a service price. Blank means
          unconfigured; zero means no charge.
        </p>
      </>
    );
  return (
    <>
      {text("qualification", "Required qualification code", 3, 61)}
      {text("preparation", "Customer preparation", 5, 2000, true)}
      {text("safety", "Safety requirements", 5, 2000, true)}
      {text("warranty", "Warranty terms", 5, 2000, true)}
      <label>
        <FieldCaption required>Cancellation notice · hours</FieldCaption>
        <FormInput
          type="number"
          min={0}
          max={168}
          step={1}
          required
          value={v.cancellationHours ?? ""}
          onChange={(e) => set("cancellationHours", Number(e.target.value))}
        />
      </label>
    </>
  );
}
