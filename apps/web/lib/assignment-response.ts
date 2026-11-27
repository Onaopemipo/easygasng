import { z } from "zod";

// Acceptance is an explicit authenticated action, not a request for free text.
// Keep the existing non-null audit columns and support older clients' notes.
export function assignmentResponseReason(
  decision: string,
  value: string | undefined,
  maximum: number,
) {
  const text = value?.trim() ?? "";
  if (decision === "acknowledged" && !text) return "Assignment accepted";
  return z.string().min(5).max(maximum).parse(text);
}
