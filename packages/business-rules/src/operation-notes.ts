/** Only routine commentary is optional. Unknown actions keep their existing rules. */
export function operationNoteMode(
  action: string,
  field: string,
  values: Record<string, any> = {},
): "optional" | "required" | undefined {
  if (action === "order.transition" && ["note", "reason"].includes(field))
    return ["accepted", "preparing", "assigned", "out_for_delivery"].includes(
      values.status,
    )
      ? "optional"
      : "required";
  if (action === "booking.transition" && field === "reason")
    return ["confirmed", "assigned", "en_route", "in_progress"].includes(
      values.status,
    )
      ? "optional"
      : "required";
  if (
    ["booking.acknowledge", "booking.settlement.consent"].includes(action) &&
    field === "notes"
  )
    return values.accepted === true ? "optional" : "required";
  if (action === "pos.close" && field === "note") return "optional";
  if (field !== "reason") return undefined;
  if (
    [
      "approval.submit",
      "approval.owner_apply",
      "approval.retry",
      "dispatch.assign",
      "delivery.pickup",
      "delivery.arrived",
      "delivery.reschedule",
      "booking.reschedule",
      "booking.work.start",
    ].includes(action)
  )
    return "optional";
  if (
    ["dispatch.reassign", "delivery.return", "delivery.help"].includes(action)
  )
    return "required";
  return undefined;
}

/** Describes the saved action, never invents physical observations or user evidence. */
export function operationNoteAuditText(
  action: string,
  values: Record<string, any> = {},
) {
  if (action === "order.transition")
    return `Order status updated to ${values.status}`;
  if (action === "booking.transition")
    return `Service status updated to ${values.status}`;
  const labels: Record<string, string> = {
    "approval.submit": "Saved request submitted",
    "approval.owner_apply": "Admin authorisation recorded",
    "approval.retry": "Authorised activation retry requested",
    "dispatch.assign": "Driver assignment recorded",
    "delivery.pickup": "Pickup confirmation recorded",
    "delivery.arrived": "Delivery arrival recorded",
    "delivery.reschedule": "Delivery schedule updated",
    "booking.reschedule": "Service appointment updated",
    "booking.work.start": "Authorised service work started",
    "booking.acknowledge": "Customer accepted documented service",
    "booking.settlement.consent": "Customer accepted settlement",
    "pos.close": "Cash-up submitted",
  };
  return labels[action] ?? "Operation recorded";
}

export function operationNoteRequired(
  action: string,
  field: string,
  values: Record<string, any>,
  fallback = true,
) {
  const mode = operationNoteMode(action, field, values);
  return mode ? mode === "required" : fallback;
}
