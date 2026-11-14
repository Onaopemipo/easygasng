"use client";

import { FieldCaption } from "./field-caption";
import { useRef, useState, type FormEvent } from "react";
import { api, Loading, Notice } from "./ui";
import { FormInput } from "./password-input";
import {
  staffRoles,
  staffRoleDetails,
  type StaffRole,
} from "../../../packages/business-rules/src/staff-roles";
import {
  staffPrivileges,
  canGrantStaffPrivilege,
} from "../../../packages/business-rules/src/staff-privileges";

type Effect = "grant" | "deny";
export default function StaffInvitation({
  branches,
  defaultBranch,
  send,
}: {
  branches: { value: string; label: string }[];
  defaultBranch?: string;
  send: (value: unknown) => Promise<{ message: string }>;
}) {
  const [role, setRole] = useState<StaffRole | "">("");
  const [branchId, setBranch] = useState(
    branches.find((b) => b.value === defaultBranch)?.value ??
      (branches.length === 1 ? branches[0].value : ""),
  );
  const [changes, setChanges] = useState<Record<string, Effect>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [verify, setVerify] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!role || !branchId || inFlight.current || message) return;
    const form = new FormData(event.currentTarget);
    inFlight.current = true;
    setBusy(true);
    setError("");
    let verifying = verify;
    try {
      if (verifying) {
        await api("reauth", { password: form.get("verifyPassword") });
        setVerify(false);
        verifying = false;
      }
      const result = await send({
        name: form.get("name"),
        email: form.get("email"),
        branchId,
        access: {
          role,
          changes: Object.entries(changes).map(([privilege, effect]) => ({
            privilege,
            effect,
          })),
        },
      });
      setMessage(result.message);
      setDirty(false);
    } catch (e) {
      const problem = e as Error & { code?: string };
      setError(problem.message);
      setVerify(verifying || problem.code === "REAUTH_REQUIRED");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  if (message) return <Notice type="success" message={message} />;
  const available = role
    ? staffPrivileges.filter((p) => canGrantStaffPrivilege(p, role, branchId))
    : [];
  return (
    <form
      className="surface service-form product-form staff-invitation"
      onSubmit={submit}
      data-unsaved={dirty ? "true" : undefined}
      onChange={() => setDirty(true)}
    >
      <h3>Invite a colleague</h3>
      <fieldset className="staff-invite-fields" disabled={busy}>
        <label>
          <FieldCaption required={true}>Full name</FieldCaption>
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="off"
          />
        </label>
        <label>
          <FieldCaption required={true}>Email address</FieldCaption>
          <input
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="off"
          />
        </label>
        <label>
          <FieldCaption required={true}>Branch</FieldCaption>
          <select
            value={branchId}
            required
            onChange={(e) => setBranch(e.target.value)}
          >
            <option value="">Choose a branch</option>
            {branches.map((branch) => (
              <option key={branch.value} value={branch.value}>
                {branch.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <FieldCaption required={true}>Staff role</FieldCaption>
          <select
            value={role}
            required
            onChange={(e) => {
              setRole(e.target.value as StaffRole | "");
              setChanges({});
            }}
          >
            <option value="">Choose a role</option>
            {staffRoles.map((key) => (
              <option key={key} value={key}>
                {staffRoleDetails[key].label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      {role && (
        <>
          <p className="muted">{staffRoleDetails[role].description}</p>
          <details className="staff-invite-privileges">
            <summary>
              Review or customise privileges ({Object.keys(changes).length}{" "}
              changed)
            </summary>
            <div className="staff-invite-privilege-list">
              {available.map((p) => {
                const defaultAccess = p.roles.includes(role);
                return (
                  <label className="checkbox-row" key={p.id}>
                    <input
                      type="checkbox"
                      disabled={busy}
                      checked={
                        changes[p.id]
                          ? changes[p.id] === "grant"
                          : defaultAccess
                      }
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setChanges((previous) => {
                          const next = { ...previous };
                          if (enabled === defaultAccess) delete next[p.id];
                          else next[p.id] = enabled ? "grant" : "deny";
                          return next;
                        });
                      }}
                    />
                    <span>
                      <strong>{p.label}</strong>
                      <small>{p.description}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          </details>
        </>
      )}
      <p className="muted">
        The recipient must accept the invitation and replace their temporary
        password. Staff access requires two independent approvals.
      </p>
      {error && <Notice type="error" message={error} />}
      {verify && (
        <label>
          <FieldCaption required={true}>Verify your password{" "}</FieldCaption>
          <FormInput
            name="verifyPassword"
            type="password"
            autoComplete="current-password"
            required
            disabled={busy}
          />
        </label>
      )}
      {busy && <Loading />}
      <div className="staff-invite-submit">
        <button className="button" disabled={busy || !role || !branchId}>
          {verify ? "Verify and send invitation" : "Send Staff Invitation"}
        </button>
      </div>
    </form>
  );
}
