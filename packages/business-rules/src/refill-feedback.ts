export type RefillFeedbackState =
  | "still_available"
  | "low"
  | "empty"
  | "already_refilled"
  | "remind_later";
type Feedback = { state: string; created_at: string | Date };
export function refillFeedbackEffect(
  feedback: Feedback | null | undefined | (Feedback | null | undefined)[],
  lastVerified: string | Date | null | undefined,
  now = new Date(),
) {
  const verified = lastVerified ? new Date(lastVerified).getTime() : -Infinity;
  const records = (Array.isArray(feedback) ? feedback : [feedback])
    .filter(
      (f): f is Feedback =>
        !!f &&
        Number.isFinite(new Date(f.created_at).getTime()) &&
        new Date(f.created_at).getTime() <= now.getTime() &&
        new Date(f.created_at).getTime() > verified,
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  if (records.some((f) => f.state === "already_refilled"))
    return {
      suppressReminder: true,
      suppressPrediction: true,
      until: null,
      reason:
        "You reported that you have already refilled. This is an unverified self-report; a new verified refill is needed before showing an updated estimate.",
    };
  const latest = records[0],
    until = latest ? new Date(latest.created_at).getTime() + 86400000 : 0;
  if (latest?.state === "remind_later" && until > now.getTime())
    return {
      suppressReminder: true,
      suppressPrediction: false,
      until: new Date(until).toISOString(),
      reason:
        "Estimated refill reminders are paused for 24 hours after your request.",
    };
  return {
    suppressReminder: false,
    suppressPrediction: false,
    until: null,
    reason: "",
  };
}
