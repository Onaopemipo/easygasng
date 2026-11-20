"use client";
import { FieldCaption } from "./field-caption";
export default function PaymentGatewayPolicy({
  value,
  setValue,
  ownerAutoApproval = false,
  section = "all",
}: {
  value: any;
  section?: "all" | "checkout" | "fees" | "wallet";
  ownerAutoApproval?: boolean;
  setValue: (v: any) => void;
}) {
  const field = (
    key: string,
    label: string,
    type = "text",
    required = true,
  ) => (
    <label key={key}>
      <FieldCaption required={required}>{label}</FieldCaption>
      <input
        type={type}
        required={required}
        value={value[key] ?? ""}
        onChange={(e) =>
          setValue({
            ...value,
            [key]: type === "number" ? Number(e.target.value) : e.target.value,
          })
        }
      />
    </label>
  );
  const toggle = (key: string, label: string, required = false) => (
    <label key={key}>
      <input
        type="checkbox"
        checked={Boolean(value[key])}
        onChange={(e) => setValue({ ...value, [key]: e.target.checked })}
      />
      <FieldCaption required={required}>{label}</FieldCaption>
    </label>
  );
  return (
    <div className="stack">
      {(section === "all" || section === "checkout") && (
        <>
          <p role="note">
            Sandbox only. Live payments remain disabled. No API keys belong in
            this form.{" "}
            {ownerAutoApproval
              ? "Admin submissions are approved automatically. Merchant verification and payment activation checks still apply."
              : "Changes require independent approval from authorised Admin and Inventory staff."}
          </p>
          {toggle("enabled", "Enable approved sandbox checkout")}
          {field(
            "merchantApprovalReference",
            "Merchant configuration and approval reference",
            "text",
            Boolean(value.enabled),
          )}
          <label>
            <FieldCaption required={Boolean(value.enabled)}>
              Paystack dashboard automatic fee collection
            </FieldCaption>
            <select
              value={value.providerAutomaticFees}
              onChange={(e) =>
                setValue({ ...value, providerAutomaticFees: e.target.value })
              }
            >
              <option value="unknown">Not verified — activation blocked</option>
              <option value="off">Verified OFF — avoid double charging</option>
            </select>
          </label>
          {toggle(
            "passThroughApproved",
            "Customer fee pass-through independently verified and permitted",
            Boolean(value.enabled && value.fee?.bearer === "customer"),
          )}
          <fieldset>
            <legend>
              <FieldCaption required={Boolean(value.enabled)}>
                Approved payment channels
              </FieldCaption>
            </legend>
            {["card", "bank", "ussd", "bank_transfer"].map((c) => (
              <label key={c}>
                <input
                  type="checkbox"
                  checked={value.channels?.includes(c) ?? false}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      channels: e.target.checked
                        ? [...value.channels, c]
                        : value.channels.filter((v: string) => v !== c),
                    })
                  }
                />
                {c.replaceAll("_", " ")}
              </label>
            ))}
          </fieldset>
          {field(
            "quoteLifetimeSeconds",
            "Fee quote lifetime (seconds)",
            "number",
          )}
        </>
      )}
      {(section === "all" || section === "fees") && (
        <>
          {!value.fee ? (
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                setValue({
                  ...value,
                  fee: {
                    version: 1,
                    currency: "NGN",
                    percentageBps: 0,
                    fixedKobo: 0,
                    fixedWaivedBelowKobo: 0,
                    capKobo: null,
                    rounding: "ceil",
                    maximumGrossKobo: 10000000,
                    bearer: "merchant",
                  },
                })
              }
            >
              Enter a merchant-approved fee schedule
            </button>
          ) : (
            <fieldset>
              <legend>
                <FieldCaption required={Boolean(value.enabled)}>
                  Fee schedule — NGN minor units (kobo)
                </FieldCaption>
              </legend>
              <p>
                Do not copy an advertised rate without merchant verification.
                The active approval version is snapshotted on each quote.
              </p>
              {[
                ["percentageBps", "Percentage in basis points (100 = 1%)"],
                ["fixedKobo", "Fixed fee (kobo)"],
                [
                  "fixedWaivedBelowKobo",
                  "Waive fixed fee below gross amount (kobo)",
                ],
                ["maximumGrossKobo", "Maximum permitted charge (kobo)"],
              ].map(([key, label]) => (
                <label key={key}>
                  <FieldCaption required={true}>{label}</FieldCaption>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={value.fee[key]}
                    onChange={(e) =>
                      setValue({
                        ...value,
                        fee: { ...value.fee, [key]: Number(e.target.value) },
                      })
                    }
                  />
                </label>
              ))}
              <label>
                <FieldCaption required={false}>
                  Fee cap (kobo); blank means uncapped
                </FieldCaption>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={value.fee.capKobo ?? ""}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      fee: {
                        ...value.fee,
                        capKobo:
                          e.target.value === "" ? null : Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
              <label>
                <FieldCaption required={true}>Fee bearer</FieldCaption>
                <select
                  value={value.fee.bearer}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      fee: { ...value.fee, bearer: e.target.value },
                    })
                  }
                >
                  <option value="merchant">EasyGas absorbs fee</option>
                  <option value="customer">
                    Customer pays disclosed fee — approval required
                  </option>
                </select>
              </label>
              <label>
                <FieldCaption required={true}>Provider rounding</FieldCaption>
                <select
                  value={value.fee.rounding}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      fee: { ...value.fee, rounding: e.target.value },
                    })
                  }
                >
                  {["ceil", "floor", "nearest"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            </fieldset>
          )}
        </>
      )}
      {(section === "all" || section === "wallet") && (
        <>
          {toggle(
            "walletFunding",
            "Enable approved closed-loop wallet funding in sandbox",
          )}
          {field(
            "walletMinimumKobo",
            "Minimum wallet funding (kobo)",
            "number",
          )}
          {field(
            "walletMaximumKobo",
            "Maximum wallet funding/balance (kobo)",
            "number",
          )}
          {toggle(
            "partialInvoices",
            "Allow partial principal collections under approved policy",
          )}
        </>
      )}
    </div>
  );
}
