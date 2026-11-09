export function lagosDate(value: Date | string = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (k: string) => parts.find((p) => p.type === k)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function technicianRange(kind: string, now = new Date()) {
  const to = lagosDate(now),
    n = kind === "7" ? 7 : kind === "90" ? 90 : 30;
  const date = new Date(to + "T12:00:00Z");
  if (kind === "month") date.setUTCDate(1);
  else date.setUTCDate(date.getUTCDate() - n + 1);
  const from = date.toISOString().slice(0, 10);
  return {
    from,
    to,
    days: Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1,
  };
}
export function technicianStatus(job: {
  status: string;
  assignment_response?: string;
  work_phase?: string;
}) {
  if (
    job.assignment_response === "declined" &&
    !["completed", "cancelled", "failed"].includes(job.status)
  )
    return "Declined · awaiting operations";
  const labels: Record<string, string> = {
    pending_confirmation: "Pending confirmation",
    confirmed: "Confirmed",
    assigned: "Assigned",
    en_route: "On the way",
    in_progress:
      job.work_phase === "authorised"
        ? "In Progress"
        : "Assessment in progress",
    awaiting_customer_approval: "Awaiting approval",
    awaiting_acknowledgement: "Awaiting acknowledgement",
    completed: "Completed",
    cancelled: "Cancelled",
    failed: "Unable to complete",
  };
  return labels[job.status] ?? job.status.replaceAll("_", " ");
}
export function historyGroup(
  job: { history_at?: string | null },
  now = new Date(),
) {
  if (!job.history_at) return "Historical event date unavailable";
  const day = lagosDate(job.history_at),
    today = lagosDate(now),
    yesterday = new Date(today + "T12:00:00Z");
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const prefix =
    day === today
      ? "Today, "
      : day === yesterday.toISOString().slice(0, 10)
        ? "Yesterday, "
        : "";
  return (
    prefix +
    new Date(job.history_at).toLocaleDateString("en-GB", {
      timeZone: "Africa/Lagos",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  );
}
