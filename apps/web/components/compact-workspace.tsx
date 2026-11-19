"use client";
import React, { useState } from "react";
import { Modal } from "./ui";

export const RECORDS_PER_PAGE = 8;
/** Dialog-local drafts are discarded only through the shared Modal confirmation. */
export function DialogDraft({ children }: { children: React.ReactNode }) {
  const [dirty, setDirty] = useState(false);
  return (
    <div
      data-unsaved={dirty ? "true" : undefined}
      onChange={() => setDirty(true)}
    >
      {children}
    </div>
  );
}
export function recordWindow<T>(rows: T[], page: number) {
  const pages = Math.max(1, Math.ceil(rows.length / RECORDS_PER_PAGE));
  const current = Math.min(Math.max(1, page), pages);
  return {
    rows: rows.slice(
      (current - 1) * RECORDS_PER_PAGE,
      current * RECORDS_PER_PAGE,
    ),
    current,
    pages,
  };
}
export function RecordPages<T>({
  rows,
  children,
}: {
  rows: T[];
  children: (rows: T[]) => React.ReactNode;
}) {
  const [page, setPage] = useState(1);
  const visible = recordWindow(rows, page);
  return (
    <>
      {children(visible.rows)}
      {rows.length > RECORDS_PER_PAGE && (
        <nav className="compact-pagination" aria-label="Record pages">
          <span>
            {(visible.current - 1) * RECORDS_PER_PAGE + 1}–
            {Math.min(visible.current * RECORDS_PER_PAGE, rows.length)} of{" "}
            {rows.length}
          </span>
          <button
            className="button secondary"
            disabled={visible.current === 1}
            onClick={() => setPage(visible.current - 1)}
          >
            Previous
          </button>
          <span>
            Page {visible.current} of {visible.pages}
          </span>
          <button
            className="button secondary"
            disabled={visible.current === visible.pages}
            onClick={() => setPage(visible.current + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </>
  );
}
export function WorkspaceDialog({
  title,
  trigger,
  children,
}: {
  title: string;
  trigger?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="button secondary"
        onClick={() => setOpen(true)}
      >
        {trigger ?? title}
      </button>
      {open && (
        <Modal
          title={title}
          className="compact-dialog"
          onClose={() => setOpen(false)}
        >
          {children}
        </Modal>
      )}
    </>
  );
}
export function WorkspaceTabs({
  value,
  onChange,
  tabs,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  tabs: readonly (readonly [string, string])[];
  label: string;
}) {
  return (
    <nav className="compact-tabs" aria-label={label}>
      {tabs.map(([id, text]) => (
        <button
          type="button"
          key={id}
          aria-pressed={value === id}
          className={value === id ? "is-active" : ""}
          onClick={() => onChange(id)}
        >
          {text}
        </button>
      ))}
    </nav>
  );
}
