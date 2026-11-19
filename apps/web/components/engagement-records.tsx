"use client";
import React from "react";
import { Empty } from "./ui";
import { RecordPages } from "./compact-workspace";

export function CampaignRecords({
  rows,
  open,
}: {
  rows: any[];
  open: (row: any) => void;
}) {
  if (!rows.length)
    return (
      <Empty title="No campaigns found">
        Create a draft or adjust your filters.
      </Empty>
    );
  return (
    <RecordPages rows={rows}>
      {(visible) => (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Audience</th>
                <th>Delivered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.title}</strong>
                    <small>{r.branch_id}</small>
                  </td>
                  <td>{r.status}</td>
                  <td>{r.recipients}</td>
                  <td>{r.sent}</td>
                  <td>
                    <button
                      className="button secondary"
                      onClick={() => open(r)}
                    >
                      View campaign
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </RecordPages>
  );
}
export const relationLabels: Record<string, string> = {
  assessment: "Assessment offered",
  unknown: "Assessment required",
  incompatible: "Do not recommend",
};
export function RecommendationRecords({
  rows,
  open,
}: {
  rows: any[];
  open: (row: any) => void;
}) {
  if (!rows.length)
    return (
      <Empty title="No recommendation rules found">
        Propose a rule or adjust your filters.
      </Empty>
    );
  return (
    <RecordPages rows={rows}>
      {(visible) => (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Product / service</th>
                <th>Relationship</th>
                <th>Status</th>
                <th>Completed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.product}</strong>
                    <small>{r.service}</small>
                  </td>
                  <td>{relationLabels[r.relation] ?? r.relation}</td>
                  <td>
                    {r.active
                      ? "Active"
                      : r.reviewed_by
                        ? "Inactive"
                        : "Awaiting review"}
                  </td>
                  <td>{r.completed}</td>
                  <td>
                    <button
                      className="button secondary"
                      onClick={() => open(r)}
                    >
                      Review rule
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </RecordPages>
  );
}
export const testimonialStatuses: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  CHANGES_REQUESTED: "Changes requested",
  HIDDEN: "Hidden",
  WITHDRAWN: "Withdrawn",
};
export function TestimonialRecords({
  rows,
  selected,
  select,
  open,
}: {
  rows: any[];
  selected: any[];
  select: (row: any, checked: boolean) => void;
  open: (row: any) => void;
}) {
  if (!rows.length)
    return (
      <Empty title="No matching testimonials">
        Customer submissions will appear here when available. Try another
        filter.
      </Empty>
    );
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Select</th>
            <th>Customer feedback</th>
            <th>Rating</th>
            <th>Status</th>
            <th>Consent</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <input
                  type="checkbox"
                  aria-label={`Select feedback from ${r.display_name}`}
                  checked={selected.some((s) => s.id === r.id)}
                  onChange={(e) => select(r, e.target.checked)}
                />
              </td>
              <td>
                <strong>{r.display_name}</strong>
                <small className="growth-excerpt">
                  {r.body.slice(0, 120)}
                  {r.body.length > 120 ? "…" : ""}
                </small>
              </td>
              <td>{r.rating}/5</td>
              <td>{testimonialStatuses[r.status]}</td>
              <td>{r.consent ? "Granted" : "Not granted"}</td>
              <td>
                <button className="button secondary" onClick={() => open(r)}>
                  Review feedback
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
