"use client";
import Link from "./workspace-link";
import { useMemo } from "react";

/** Navigation-only owner shortcuts to EXISTING protected workspaces. The backend remains the authority. */
export default function OwnerGovernanceLinks({
  section,
  allowed,
}: {
  section: string;
  allowed: string[];
}) {
  const pages = useMemo(() => [
    { id: "settings", label: "Business Controls", note: "Governed settings and organisation details" },
    { id: "reports", label: "Reports & Branches", note: "Use the existing Branch Performance report" },
    { id: "approvals", label: "Approval Review", note: "Approval is separate from activation and execution" },
    { id: "staff", label: "Roles & Access", note: "Role, branch and individual privilege controls" },
    { id: "audit", label: "Audit History", note: "Immutable record of authorised actions" },
  ], []);
  const permitted = pages.filter((item) => allowed.includes(item.id));
  if (!permitted.some((item) => item.id === section)) return null;
  return (
    <nav aria-label="Business Owner management shortcuts" style={{ margin: "12px 0 20px" }}>
      <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--text-muted, #53665b)" }}>
        BUSINESS OWNER · MANAGEMENT & GOVERNANCE
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {permitted.map((item) => <Link
          key={item.id}
          href={`/admin/${item.id}`}
          aria-current={section === item.id ? "page" : undefined}
          title={item.note}
          style={{
            display: "inline-flex", alignItems: "center", minHeight: 44,
            padding: "8px 13px", borderRadius: 11,
            border: "1px solid var(--border, #d8e6dc)",
            background: section === item.id ? "#0b6b39" : "transparent",
            color: section === item.id ? "#fff" : "inherit",
            textDecoration: "none", fontWeight: 650, fontSize: 13,
          }}>
          {item.label}
        </Link>)}
      </div>
      {section === "approvals" ? <p style={{ fontSize: 12, marginTop: 8 }}>
        Review evidence and eligibility before deciding. An approved change may still await scheduled activation or independent execution.
      </p> : null}
    </nav>
  );
}
