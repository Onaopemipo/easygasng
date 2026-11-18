const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type AssignmentAlert = {
  key: string;
  orderId: string;
  attemptId: string;
  reference: string;
  version: number;
};
/** Input must come from successful authenticated current-order/snapshot reads. Never infer an assignment from an inbox body. */
export function pendingAssignmentAlerts(
  orders: any[],
  responses: any[],
  actorId: string,
  branchId: string,
): AssignmentAlert[] {
  return orders
    .flatMap((o) => {
      if (
        !uuid.test(o?.id ?? "") ||
        !uuid.test(o?.attempt?.id ?? "") ||
        o.driver_id !== actorId ||
        o.branch_id !== branchId ||
        o.status !== "assigned" ||
        o.attempt.state !== "assigned" ||
        o.attempt.driver_id !== actorId ||
        o.assignment_response_open !== true ||
        !Number.isSafeInteger(o.tracking_version) ||
        o.tracking_version < 0 ||
        responses.some((r) => r.order_id === o.id && r.decision != null)
      )
        return [];
      return [
        {
          key: `${o.id}.${o.attempt.id}`,
          orderId: o.id,
          attemptId: o.attempt.id,
          reference: String(o.reference).slice(0, 80),
          version: o.tracking_version,
        },
      ];
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}
export function currentAlertOrder(
  alert: AssignmentAlert,
  orders: any[],
  responses: any[],
  actorId: string,
  branchId: string,
) {
  const current = pendingAssignmentAlerts(
    orders,
    responses,
    actorId,
    branchId,
  ).find((a) => a.key === alert.key);
  if (!current || current.version !== alert.version) return null;
  return orders.find((o) => o.id === current.orderId) ?? null;
}
export const assignmentNotification = (
  alert: AssignmentAlert,
  scope: string,
) => ({
  title: "EasyGas · Delivery assigned",
  body: `${alert.reference}: open EasyGas to review and acknowledge your assignment.`,
  sound: "default" as const,
  data: {
    kind: "driver-assignment",
    scope,
    orderId: alert.orderId,
    attemptId: alert.attemptId,
  },
});
export function readAlertLedger(raw: string | null): string[] {
  try {
    const value = JSON.parse(raw ?? "[]");
    return Array.isArray(value)
      ? value
          .filter(
            (x: unknown): x is string =>
              typeof x === "string" &&
              x.length === 73 &&
              x.split(".").every((s) => uuid.test(s)),
          )
          .slice(-256)
      : [];
  } catch {
    return [];
  }
}

/** The public me DTO uses branchId; server-internal actors use branch_id. Conflicting identities fail closed. */
export function assignmentActorBranch(user: {
  branchId?: unknown;
  branch_id?: unknown;
}) {
  if (
    user.branchId != null &&
    user.branch_id != null &&
    user.branchId !== user.branch_id
  )
    return "";
  const branch = user.branchId ?? user.branch_id;
  return typeof branch === "string" ? branch : "";
}
