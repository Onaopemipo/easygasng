/** Read contracts over canonical delivery records; no parallel dispatch state. */
export type DispatchTab = "queue" | "live" | "completed" | "exceptions";
export const dispatchTabs: DispatchTab[] = [
  "queue",
  "live",
  "completed",
  "exceptions",
];
export function lagosDate(value: Date | string = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
export function dispatchTab(status: string): DispatchTab | null {
  if (["accepted", "preparing"].includes(status)) return "queue";
  if (["assigned", "out_for_delivery"].includes(status)) return "live";
  if (status === "delivered") return "completed";
  if (status === "delivery_failed") return "exceptions";
  return null;
}
export function dispatchPriority(
  order: { delivery_date: string; status: string },
  today: string,
) {
  return order.delivery_date < today &&
    !["delivered", "cancelled"].includes(order.status)
    ? "Overdue"
    : "Normal";
}
export type DispatchReadiness = { ready: boolean | null; reasons: string[] };

/** Foreground server contact is not proof of GPS reception or availability. */
export function driverContact(
  lastSeen: string | null,
  now = Date.now(),
): "recent_contact" | "stale" | "unknown" {
  if (!lastSeen) return "unknown";
  const at = Date.parse(lastSeen);
  if (!Number.isFinite(at) || at > now) return "unknown";
  return now - at < 90000 ? "recent_contact" : "stale";
}

export function dispatchOrderTab(
  order: {
    status: string;
    driver_response?: string | null;
    delivery_code_expires_at?: string | Date;
  },
  now = Date.now(),
): DispatchTab | null {
  if (
    order.status === "assigned" &&
    (order.driver_response === "rejected" ||
      (order.delivery_code_expires_at &&
        new Date(order.delivery_code_expires_at).getTime() <= now))
  )
    return "exceptions";
  return dispatchTab(order.status);
}
