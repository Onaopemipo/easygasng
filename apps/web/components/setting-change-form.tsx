"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useId,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ShieldCheck,
} from "lucide-react";
import { FieldCaption } from "./field-caption";
import { FormInput } from "./password-input";
import { api, Notice, useModalClose } from "./ui";
import SettingSummary, {
  readableSetting,
  settingLabel,
} from "./setting-summary";
import { staffRoles } from "../../../packages/business-rules/src/staff-roles";
import { roleLabel } from "./admin-navigation";
import {
  settingEditorTabs,
  settingSubmission,
  settingApprovalCopy,
  settingChangeRows,
} from "../../../packages/business-rules/src/setting-editor";
import PaymentGatewayPolicy from "./payment-gateway-policy";
import {
  paymentFieldLabel,
  paymentReviewValue,
} from "../../../packages/business-rules/src/payment-editor";
import { RewardsPolicyFields } from "./rewards-policy-fields";
type Props = {
  setting: any;
  onDone: (result?: any) => void;
  requestId?: string;
  returned?: boolean;
  userId?: string;
  onBusyChange?: (busy: boolean) => void;
};
export default function SettingForm({
  setting: s,
  onDone,
  requestId,
  returned,
  userId,
  onBusyChange,
}: Props) {
  const [value, setValue] = useState<any>(
      s.value_type === "money" && s.value !== null
        ? String(Number(s.value) / 100)
        : (s.value ?? ""),
    ),
    [effectiveAt, setEffectiveAt] = useState(""),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [tab, setTab] = useState(settingEditorTabs(s.value_type)[0].id),
    [review, setReview] = useState<any>(null),
    [intent, setIntent] = useState(false),
    [needsVerification, setNeedsVerification] = useState(false),
    [password, setPassword] = useState(""),
    [account, setAccount] = useState<any>(null),
    [branches, setBranches] = useState<any[]>([]);
  const form = useRef<HTMLFormElement>(null),
    pending = useRef(false),
    live = useRef(true),
    accountRevision = useRef(0),
    prefix = useId(),
    requestClose = useModalClose(),
    policy = settingApprovalCopy(s),
    tabs = settingEditorTabs(s.value_type);
  const changeValue = (next: any) => {
    setValue(next);
    setDirty(true);
    setReview(null);
  };
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    const accountTicket = accountRevision.current;
    api("branches")
      .then((rows) => {
        if (active) setBranches(rows);
      })
      .catch(() => {});
    if (s.value_type === "access" && s.value?.userId)
      api("staff.lookup?userId=" + encodeURIComponent(s.value.userId))
        .then((row) => {
          if (active && accountTicket === accountRevision.current)
            setAccount(row);
        })
        .catch(() => {
          if (active && accountTicket === accountRevision.current)
            setError(
              "This account could not be loaded. Find an active account to continue.",
            );
        });
    return () => {
      active = false;
    };
  }, [s.scope, s.value_type, s.value?.userId]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (tab === "review")
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>(
            needsVerification ? ".sc-verification input" : ".sc-review h3",
          )
          ?.focus(),
      );
  }, [tab, needsVerification]);
  useEffect(() => {
    if (error)
      form.current
        ?.querySelector(".sc-error")
        ?.scrollIntoView({ block: "nearest" });
  }, [error]);
  function beginReview(draft = false) {
    if (pending.current) return;
    setError("");
    if (s.value_type === "payment_gateway" && value.enabled && !value.fee) {
      setError("Configure a verified fee schedule before enabling checkout.");
      setTab("fees");
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLButtonElement>(
            '[data-value-section="fees"] button',
          )
          ?.focus(),
      );
      return;
    }
    const invalid = Array.from(
      form.current?.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >(
        "[data-value-section] input,[data-value-section] select,[data-value-section] textarea,[data-common-field]",
      ) || [],
    ).find((field) => !field.checkValidity());
    if (invalid) {
      const section = invalid.closest<HTMLElement>("[data-value-section]");
      setTab(section?.dataset.valueSection || tabs[0].id);
      invalid.closest("details")?.setAttribute("open", "");
      requestAnimationFrame(() => {
        invalid.focus();
        invalid.reportValidity();
      });
      return;
    }
    if (
      s.value_type === "access" &&
      (!account ||
        account.id !== value.userId ||
        !account.active ||
        account.id === userId)
    ) {
      setError("Choose an existing active account other than your own.");
      setTab(tabs[0].id);
      return;
    }
    try {
      const submission = settingSubmission(
        s,
        value,
        reason,
        effectiveAt,
        draft,
        requestId,
        returned,
      );
      setIntent(draft);
      setReview(submission);
      setTab("review");
    } catch (e: any) {
      setError(e.message);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (tab !== "review" || !review) {
      beginReview(false);
      return;
    }
    if (pending.current) return;
    if (needsVerification && !password) {
      setError("Enter your current password to confirm this change.");
      return;
    }
    pending.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      if (needsVerification) {
        await api("reauth", { password });
        if (!live.current) return;
        setPassword("");
        setNeedsVerification(false);
      }
      const result = await api(review.action, review.body);
      if (!live.current) return;
      setDirty(false);
      onDone(result);
    } catch (e: any) {
      if (live.current) {
        setError(e.message);
        if (e.code === "REAUTH_REQUIRED") setNeedsVerification(true);
      }
    } finally {
      pending.current = false;
      if (live.current) setBusy(false);
      onBusyChange?.(false);
    }
  }
  function chooseTab(id: string) {
    if (busy) return;
    if (id === "review") {
      beginReview(intent);
      return;
    }
    setPassword("");
    setTab(id);
  }
  function tabKey(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % (tabs.length + 1);
    else if (e.key === "ArrowLeft")
      next = (index + tabs.length) % (tabs.length + 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length;
    else return;
    e.preventDefault();
    const target = [...tabs, { id: "review", label: "Review" }][next];
    chooseTab(target.id);
    if (target.id !== "review" || review)
      requestAnimationFrame(() =>
        document.getElementById(prefix + "-" + target.id)?.focus(),
      );
  }
  const branchName = branches.find((b) => b.id === s.scope)?.name || s.scope;
  const valueFields = (
    <>
      {" "}
      {s.value_type === "boolean" ? (
        <label>
          <FieldCaption required={true}>Proposed value</FieldCaption>
          <select
            value={String(value)}
            onChange={(e) => changeValue(e.target.value === "true")}
          >
            <option value="false">Disabled</option>
            <option value="true">Enabled</option>
          </select>
        </label>
      ) : s.value_type === "referral_review" ? (
        <div className="testimonial-form">
          <label>
            <FieldCaption required={true}>Attribution ID</FieldCaption>
            <FormInput
              required
              value={value.attributionId}
              onChange={(e) =>
                changeValue({ ...value, attributionId: e.target.value })
              }
            />
          </label>
          <label>
            <FieldCaption required={true}>Decision</FieldCaption>
            <select
              value={value.state}
              onChange={(e) => changeValue({ ...value, state: e.target.value })}
            >
              <option value="held">Hold for review</option>
              <option value="cleared">Clear</option>
              <option value="blocked">Block</option>
            </select>
          </label>
          <label>
            <FieldCaption required={true}>Evidence and reason</FieldCaption>
            <textarea
              required
              minLength={10}
              value={value.reason}
              onChange={(e) =>
                changeValue({ ...value, reason: e.target.value })
              }
            />
          </label>
          <p>Shared addresses alone are not fraud evidence.</p>
        </div>
      ) : s.value_type === "rewards_adjustment" ? (
        <div className="testimonial-form">
          <label>
            <FieldCaption required={true}>Customer ID</FieldCaption>
            <FormInput
              required
              value={value.customerId}
              onChange={(e) =>
                changeValue({ ...value, customerId: e.target.value })
              }
            />
          </label>
          <label>
            <FieldCaption required={true}>
              Points to add or reverse
            </FieldCaption>
            <FormInput
              required
              type="number"
              step="1"
              min="-1000000"
              max="1000000"
              value={value.points}
              onChange={(e) =>
                changeValue({ ...value, points: Number(e.target.value) })
              }
            />
          </label>
          <label>
            <FieldCaption required={true}>Adjustment reason</FieldCaption>
            <textarea
              required
              minLength={10}
              value={value.reason}
              onChange={(e) =>
                changeValue({ ...value, reason: e.target.value })
              }
            />
          </label>
          <label>
            <FieldCaption required={true}>Evidence reference</FieldCaption>
            <textarea
              required
              minLength={10}
              value={value.evidence}
              onChange={(e) =>
                changeValue({ ...value, evidence: e.target.value })
              }
            />
          </label>
          <p>
            This posts an immutable point correction; monetary purchase credit
            is unaffected.
          </p>
        </div>
      ) : s.value_type === "rewards_policy" ? (
        <div className="testimonial-form">
          {[
            ["earningEnabled", "Enable earning"],
            ["redemptionEnabled", "Enable checkout discounts"],
            ["referralEnabled", "Enable first-purchase referral bonus"],
          ].map(([k, label]) => (
            <label key={k}>
              <FormInput
                type="checkbox"
                checked={!!value[k]}
                onChange={(e) =>
                  changeValue({ ...value, [k]: e.target.checked })
                }
              />
              <FieldCaption required={false}>{label}</FieldCaption>
            </label>
          ))}
          {[
            ["spendPerPointKobo", "Eligible spend per point (kobo)"],
            ["discountPerPointKobo", "Discount per point (kobo)"],
            ["minimumPoints", "Minimum points per checkout"],
            ["referralPoints", "Points per first qualifying referral"],
            [
              "maximumDiscountBps",
              "Maximum discount (basis points; 2000 = 20%)",
            ],
          ].map(([k, label]) => (
            <label key={k}>
              <FieldCaption required={true}>{label}</FieldCaption>
              <FormInput
                required
                type="number"
                min={k === "referralPoints" ? 0 : 1}
                step="1"
                value={value[k]}
                onChange={(e) =>
                  changeValue({ ...value, [k]: Number(e.target.value) })
                }
              />
            </label>
          ))}
          <label>
            <FieldCaption required={true}>
              Eligible product categories (comma separated)
            </FieldCaption>
            <FormInput
              required
              value={value.eligibleCategories.join(", ")}
              onChange={(e) =>
                changeValue({
                  ...value,
                  eligibleCategories: e.target.value
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <p>
            Rates and programme activation remain subject to the current
            business controls. Technical issuance and redemption flags remain
            off until acceptance. Delivery fees, expiry, tiers, referral bonuses
            and services are excluded.
          </p>
        </div>
      ) : s.value_type === "document_identity" ? (
        <div className="stack">
          <Notice message="Enter verified business details. Empty optional legal fields are omitted. Changes affect newly issued documents only." />
          {[
            ["legalName", "Legal business name", true],
            ["address", "Registered / business address", true],
            ["phone", "Business phone", true],
            ["email", "Verified email (optional)", false],
            ["website", "Verified HTTPS website (optional)", false],
            [
              "registrationNumber",
              "Verified RC / registration number (optional)",
              false,
            ],
            ["taxId", "Verified tax identifier (optional)", false],
            ["verificationReference", "Verification evidence reference", true],
          ].map(([key, label, required]) => (
            <label key={String(key)}>
              <FieldCaption required={Boolean(required)}>
                {String(label)}
              </FieldCaption>
              <FormInput
                value={value?.[String(key)] ?? ""}
                required={Boolean(required)}
                maxLength={250}
                onChange={(e) => {
                  changeValue({
                    ...Object.fromEntries(
                      [
                        "legalName",
                        "address",
                        "phone",
                        "email",
                        "website",
                        "registrationNumber",
                        "taxId",
                        "verificationReference",
                      ].map((k) => [k, value?.[k] ?? ""]),
                    ),
                    [String(key)]: e.target.value,
                  });
                  setDirty(true);
                }}
              />
            </label>
          ))}
          <section className="surface">
            <h3>Unapproved identity preview</h3>
            <strong>
              {value?.legalName || "Business name not configured"}
            </strong>
            <p>{value?.address}</p>
            <p>{value?.phone}</p>
            <p>{value?.email}</p>
            <p>{value?.website}</p>
            {value?.registrationNumber && <p>RC: {value.registrationNumber}</p>}
            {value?.taxId && <p>TIN: {value.taxId}</p>}
            <p>
              This preview is not an issued document or proof of legal/tax
              compliance.
            </p>
          </section>
        </div>
      ) : s.value_type === "website_content" ? (
        <div className="testimonial-form">
          {Object.entries(value).map(([key, v]) => (
            <label key={key}>
              <FieldCaption required={key !== "email"}>
                {key.replace(/([A-Z])/g, " $1")}
              </FieldCaption>
              <FormInput
                required={key !== "email"}
                value={String(v)}
                onChange={(e) =>
                  changeValue({ ...value, [key]: e.target.value })
                }
              />
            </label>
          ))}
          <p>
            Use verified business information. An independent owner must approve
            this proposal. Prices and delivery coverage are managed separately.
          </p>
        </div>
      ) : s.value_type === "testimonial_policy" ? (
        <div className="testimonial-form">
          <label>
            <FormInput
              type="checkbox"
              checked={value.imagesEnabled}
              onChange={(e) =>
                changeValue({ ...value, imagesEnabled: e.target.checked })
              }
            />
            <FieldCaption required={false}>
              Allow separately consented customer photos
            </FieldCaption>
          </label>
          <label>
            <FormInput
              type="checkbox"
              checked={value.enabled}
              onChange={(e) =>
                changeValue({ ...value, enabled: e.target.checked })
              }
            />
            <FieldCaption required={false}>
              {" "}
              Enable customer testimonials
            </FieldCaption>
          </label>
          {[
            ["minimumLength", "Minimum characters", 20, 500],
            ["maximumLength", "Maximum characters", 100, 2000],
            ["publishedLimit", "Maximum public testimonials", 1, 30],
            ["dailyLimit", "Daily submissions per customer", 1, 10],
            [
              "retentionDays",
              "Retention review after days (no automatic deletion)",
              90,
              3650,
            ],
            ["photoMaxMb", "Maximum photo size in MB", 1, 8],
          ].map(([key, label, min, max]) => (
            <label key={String(key)}>
              <FieldCaption required={true}>{String(label)}</FieldCaption>
              <FormInput
                type="number"
                min={Number(min)}
                max={Number(max)}
                required
                value={
                  value[String(key)] ??
                  (key === "retentionDays"
                    ? 730
                    : key === "photoMaxMb"
                      ? 8
                      : "")
                }
                onChange={(e) =>
                  changeValue({
                    ...value,
                    [String(key)]: Number(e.target.value),
                  })
                }
              />
            </label>
          ))}
          <label>
            <FormInput
              type="checkbox"
              checked={value.notificationsEnabled ?? true}
              onChange={(e) =>
                changeValue({
                  ...value,
                  notificationsEnabled: e.target.checked,
                })
              }
            />
            <FieldCaption required={false}>
              Enable in-app testimonial notifications
            </FieldCaption>
          </label>
          <fieldset>
            <legend>
              <FieldCaption required={true}>
                Accepted photo formats (choose at least one)
              </FieldCaption>
            </legend>
            {["image/jpeg", "image/png", "image/webp"].map((format) => (
              <label key={format}>
                <FormInput
                  type="checkbox"
                  checked={(
                    value.photoFormats ?? [
                      "image/jpeg",
                      "image/png",
                      "image/webp",
                    ]
                  ).includes(format)}
                  onChange={(e) => {
                    const current = value.photoFormats ?? [
                      "image/jpeg",
                      "image/png",
                      "image/webp",
                    ];
                    changeValue({
                      ...value,
                      photoFormats: e.target.checked
                        ? [...current, format]
                        : current.filter((f: string) => f !== format),
                    });
                  }}
                />
                <FieldCaption required={false}>{format}</FieldCaption>
              </label>
            ))}
          </fieldset>
          <p>
            Moderation and explicit consent are mandatory. Photos require
            separate consent and are removed from public access when feedback is
            withdrawn.
          </p>
        </div>
      ) : s.value_type === "payment_gateway" ? (
        <PaymentGatewayPolicy value={value} setValue={changeValue} />
      ) : s.value_type === "dispatch_routing" ? (
        <div className="stack">
          <label>
            <FormInput
              type="checkbox"
              checked={Boolean(value.enabled)}
              onChange={(e) =>
                changeValue({ ...value, enabled: e.target.checked })
              }
            />
            <FieldCaption required={false}>
              {" "}
              Enable independently approved road planning
            </FieldCaption>
          </label>
          {[
            ["fuelKoboPerLitre", "Fuel cost per litre (kobo)"],
            ["operatingKoboPerKm", "Other operating cost per kilometre (kobo)"],
            ["stopMinutes", "Allowance per stop (minutes)"],
            ["maxSnapMetres", "Maximum road snap distance (metres)"],
          ].map(([key, label]) => (
            <label key={key}>
              <FieldCaption required={Boolean(value.enabled)}>
                {label}
              </FieldCaption>
              <FormInput
                type="number"
                min="0"
                step="any"
                value={value[key] ?? ""}
                onChange={(e) =>
                  changeValue({
                    ...value,
                    [key]:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </label>
          ))}
          <p>
            A trusted routing processor, verified destination pins, recent
            consented GPS and an explicit vehicle fuel rate are also required.
            Estimates never change customer delivery fees.
          </p>
        </div>
      ) : s.value_type === "crm_retention" ? (
        <div className="stack">
          <label>
            <FormInput
              type="checkbox"
              checked={Boolean(value.enabled)}
              onChange={(e) =>
                changeValue({ ...value, enabled: e.target.checked })
              }
            />
            <FieldCaption required={false}>
              {" "}
              Enable approved win-back messaging
            </FieldCaption>
          </label>
          {[
            ["atRiskDays", "At-risk threshold (days)"],
            ["dormantDays", "Dormant threshold (days)"],
            ["monthlyBudgetKobo", "Monthly message budget (kobo)"],
            [
              "costCeilingPerMessageKobo",
              "Conservative cost ceiling per message (kobo)",
            ],
          ].map(([key, label]) => (
            <label key={key}>
              <FieldCaption required={true}>{label}</FieldCaption>
              <FormInput
                type="number"
                min={0}
                value={value[key]}
                onChange={(e) =>
                  changeValue({ ...value, [key]: Number(e.target.value) })
                }
                required
              />
            </label>
          ))}
          <p>
            Messaging is disabled by default. Marketing consent is separate from
            transactional consent.
          </p>
        </div>
      ) : [
          "vehicle_return_recovery",
          "vehicle_payload",
          "service_material_recovery",
        ].includes(s.value_type) ? (
        <div className="stack">
          <Notice message="Exact operational evidence for independent approval. Submit a new request if counts, capacity or evidence change." />
          <SettingSummary value={value} type={s.value_type} />
        </div>
      ) : s.value_type === "inventory_operation" ? (
        <Notice message="This is a one-time operation. Its recorded stock count, costs and evidence are reviewed below. To change business details, cancel it and create a new operation." />
      ) : s.value_type === "inventory_valuation" ? (
        <label>
          <FieldCaption required={true}>Valuation method</FieldCaption>
          <select value={value} onChange={(e) => changeValue(e.target.value)}>
            <option value="unconfigured">Unconfigured</option>
            <option value="weighted_average">
              Weighted average of complete recorded acquisition costs
            </option>
          </select>
        </label>
      ) : s.value_type === "gas_policy" ? (
        <>
          {["minimumKg", "maximumKg", "incrementKg", "precision"].map((k) => (
            <label key={k}>
              <FieldCaption required={false}>
                {
                  {
                    minimumKg: "Minimum quantity (kg)",
                    maximumKg: "Maximum quantity (kg)",
                    incrementKg: "Quantity increment (kg)",
                    precision: "Decimal places",
                  }[k]
                }
              </FieldCaption>
              <FormInput
                type="number"
                step={k === "precision" ? "1" : "0.001"}
                value={value[k] ?? ""}
                onChange={(e) =>
                  changeValue({
                    ...value,
                    [k]: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </label>
          ))}
          <p>Fill in all gas limits before opening gas ordering.</p>
          <label>
            <FieldCaption required={true}>
              Supported cylinder capacities (kg, comma separated)
            </FieldCaption>
            <FormInput
              defaultValue={value.capacitiesKg.join(", ")}
              onChange={(e) =>
                changeValue({
                  ...value,
                  capacitiesKg: e.target.value.split(",").map(Number),
                })
              }
            />
          </label>
        </>
      ) : s.value_type === "location" ? (
        <>
          {["name", "city", "state", "country", "coverage", "description"].map(
            (k) => (
              <label key={k}>
                <FieldCaption
                  required={k !== "description" && k !== "coverage"}
                >
                  {k === "coverage"
                    ? "Confirmed delivery boundary"
                    : k.charAt(0).toUpperCase() + k.slice(1)}
                </FieldCaption>
                <FormInput
                  value={value[k]}
                  aria-describedby={
                    k === "coverage" ? "delivery-boundary-help" : undefined
                  }
                  onChange={(e) =>
                    changeValue({ ...value, [k]: e.target.value })
                  }
                />
                {k === "coverage" && (
                  <small id="delivery-boundary-help">
                    Required before customers can order for this area.
                  </small>
                )}
              </label>
            ),
          )}
          <label>
            <FieldCaption required={true}>
              Delivery coverage handling
            </FieldCaption>
            <select
              value={String(value.requiresAddressConfirmation ?? true)}
              onChange={(e) =>
                changeValue({
                  ...value,
                  requiresAddressConfirmation: e.target.value === "true",
                })
              }
            >
              <option value="true">
                Staff confirms each actual address before dispatch
              </option>
              <option value="false">
                Owner-approved coverage of the entire named area
              </option>
            </select>
          </label>
          <label>
            Fulfilment branch
            <FormInput value={value.branchId} readOnly />
          </label>
          <label>
            <FieldCaption required={true}>Display order</FieldCaption>
            <FormInput
              type="number"
              min="0"
              value={value.displayOrder}
              onChange={(e) =>
                changeValue({ ...value, displayOrder: Number(e.target.value) })
              }
            />
          </label>
          {["active", "visible", "archived"].map((k) => (
            <label key={k}>
              <FieldCaption required={true}>{k}</FieldCaption>
              <select
                value={String(value[k])}
                onChange={(e) =>
                  changeValue({ ...value, [k]: e.target.value === "true" })
                }
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
          ))}
        </>
      ) : s.value_type === "bank" ? (
        <>
          {[
            ["bank", "Bank name"],
            ["account", "Account number"],
            ["name", "Account holder"],
          ].map(([key, label]) => (
            <label key={key}>
              <FieldCaption required={true}>{label}</FieldCaption>
              <FormInput
                value={value?.[key] ?? ""}
                onChange={(e) =>
                  changeValue({ ...value, [key]: e.target.value })
                }
                required
                maxLength={100}
              />
            </label>
          ))}
        </>
      ) : s.value_type === "access" ? (
        <AccessFields
          value={value}
          onChange={changeValue}
          scope={s.scope}
          userId={userId}
          account={account}
          onAccount={(row) => {
            accountRevision.current++;
            setAccount(row);
          }}
          branches={branches}
        />
      ) : (
        <label>
          <FieldCaption required={true}>
            Proposed {s.value_type === "money" ? "amount (₦)" : "value"}
          </FieldCaption>
          <FormInput
            value={value}
            onChange={(e) =>
              changeValue(
                s.value_type === "integer"
                  ? e.target.value === ""
                    ? ""
                    : Number(e.target.value)
                  : e.target.value,
              )
            }
            type={
              ["money", "integer"].includes(s.value_type) ? "number" : "text"
            }
            min={
              s.value_type === "money"
                ? Number(s.minimum ?? 0) / 100
                : undefined
            }
            max={
              s.value_type === "money"
                ? Number(s.maximum ?? 100000000) / 100
                : undefined
            }
            step={s.value_type === "money" ? "0.01" : undefined}
            required
          />
        </label>
      )}
    </>
  );
  const panes =
    s.value_type === "payment_gateway"
      ? tabs.map((t) => ({
          ...t,
          node: (
            <PaymentGatewayPolicy
              value={value}
              setValue={changeValue}
              section={t.id as any}
            />
          ),
        }))
      : s.value_type === "rewards_policy"
        ? [
            { ...tabs[0], node: valueFields },
            {
              ...tabs[1],
              node: (
                <RewardsPolicyFields
                  value={value}
                  onChange={changeValue}
                  section="services"
                />
              ),
            },
            {
              ...tabs[2],
              node: (
                <RewardsPolicyFields
                  value={value}
                  onChange={changeValue}
                  section="offers"
                />
              ),
            },
          ]
        : [{ ...tabs[0], node: valueFields }];
  const rows = review
    ? settingChangeRows(
        s.value_type === "money" ? s.value : s.value,
        review.body.value,
      )
    : [];
  const readable = (v: any, path: string) =>
    s.value_type === "payment_gateway"
      ? paymentReviewValue(path, v)
      : s.value_type === "money" && typeof v === "number"
        ? new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
          }).format(v / 100)
        : readableSetting(v);
  return (
    <form
      ref={form}
      className="sc-form"
      noValidate
      data-unsaved={dirty}
      data-submit-pending={busy}
      aria-busy={busy}
      onSubmit={submit}
      onChange={() => setDirty(true)}
    >
      <div className="sc-context">
        <span>
          {branchName} <span aria-hidden="true">·</span>{" "}
          {requestId ? "Draft based on" : "Current"} version {s.version}
        </span>
        <span className="sc-policy">
          <ShieldCheck size={14} />
          {policy.label}
        </span>
      </div>
      <div role="tablist" aria-label="Setting change steps" className="sc-tabs">
        {[...tabs, { id: "review", label: "Review" }].map((t, i) => (
          <button
            key={t.id}
            id={prefix + "-" + t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={prefix + "-panel-" + t.id}
            tabIndex={tab === t.id ? 0 : -1}
            disabled={busy}
            onClick={() => chooseTab(t.id)}
            onKeyDown={(e) => tabKey(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="sc-body">
        {panes.map((p) => (
          <section
            key={p.id}
            role="tabpanel"
            id={prefix + "-panel-" + p.id}
            aria-labelledby={prefix + "-" + p.id}
            hidden={tab !== p.id}
            data-value-section={p.id}
          >
            <fieldset disabled={busy} className="sc-fields">
              {p.node}
            </fieldset>
          </section>
        ))}
        {tab !== "review" && (
          <div className="sc-common">
            <label>
              <FieldCaption required>Reason for change</FieldCaption>
              <textarea
                data-common-field
                required
                minLength={5}
                maxLength={1000}
                rows={2}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setReview(null);
                }}
                placeholder="Briefly explain why this change is needed."
                disabled={busy}
              />
            </label>
            <details className="sc-schedule">
              <summary>
                <CalendarDays size={15} />{" "}
                {effectiveAt
                  ? "Scheduled: " + effectiveAt
                  : "Schedule for later"}{" "}
                <span>Optional</span>
              </summary>
              <label>
                <FieldCaption required={false}>
                  Effective date · Lagos time
                </FieldCaption>
                <FormInput
                  data-common-field
                  type="date"
                  value={effectiveAt}
                  onChange={(e) => {
                    setEffectiveAt(e.target.value);
                    setReview(null);
                  }}
                />
              </label>
              <p>
                The change takes effect at the start of this day in Lagos, after
                approvals and activation checks pass.
              </p>
            </details>
          </div>
        )}
        {tab === "review" && review && (
          <section
            role="tabpanel"
            id={prefix + "-panel-review"}
            aria-labelledby={prefix + "-review"}
            className="sc-review"
          >
            <h3 tabIndex={-1}>
              {intent
                ? "Review draft"
                : requestId
                  ? "Review revised draft"
                  : "Review change"}
            </h3>
            {s.value_type === "access" ? (
              <dl className="sc-review-grid">
                <div>
                  <dt>Account</dt>
                  <dd>
                    {account?.name}
                    <small>{account?.email}</small>
                  </dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>
                    {roleLabel(account?.role || "customer")}{" "}
                    <ArrowRight size={13} /> {roleLabel(value.role)}
                  </dd>
                </div>
                <div>
                  <dt>Assigned branch</dt>
                  <dd>{branchName}</dd>
                </div>
              </dl>
            ) : (
              <>
                <div className="sc-change-list">
                  {rows.slice(0, 12).map((r, i) => (
                    <div key={i}>
                      <strong>
                        {s.value_type === "payment_gateway"
                          ? paymentFieldLabel(r.path)
                          : settingLabel(r.path)}
                      </strong>
                      <span>{readable(r.before, r.path)}</span>
                      <ArrowRight size={14} />
                      <span>{readable(r.after, r.path)}</span>
                    </div>
                  ))}
                  {!rows.length && <p>The configured value is unchanged.</p>}
                </div>
                {(typeof review.body.value === "object" ||
                  rows.length > 12) && (
                  <details className="sc-full-value">
                    <summary>Full proposed configuration</summary>
                    <SettingSummary
                      value={review.body.value}
                      type={s.value_type}
                    />
                  </details>
                )}
              </>
            )}
            <dl className="sc-review-grid">
              <div>
                <dt>Reason</dt>
                <dd>{review.body.reason}</dd>
              </div>
              <div>
                <dt>When</dt>
                <dd>
                  {intent || requestId
                    ? "Inactive draft"
                    : effectiveAt
                      ? "From " + effectiveAt + " (Lagos)"
                      : "After required approvals and checks"}
                </dd>
              </div>
            </dl>
            <p className="sc-review-note">
              {intent
                ? "This saves an inactive draft. It will not apply or enter the approval queue."
                : requestId
                  ? "This updates the saved request. Existing submission and approval controls still apply."
                  : policy.detail}
            </p>
            {needsVerification && (
              <div className="sc-verification">
                <h4>Confirm it’s you</h4>
                <p>
                  Enter your password to{" "}
                  {intent ? "save this draft" : "submit this change"}. Your
                  proposed changes are preserved.
                </p>
                <label>
                  <FieldCaption required>Current password</FieldCaption>
                  <FormInput
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                  />
                </label>
              </div>
            )}
          </section>
        )}
        {error && (
          <div className="sc-error" role="alert">
            <Notice message={error} type="error" />
          </div>
        )}
      </div>
      <footer className="sc-footer">
        <span className="sc-footer-note" role="status">
          {busy
            ? "Submitting — please keep this window open."
            : tab === "review"
              ? intent
                ? "Draft stays inactive"
                : policy.label
              : "Changes are reviewed before submission"}
        </span>
        <div>
          {tab === "review" ? (
            <button
              className="button secondary"
              type="button"
              disabled={busy}
              onClick={() => {
                setPassword("");
                setTab(tabs[0].id);
              }}
            >
              <ArrowLeft size={15} />
              Back
            </button>
          ) : (
            <button
              className="button secondary"
              type="button"
              disabled={busy}
              onClick={() => void requestClose?.()}
            >
              Cancel
            </button>
          )}
          {tab !== "review" && !requestId && (
            <button
              className="button secondary sc-draft"
              type="button"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                beginReview(true);
              }}
            >
              Save draft
            </button>
          )}
          {tab === "review" ? (
            <button
              key="confirm-submission"
              type="submit"
              className="button"
              disabled={busy}
            >
              {busy
                ? "Submitting…"
                : needsVerification
                  ? intent
                    ? "Verify & save draft"
                    : "Verify & submit"
                  : intent || requestId
                    ? "Save draft"
                    : s.owner_auto_approval || s.risk === 1
                      ? "Save changes"
                      : "Submit for approval"}
              <Check size={16} />
            </button>
          ) : (
            <button
              key="review-change"
              type="button"
              className="button"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                beginReview(false);
              }}
            >
              Review change
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </footer>
    </form>
  );
}
function AccessFields({
  value,
  onChange,
  scope,
  userId,
  account,
  onAccount,
  branches,
}: {
  value: any;
  onChange: (v: any) => void;
  scope: string;
  userId?: string;
  account: any;
  onAccount: (v: any) => void;
  branches: any[];
}) {
  const [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null),
    sequence = useRef(0);
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );
  async function find() {
    if (busy || !input.current?.reportValidity() || !email.trim()) return;
    const ticket = ++sequence.current;
    setBusy(true);
    setError("");
    try {
      const row = await api(
        "staff.lookup?email=" + encodeURIComponent(email.trim()),
      );
      if (ticket !== sequence.current) return;
      if (!row.active)
        throw Error("This account is inactive. Choose an active account.");
      if (row.id === userId)
        throw Error("You cannot request changes to your own access.");
      onAccount(row);
      onChange({ ...value, userId: row.id, role: row.role, branchId: scope });
    } catch (e: any) {
      if (ticket === sequence.current) setError(e.message);
    } finally {
      if (ticket === sequence.current) setBusy(false);
    }
  }
  return (
    <div className="sc-access-fields">
      {account ? (
        <div className="sc-account">
          <span className="sc-avatar">{account.name?.slice(0, 1)}</span>
          <div>
            <strong>{account.name}</strong>
            <small>{account.email}</small>
          </div>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              sequence.current++;
              onAccount(null);
              onChange({ ...value, userId: "" });
              setError("");
            }}
          >
            Change
          </button>
        </div>
      ) : (
        <div className="sc-account-search">
          <label>
            <FieldCaption required>Account email</FieldCaption>
            <FormInput
              ref={input}
              type="email"
              value={email}
              onChange={(e) => {
                sequence.current++;
                setEmail(e.target.value);
                setBusy(false);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void find();
                }
              }}
              placeholder="name@example.com"
            />
          </label>
          <button
            type="button"
            className="button secondary"
            disabled={busy || !email.trim()}
            onClick={() => void find()}
          >
            {busy ? "Finding…" : "Find account"}
          </button>
          <p>Find an existing account to update its role.</p>
        </div>
      )}
      {error && (
        <p className="sc-lookup-error" role="alert">
          {error}
        </p>
      )}
      <label>
        <FieldCaption required>Assigned role</FieldCaption>
        <select
          value={value.role}
          disabled={!account}
          onChange={(e) => onChange({ ...value, role: e.target.value })}
        >
          <optgroup label="Staff roles">
            {staffRoles.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </optgroup>
          <optgroup label="Customer access">
            <option value="customer">Customer account only</option>
            <option value="commercial">Commercial customer only</option>
          </optgroup>
        </select>
      </label>
      <label>
        <FieldCaption required>Assigned branch</FieldCaption>
        <FormInput
          readOnly
          value={branches.find((b) => b.id === scope)?.name || scope}
        />
        <small>This request applies to this branch.</small>
      </label>
    </div>
  );
}
