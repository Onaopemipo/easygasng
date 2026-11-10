import React from "react";
/** Read-only presentation of authoritative settings; never changes policy. */
export function settingLabel(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^./, (s) => s.toUpperCase());
}
const naira = (kobo: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 }).format(kobo / 100);
export function readableSetting(value: any): string {
  if (value == null || value === "") return "Not configured";
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  if (Array.isArray(value)) return value.map(readableSetting).join(", ") || "None";
  if (typeof value === "object") return Object.entries(value).map(([key, item]) => `${settingLabel(key)}: ${readableSetting(item)}`).join(" · ");
  return String(value);
}
function Fields({ value }: { value: Record<string, any> }) {
  return <dl className="setting-summary-grid">{Object.entries(value).map(([key, item]) => <div key={key}><dt>{settingLabel(key)}</dt><dd>{readableSetting(item)}</dd></div>)}</dl>;
}
export default function SettingSummary({ value, type }: { value: any; type?: string }) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (type === "location") {
      const coverage = typeof value.coverage === "string" ? value.coverage.trim() : "";
      const known = ["name", "city", "state", "country", "active", "visible", "archived", "branchId", "coverage", "description", "displayOrder", "requiresAddressConfirmation"];
      const extra = Object.fromEntries(Object.entries(value).filter(([key]) => !known.includes(key)));
      return <div className="setting-summary setting-location">
        <div className="setting-statuses">
          <span>{value.archived ? "Archived" : value.active ? "Active location" : "Inactive location"}</span>
          <span>{value.visible ? "Shown to customers" : "Hidden from customers"}</span>
        </div>
        <dl className="setting-summary-grid">
          <div><dt>Area</dt><dd>{[value.name, value.city, value.state, value.country].filter((part, index, all) => part && all.indexOf(part) === index).join(", ") || "Not configured"}</dd></div>
          <div><dt>Fulfilment branch</dt><dd>{readableSetting(value.branchId)}</dd></div>
        </dl>
        <div className={`setting-coverage ${coverage ? "" : "needs-review"}`}>
          <strong>{coverage ? "Delivery coverage" : "Coverage boundary needs confirmation"}</strong>
          <p>{coverage || "Define and approve the service boundary before customers can order in this area."}</p>
        </div>
        <details className="setting-details"><summary>Location details</summary>
          <dl className="setting-summary-grid">
            <div><dt>Address checks</dt><dd>{value.requiresAddressConfirmation === false ? "Entire named area policy — subject to existing backend checks" : "Staff confirms each delivery address before dispatch"}</dd></div>
            <div><dt>Display position</dt><dd>{readableSetting(value.displayOrder)}</dd></div>
            <div><dt>Description</dt><dd>{readableSetting(value.description)}</dd></div>
            <div><dt>Archived</dt><dd>{value.archived ? "Yes" : "No"}</dd></div>
          </dl>
          {Object.keys(extra).length > 0 && <Fields value={extra} />}
        </details>
      </div>;
    }
    if (value.fee && "walletFunding" in value && "environment" in value) {
      const fee = value.fee;
      const advanced = Object.fromEntries(Object.entries(value).filter(([key]) => !["fee", "enabled", "walletFunding", "environment", "channels", "walletMinimumKobo", "walletMaximumKobo"].includes(key)));
      return <div className="setting-summary">
        <div className="setting-statuses"><span>Checkout · {value.enabled ? "Enabled" : "Disabled"}</span><span>Card top-ups · {value.walletFunding ? "Enabled" : "Disabled"}</span><span>{value.environment === "test" ? "Sandbox / test mode" : readableSetting(value.environment)}</span></div>
        <dl className="setting-summary-grid">
          <div><dt>Payment methods</dt><dd>{(value.channels ?? []).map((c: string) => ({ card: "Credit / debit card", bank: "Bank", ussd: "USSD", bank_transfer: "Bank transfer" })[c] ?? settingLabel(c)).join(", ") || "None enabled"}</dd></div>
          <div><dt>Processing fee paid by</dt><dd>{settingLabel(fee.bearer ?? "Not configured")}</dd></div>
          <div><dt>Configured fee</dt><dd>{typeof fee.percentageBps === "number" ? `${fee.percentageBps / 100}%` : "Not configured"}{typeof fee.fixedKobo === "number" ? ` + ${naira(fee.fixedKobo)}` : ""}</dd></div>
          <div><dt>Wallet top-up limits</dt><dd>{typeof value.walletMinimumKobo === "number" && typeof value.walletMaximumKobo === "number" ? `${naira(value.walletMinimumKobo)} – ${naira(value.walletMaximumKobo)}` : "Not configured"}</dd></div>
        </dl>
        <details className="setting-details"><summary>Fee rules and approval details</summary>
          <p>The checkout quote calculates the final processing charge using these approved rules.</p>
          <dl className="setting-summary-grid"><div><dt>Fixed fee waived below</dt><dd>{typeof fee.fixedWaivedBelowKobo === "number" ? naira(fee.fixedWaivedBelowKobo) : "Not configured"}</dd></div><div><dt>Fee cap</dt><dd>{fee.capKobo == null ? "No cap configured" : naira(fee.capKobo)}</dd></div><div><dt>Maximum payment</dt><dd>{typeof fee.maximumGrossKobo === "number" ? naira(fee.maximumGrossKobo) : "Not configured"}</dd></div></dl>
          <Fields value={Object.fromEntries(Object.entries(fee).filter(([key]) => !["bearer", "percentageBps", "fixedKobo", "fixedWaivedBelowKobo", "capKobo", "maximumGrossKobo"].includes(key)))} />
          <Fields value={advanced} />
        </details>
      </div>;
    }
    return <Fields value={value} />;
  }
  return <strong>{type === "money" && typeof value === "number" ? naira(value) : readableSetting(value)}</strong>;
}
