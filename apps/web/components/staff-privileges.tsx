"use client";
import { useEffect, useState } from "react";
import { api, Loading, Notice } from "./ui";
import { ServiceForm } from "./professional-services";
export default function StaffPrivileges({
  target,
  user,
  onSaved,
}: {
  target: any;
  user: any;
  onSaved: () => void;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [reauth, setReauth] = useState(false),
    [version, setVersion] = useState(0),
    [search, setSearch] = useState(""),
    [changes, setChanges] = useState<Record<string, string>>({}),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    setChanges({});
    api("staff.privileges?" + new URLSearchParams({ userId: target.id }))
      .then((d) => {
        if (live) {
          setData(d);
          setReauth(false);
        }
      })
      .catch((e) => {
        if (live) {
          setError(e.message);
          setReauth(e.code === "REAUTH_REQUIRED");
        }
      });
    return () => {
      live = false;
    };
  }, [target.id, version]);
  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api("staff.privileges.save", {
        userId: target.id,
        version: data.version,
        changes: Object.entries(changes).map(([privilege, effect]) => ({
          privilege,
          effect,
        })),
        reason,
      });
      setMessage(result.message);
      setReason("");
      setVersion((v) => v + 1);
      onSaved();
    } catch (e: any) {
      setError(e.message);
      if (e.code === "REAUTH_REQUIRED") setReauth(true);
    } finally {
      setBusy(false);
    }
  }
  const count = Object.keys(changes).length;
  return (
    <section
      className="staff-privilege-editor"
      aria-label="Individual staff privileges"
      data-unsaved={count || reason.trim() ? "true" : undefined}
    >
      <header>
        <h3>Individual privileges</h3>
        <p>
          Choose which operations {target.name} can use. Role defaults remain
          active unless you grant or revoke a privilege.
        </p>
      </header>
      {error && <Notice type="error" message={error} />}
      {message && <Notice message={message} />}
      {reauth ? (
        <ServiceForm
          title="Verify your identity to manage privileges"
          fields={[
            { name: "password", label: "Current password", type: "password" },
          ]}
          send={(v) => api("reauth", v)}
          done={() => {
            setReauth(false);
            setVersion((v) => v + 1);
          }}
          submit="Verify identity"
        />
      ) : !data ? (
        !error && <Loading />
      ) : (
        <>
          <Notice message="Grants apply only to the listed operations and existing branch scope. They do not change roles, approve payments, verify qualifications or bypass independent review. Field-only and customer accounts require an approved staff role for additional business access." />
          <label className="staff-privilege-search">
            Find a privilege
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers, products, inventory…"
            />
          </label>
          <div className="staff-privilege-list">
            {data.privileges
              .filter((p: any) =>
                (p.label + " " + p.group + " " + p.description)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((p: any) => {
                const effect = changes[p.id] ?? p.effect,
                  protectedControl =
                    user.role === "administrator" &&
                    ["Protected authority", "Finance & reporting"].includes(
                      p.group,
                    );
                return (
                  <div className="staff-privilege-row" key={p.id}>
                    <div>
                      <span className="staff-privilege-group">{p.group}</span>
                      <strong>{p.label}</strong>
                      <p>{p.description}</p>
                      <small>
                        {p.stale
                          ? "Previous grant needs review after a role or branch change. "
                          : ""}
                        Role default:{" "}
                        {p.roleDefault ? "Allowed" : "Not allowed"} · Current
                        access: {p.effective ? "Allowed" : "Not allowed"}
                        {protectedControl
                          ? " · Business Owner manages this privilege"
                          : ""}
                      </small>
                    </div>
                    <label>
                      Access for {p.label}
                      <select
                        value={effect}
                        disabled={busy || protectedControl}
                        onChange={(e) =>
                          setChanges((old) => {
                            const next = { ...old };
                            if (e.target.value === p.effect) delete next[p.id];
                            else next[p.id] = e.target.value;
                            return next;
                          })
                        }
                      >
                        <option value="default">Use role default</option>
                        <option value="grant" disabled={!p.canGrant}>
                          Grant access{!p.canGrant ? " (role required)" : ""}
                        </option>
                        <option value="deny">Revoke access</option>
                      </select>
                    </label>
                  </div>
                );
              })}
          </div>
          {!data.privileges.some((p: any) =>
            (p.label + " " + p.group + " " + p.description)
              .toLowerCase()
              .includes(search.toLowerCase()),
          ) && <p role="status">No privileges match this search.</p>}
          <label>
            Reason for privilege changes
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
              placeholder="Explain why this access is needed or being removed (10+ characters)."
            />
          </label>
          <div className="staff-privilege-save">
            <span role="status">
              {count
                ? `${count} unsaved privilege ${count === 1 ? "change" : "changes"}`
                : "No unsaved privilege changes"}
            </span>
            <button
              className="button"
              disabled={busy || !count || reason.trim().length < 10}
              onClick={save}
            >
              {busy ? "Saving…" : "Save privilege changes"}
            </button>
          </div>
          <details>
            <summary>Privilege change history</summary>
            {data.history.length ? (
              data.history.map((h: any, i: number) => (
                <div className="staff-privilege-history" key={i}>
                  <strong>{h.actor ?? "Authorised administrator"}</strong> ·{" "}
                  {new Date(h.created_at).toLocaleString("en-GB", {
                    timeZone: "Africa/Lagos",
                  })}
                  <p>{h.detail.reason}</p>
                  <ul>
                    {h.detail.changes?.map((c: any) => (
                      <li key={c.privilege}>
                        {data.privileges.find((p: any) => p.id === c.privilege)
                          ?.label ?? c.privilege}
                        :{" "}
                        {c.effect === "default"
                          ? "Role default"
                          : c.effect === "grant"
                            ? "Granted"
                            : "Revoked"}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p>No individual privilege changes recorded.</p>
            )}
          </details>
        </>
      )}
    </section>
  );
}
