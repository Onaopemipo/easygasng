type ApprovalRequest = {
  status: string;
  approval_progress?: {
    mode: string;
    approved: number;
    required: number;
    complete: boolean;
  } | null;
};

export function approvalStatusLabel(request: ApprovalRequest) {
  const progress = request.approval_progress;
  if (["pending_approval", "partially_approved"].includes(request.status)) {
    if (!progress) return "Awaiting approvals";
    const label =
      progress.mode === "owner"
        ? "Awaiting owner approval"
        : progress.approved >= progress.required && !progress.complete
          ? "Awaiting required review"
          : "Awaiting approvals";
    return `${label} · ${progress.approved}/${progress.required}`;
  }
  return request.status.replaceAll("_", " ");
}
