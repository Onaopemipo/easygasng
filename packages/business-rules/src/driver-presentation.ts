import { driverContact } from "./dispatch-centre";
import { assignmentLabel } from "./driver-experience";

/** Presentation over existing scoped API responses; never delivery authority. */
export function driverMetric(value: unknown, confirmed = true): string {
  return confirmed &&
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? String(value)
    : "Unavailable";
}
export function driverInitials(name?: string | null) {
  return (
    name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => Array.from(part)[0])
      .join("")
      .toUpperCase() || "D"
  );
}
export function driverContactLabel(value?: string | null, now = Date.now()) {
  const state = driverContact(value ?? null, now);
  return state === "recent_contact"
    ? "Recent foreground contact"
    : state === "stale"
      ? "Stale foreground contact"
      : "Foreground contact unknown";
}
export function driverAssignmentSummary(order: any): string[] {
  const positive = (n: unknown) =>
    n != null && n !== "" && Number.isFinite(Number(n)) && Number(n) > 0;
  return [
    ...(order.items ?? []).map(
      (item: any) =>
        `${positive(item.quantity) ? item.quantity + " ×" : "Quantity unavailable ·"} ${item.name || "Item name unavailable"}`,
    ),
    ...(order.gas_lines ?? []).map((line: any) =>
      positive(line.grams)
        ? `${Number(line.grams) / 1000} kg gas${positive(line.capacity_grams) ? ` · ${Number(line.capacity_grams) / 1000} kg cylinder` : ""}`
        : "Gas quantity unavailable",
    ),
  ];
}
export function driverAssignmentTone(
  label: string,
): "green" | "blue" | "amber" | "neutral" {
  return ["Delivered", "At destination"].includes(label)
    ? "green"
    : ["In progress", "Picked up"].includes(label)
      ? "blue"
      : ["Awaiting pickup", "Assigned", "Ready to start", "Waiting for office"].includes(label)
        ? "amber"
        : "neutral";
}
export function driverNextAssignment<
  T extends {
    id: string;
    status: string;
    delivery_date?: string;
    attempt?: { state?: string };
  },
>(
  orders: T[],
  responses: { order_id: string; decision?: string }[] = [],
): T | null {
  const response = (o: T) =>
    responses.find((r) => r.order_id === o.id)?.decision;
  const rank = (o: T) =>
    o.attempt?.state === "arrived"
      ? 0
      : o.status === "out_for_delivery"
        ? 1
        : o.attempt?.state === "picked_up"
          ? 2
          : response(o) === "acknowledged"
            ? 3
            : 4;
  return (
    orders
      .filter(
        (o) =>
          ["assigned", "out_for_delivery"].includes(o.status) &&
          ["assigned", "picked_up", "arrived"].includes(
            o.attempt?.state ?? "",
          ) &&
          response(o) !== "rejected",
      )
      .sort(
        (a, b) =>
          rank(a) - rank(b) ||
          (a.delivery_date ?? "9999").localeCompare(
            b.delivery_date ?? "9999",
          ) ||
          a.id.localeCompare(b.id),
      )[0] ?? null
  );
}
export function driverNextAction(order: any, decision?: string) {
  const label = driverOrderLabel(order, decision);
  return label === "Assigned"
    ? "Accept order"
    : label === "Waiting for office" ? "Review daily allocation"
    : label === "Awaiting pickup" || label === "Ready to start"
      ? "Start delivery"
      : label === "At destination"
        ? "Record supply and photo"
        : "Continue delivery";
}

export function driverOrderLabel(order:any, decision?:string) {
  const label=assignmentLabel(order.status,order.attempt?.state,decision);
  if(label==='Awaiting pickup' && order.gas_lines?.length && order.legacy_lpg!==true)
    return order.daily_run?.state==='active' && order.daily_run?.allocation_state==='allocated' ? 'Ready to start' : 'Waiting for office';
  return label;
}
export function driverAcceptedAssignmentNotice(order:any) {
  if(order.gas_lines?.length && order.legacy_lpg!==true)
    return driverOrderLabel(order,'acknowledged')==='Ready to start'
      ? 'Order accepted. Tap Start delivery when you are ready to leave.'
      : 'Order accepted. Refresh the order after the office reserves its gas for today’s delivery.';
  return 'Order accepted. Review the existing pickup details before starting delivery.';
}
