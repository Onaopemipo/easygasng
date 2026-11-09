// One state graph for every governed capability. Lowercase storage is retained for API compatibility.
export const approvalTransitions: Record<string, readonly string[]> = {
  draft: ["pending_approval", "cancelled"],
  pending_approval: [
    "partially_approved",
    "approved",
    "changes_requested",
    "rejected",
    "cancelled",
    "expired",
  ],
  changes_requested: ["draft", "cancelled", "expired"],
  partially_approved: [
    "approved",
    "changes_requested",
    "rejected",
    "cancelled",
    "expired",
  ],
  approved: ["scheduled", "applying", "superseded", "cancelled"],
  scheduled: ["applying", "superseded", "cancelled"],
  applying: ["active", "failed"],
  failed: ["applying", "cancelled", "superseded"],
  active: ["rolled_back"],
  rejected: [],
  cancelled: [],
  expired: [],
  superseded: [],
  rolled_back: [],
};
export const canonicalApprovalState = (state: string) => state.toUpperCase();
