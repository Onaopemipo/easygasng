import React from "react";
import { History, ArrowRight } from "lucide-react";
import { readableSetting } from "./setting-summary";
import { money, Notice } from "./ui";

/** History is viewable independently of the right to request a restoration. */
export default function SettingVersionHistory({
  setting,
  versions,
  role,
  busy,
  error,
  onRestore,
}: {
  setting: any;
  versions: any[];
  role: string;
  busy: boolean;
  error: string;
  onRestore: (version: any) => void;
}) {
  const format = (v: any) =>
    v === null
      ? "Not configured"
      : setting.value_type === "money"
        ? money(v)
        : typeof v === "boolean"
          ? v
            ? "Enabled"
            : "Disabled"
          : typeof v === "object"
            ? readableSetting(v)
            : String(v);
  const canRestore = setting.propose_roles.includes(role);
  return (
    <>
      {error && <Notice type="error" message={error} />}
      {!canRestore && (
        <p role="status">
          You can view this history. Your role cannot request restoration of
          this setting.
        </p>
      )}
      {!versions.length ? (
        <p>No changes yet. The original configuration is still active.</p>
      ) : (
        versions.map((v) => (
          <div className="version-row" key={v.id}>
            <strong>Version {v.version}</strong>
            <p>
              {format(v.previous_value)} <ArrowRight size={14} />{" "}
              {format(v.value)}
            </p>
            <small>{new Date(v.created_at).toLocaleString()}</small>
            {canRestore && (
              <button
                type="button"
                className="text-link"
                disabled={busy}
                onClick={() => onRestore(v)}
              >
                {busy
                  ? "Requesting restoration…"
                  : "Request restoration of previous value"}{" "}
                <History size={14} />
              </button>
            )}
          </div>
        ))
      )}
    </>
  );
}
