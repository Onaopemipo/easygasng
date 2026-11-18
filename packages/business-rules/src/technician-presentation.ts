import { technicianStatus } from "./technician-mobile";

export const technicianTerminal = (status: string) =>
  ["completed", "cancelled", "failed"].includes(status);

export function technicianReviewLabel(job: {
  status: string;
  assignment_response?: string;
  work_phase?: string;
}) {
  if (technicianTerminal(job.status)) return "View service record";
  if (job.assignment_response === "declined")
    return "View operations follow-up";
  if (job.status === "assigned" && job.assignment_response === "pending")
    return "Review assignment";
  if (job.status === "in_progress")
    return job.work_phase === "authorised" ? "Resume job" : "Review assessment";
  if (job.status === "awaiting_customer_approval") return "Review quotation";
  if (job.status === "awaiting_acknowledgement") return "View submitted report";
  return "View job";
}

export function technicianGreeting(at: string | Date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date(at)),
  );
  return hour < 12
    ? "Good morning"
    : hour < 17
      ? "Good afternoon"
      : "Good evening";
}

export function technicianDate(
  at: string | Date | null | undefined,
  dateOnly = false,
) {
  if (!at || !Number.isFinite(new Date(at).getTime()))
    return "Date unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(dateOnly ? {} : { hour: "2-digit", minute: "2-digit" }),
  }).format(new Date(at));
}

export function technicianCount(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? String(value)
    : "—";
}

export function technicianTone(job: Parameters<typeof technicianStatus>[0]) {
  return job.status === "completed"
    ? "success"
    : ["failed", "cancelled"].includes(job.status)
      ? "neutral"
      : job.status === "in_progress"
        ? "warning"
        : "info";
}
