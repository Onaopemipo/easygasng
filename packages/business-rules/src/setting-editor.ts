import { effectiveDateInLagos } from "./effective-date";
export type SettingEditorTab = { id: string; label: string };
export function settingEditorTabs(type: string): SettingEditorTab[] {
  if (type === "payment_gateway")
    return [
      { id: "checkout", label: "Checkout" },
      { id: "fees", label: "Fees" },
      { id: "wallet", label: "Wallet" },
    ];
  if (type === "rewards_policy")
    return [
      { id: "points", label: "Points" },
      { id: "services", label: "Services" },
      { id: "offers", label: "Offers" },
    ];
  return [{ id: "details", label: "Details" }];
}
export function settingAmount(
  raw: unknown,
  minimum?: number,
  maximum?: number,
) {
  const text = String(raw).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text))
    throw Error("Enter a naira amount with up to two decimal places.");
  const [whole, decimal = ""] = text.split("."),
    amount = BigInt(whole) * 100n + BigInt(decimal.padEnd(2, "0"));
  if (amount > BigInt(Number.MAX_SAFE_INTEGER))
    throw Error("This amount is too large.");
  const value = Number(amount);
  if (
    (minimum != null && value < minimum) ||
    (maximum != null && value > maximum)
  )
    throw Error("Enter an amount within the permitted range.");
  return value;
}
export function settingSubmission(
  s: any,
  value: any,
  reason: string,
  date: string,
  draft: boolean,
  requestId?: string,
  returned = false,
) {
  if (reason.trim().length < 5)
    throw Error("Explain the change in at least five characters.");
  const proposed =
    s.value_type === "money"
      ? settingAmount(value, s.minimum, s.maximum)
      : value;
  const scheduled = date ? { effectiveAt: effectiveDateInLagos(date) } : {};
  return requestId
    ? {
        action: returned ? "approval.revise" : "approval.edit",
        body: {
          id: requestId,
          value: proposed,
          reason: reason.trim(),
          ...scheduled,
        },
      }
    : {
        action: "setting.propose",
        body: {
          key: s.key,
          scope: s.scope,
          value: proposed,
          version: s.version,
          reason: reason.trim(),
          draft,
          ...scheduled,
        },
      };
}
export function settingApprovalCopy(s: any) {
  if (s.owner_auto_approval)
    return {
      label: "Automatic approval",
      detail:
        "Admin approval is automatic. Identity, scheduling and activation checks still apply.",
    };
  if (s.risk === 1)
    return {
      label: "Routine change",
      detail:
        "Applies immediately after successful submission, with an audit record.",
    };
  return {
    label: s.risk === 4 ? "2 approvals required" : "Approval required",
    detail:
      s.risk === 4
        ? s.value_type === "access"
          ? "Two independent eligible approvals are required. You cannot approve your own access change."
          : "Two independent eligible approvals are required. The current configuration stays active until approval and activation checks pass."
        : "The current value stays active until the required independent review and activation checks pass.",
  };
}
export function settingChangeRows(
  before: any,
  after: any,
  prefix = "",
): Array<{ path: string; before: any; after: any }> {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (
    before &&
    after &&
    typeof before === "object" &&
    typeof after === "object" &&
    !Array.isArray(before) &&
    !Array.isArray(after)
  )
    return [
      ...new Set([...Object.keys(before), ...Object.keys(after)]),
    ].flatMap((key) =>
      settingChangeRows(
        before[key],
        after[key],
        prefix ? prefix + "." + key : key,
      ),
    );
  return [{ path: prefix || "Value", before, after }];
}
