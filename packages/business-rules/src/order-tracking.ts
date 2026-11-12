import { unavailableRiderLocation } from "./rider-location";

export const trackingLabels: Record<string, string> = {
  placed: "Order Placed",
  accepted: "Confirmed",
  preparing: "Preparing",
  assigned: "Ready for Dispatch",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  delivery_failed: "Delivery Unsuccessful",
  cancelled: "Cancelled",
};
export function reconcileTracking(previous: any[], next: any[]) {
  // Removed records must disappear on reassignment/revocation, not remain cached.
  return next.map((o) => {
    const prior = previous.find((p) => p.id === o.id);
    return prior && Number(prior.tracking_version) > Number(o.tracking_version)
      ? prior.gps
        ? { ...prior, gps: unavailableRiderLocation }
        : prior
      : o;
  });
}

export function deliveryDelayed(order: any, now = Date.now()) {
  if (["delivered", "cancelled", "delivery_failed"].includes(order.status))
    return false;
  const end = String(order.delivery_window).match(
    /(?:–|-)\s*(\d{2}:\d{2})$/,
  )?.[1];
  const date = String(order.delivery_date).slice(0, 10);
  const deadline = end ? Date.parse(`${date}T${end}:00+01:00`) : NaN;
  return Number.isFinite(deadline) && deadline < now;
}

export function trackingEventLabel(event: any) {
  const labels: Record<string, string> = {
    "delivery.pickup:": "Pickup verified",
    "delivery.arrived:": "Driver arrived",
    "delivery.return:": "Physical return received",
    "delivery.reschedule:": "Delivery rescheduled",
  };
  return (
    Object.entries(labels).find(([prefix]) =>
      String(event.note).startsWith(prefix),
    )?.[1] ??
    trackingLabels[event.status] ??
    event.status
  );
}

export const deliveryFailureReasons = [
  "customer_unavailable",
  "invalid_address",
  "verification_failure",
  "quantity_mismatch",
  "damaged_unsafe_cylinder",
  "driver_unavailable",
  "vehicle_problem",
  "payment_arrangement_issue",
  "gps_outage",
  "failed_handover",
  "other",
] as const;
