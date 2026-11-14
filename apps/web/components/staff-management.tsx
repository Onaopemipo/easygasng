"use client";
import { useEffect, useState } from "react";
import Link from "./workspace-link";
import {
  Plus,
  UserRound,
  UsersRound,
  Clock3,
  UserRoundMinus,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  MoreHorizontal,
  Info,
  X,
} from "lucide-react";
import { api, Modal, Notice, Loading } from "./ui";
import StaffPrivileges from "./staff-privileges";
import StaffInvitation from "./staff-invitation";
import { ServiceForm } from "./professional-services";
import { accountRoles, staffRoleDetails, staffRoleLabel, staffRoles } from "../../../packages/business-rules/src/staff-roles";
export default function StaffManagement({
  user,
  refresh = 0,
}: {
  user: any;
  refresh?: number;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [branchFilter, setBranchFilter] = useState(""),
    [roleFilter, setRoleFilter] = useState(""),
    [statusFilter, setStatusFilter] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<string[]>([]),
    [showInfo, setShowInfo] = useState(true),
    [version, setVersion] = useState(0),
    [modal, setModal] = useState(""),
    [target, setTarget] = useState<any>(null),
    [message, setMessage] = useState("");
  const reload = () => setVersion((v) => v + 1),
    close = () => {
      setModal("");
      setTarget(null);
    };
  useEffect(() => {
    let live = true;
    api("staff.manage")
      .then((d) => {
        if (live) {
          setData(d);
          setError("");
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [version, refresh]);
  const owner = user.role === "owner",
    canInvite = ["owner"].includes(user.role),
    canAccess = ["owner", "manager"].includes(user.role);
  if (!data && !error) return <Loading />;
  if (!data)
    return (
      <>
        <Notice type="error" message={error} />
        <button className="button" onClick={reload}>
          Retry
        </button>
      </>
    );
  const branches = data.branches
    .filter((b: any) => b.active)
    .map((b: any) => ({ value: b.id, label: b.name }));
  const action = (mode: string, person?: any) => {
    setTarget(person ?? null);
    setModal(mode);
  };
  const done = () => {
    reload();
    close();
    setMessage("Staff record updated.");
  };
  async function inviteAction(actionName: string, payload: any) {
    const r = await api(actionName, payload);
    reload();
    return r;
  }
  const branchName = (id: string) =>
    data.branches.find((b: any) => b.id === id)?.name ?? id ?? "No branch";
  const roleName = (role: string) => role === "customer" ? "Awaiting staff access" : staffRoleLabel(role);
  const pending = data.invitations.filter(
    (i: any) => !i.accepted_at && new Date(i.expires_at) > new Date(),
  );
  const rows = [
    ...data.people.map((p: any) => ({
      ...p,
      kind: "person",
      status: p.active ? "active" : "suspended",
    })),
    ...data.invitations
      .filter((i: any) => !i.accepted_at)
      .map((i: any) => ({
        ...i,
        kind: "invitation",
        role: i.requested_role ?? "",
        status: new Date(i.expires_at) > new Date() ? "pending" : "expired",
      })),
  ];
  const filtered = rows.filter(
    (p) =>
      (!branchFilter || p.branch_id === branchFilter) &&
      (!roleFilter || p.role === roleFilter) &&
      (!statusFilter || p.status === statusFilter) &&
      [p.name, p.email, roleName(p.role), branchName(p.branch_id)]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 6)),
    currentPage = Math.min(page, pages),
    visible = filtered.slice((currentPage - 1) * 6, currentPage * 6);
  const resetFilters = () => {
    setQuery("");
    setBranchFilter("");
    setRoleFilter("");
    setStatusFilter("");
    setPage(1);
    setSelected([]);
  };
  const toggle = (id: string) =>
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id],
    );
  return (
    <section className="staff-screen">
      <div className="staff-heading">
        <div>
          <h1>Staff Management</h1>
          <p>
            Add colleagues, review invitations and manage existing staff
            accounts.
          </p>
        </div>
        <div className="staff-heading-actions">
          <details className="staff-menu">
            <summary className="button secondary">
              More Actions <ChevronDown size={18} />
            </summary>
            <div className="staff-menu-panel">
              {canAccess && (
                <button onClick={() => action("lookup")}>
                  Add Existing Account
                </button>
              )}
              <button onClick={() => action("verify")}>Verify Identity</button>
              <button onClick={() => action("roles")}>
                Role Privileges Reference
              </button>
              <button onClick={() => action("requests")}>
                Role &amp; Privilege Requests
              </button>
              <Link href="/admin/approvals">Review Access Requests</Link>
            </div>
          </details>
          {canInvite && (
            <button className="button" onClick={() => action("invite")}>
              <Plus size={22} /> Add New Staff
            </button>
          )}
        </div>
      </div>
      <div className="staff-stats">
        {[
          {
            label: "Total Staff",
            value: data.people.length,
            caption: "All active and inactive accounts",
            icon: UsersRound,
            tone: "green",
          },
          {
            label: "Active Staff",
            value: data.people.filter((p: any) => p.active).length,
            caption: "Enabled to access the system",
            icon: UserRound,
            tone: "green",
          },
          {
            label: "Pending Invitation",
            value: pending.length,
            caption: "Awaiting account activation",
            icon: Clock3,
            tone: "amber",
          },
          {
            label: "Suspended",
            value: data.people.filter((p: any) => !p.active).length,
            caption: "Temporarily disabled",
            icon: UserRoundMinus,
            tone: "red",
          },
        ].map((card) => (
          <article className="staff-stat" key={card.label}>
            <span className={"staff-stat-icon " + card.tone}>
              <card.icon size={30} />
            </span>
            <div>
              <strong>{card.value}</strong>
              <h2>{card.label}</h2>
              <p>{card.caption}</p>
            </div>
          </article>
        ))}
      </div>
      {error && <Notice type="error" message={error} />}
      {message && <Notice type="success" message={message} />}
      {showInfo && (
        <div className="staff-information">
          <Info size={23} />
          <div>
            <strong>Important Information</strong>
            <p>
              Choose staff access when sending an invitation. After the recipient accepts,
              the request goes to the Approval Centre for independent review. Verify
              your password before sensitive actions.
            </p>
          </div>
          <button
            aria-label="Dismiss information"
            onClick={() => setShowInfo(false)}
          >
            <X size={18} />
          </button>
        </div>
      )}
      <div className="staff-filters">
        <label className="staff-search">
          <Search size={20} />
          <input
            aria-label="Search staff"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, role or branch..."
          />
        </label>
        <select
          aria-label="Filter by branch"
          value={branchFilter}
          onChange={(e) => {
            setBranchFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Branches</option>
          {data.branches.map((b: any) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by role"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Roles</option>
          {staffRoles.map((role) => (
            <option key={role} value={role}>
              {roleName(role)}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending Invite</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired Invite</option>
        </select>
        <details className="staff-menu">
          <summary className="button secondary">
            <Filter size={18} /> Filter
          </summary>
          <div className="staff-menu-panel">
            <p>{filtered.length} matching records</p>
            <button onClick={resetFilters}>Clear all filters</button>
          </div>
        </details>
      </div>
      {selected.length > 0 && (
        <div className="staff-selection">
          {selected.length} selected{" "}
          <button onClick={() => setSelected([])}>Clear selection</button>
          <span>Manage each account through its row actions.</span>
        </div>
      )}
      <div className="staff-table-card">
        <div className="staff-table-scroll">
          <table className="staff-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Select all staff on this page"
                    checked={
                      visible.length > 0 &&
                      visible.every((p) => selected.includes(p.id))
                    }
                    onChange={(e) =>
                      setSelected((previous) =>
                        e.target.checked
                          ? [
                              ...new Set([
                                ...previous,
                                ...visible.map((p) => p.id),
                              ]),
                            ]
                          : previous.filter(
                              (id) => !visible.some((p) => p.id === id),
                            ),
                      )
                    }
                  />
                </th>
                <th>Staff Member</th>
                <th>Role</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={"Select " + p.name}
                      checked={selected.includes(p.id)}
                      onChange={() => toggle(p.id)}
                    />
                  </td>
                  <td>
                    <div className="staff-person">
                      <span
                        className={
                          "staff-avatar " +
                          (p.status === "suspended" ? "red" : "")
                        }
                      >
                        {p.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part: string) => part[0])
                          .join("")
                          .toUpperCase()}
                      </span>
                      <div>
                        <strong>{p.name}</strong>
                        <span>{p.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {p.role ? (
                      <span className={"staff-role role-" + p.role}>
                        {roleName(p.role)}
                      </span>
                    ) : (
                      <span className="staff-muted">Not assigned</span>
                    )}
                  </td>
                  <td>
                    <span className="staff-branch">
                      <MapPin size={17} />
                      {branchName(p.branch_id)}
                    </span>
                  </td>
                  <td>
                    <span className={"staff-status " + p.status}>
                      <i />
                      {
                        (
                          {
                            active: "Active",
                            pending: "Pending Invite",
                            suspended: "Suspended",
                            expired: "Expired Invite",
                          } as any
                        )[p.status]
                      }
                    </span>
                  </td>
                  <td className="staff-login">
                    {p.last_login
                      ? new Intl.DateTimeFormat("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Africa/Lagos",
                        }).format(new Date(p.last_login))
                      : "—"}
                  </td>
                  <td>
                    <details className="staff-menu staff-row-menu">
                      <summary aria-label={"Actions for " + p.name}>
                        <MoreHorizontal size={20} />
                      </summary>
                      <div className="staff-menu-panel">
                        {p.kind === "person" ? (
                          <>
                            {(owner || p.role !== "owner") && (
                              <button onClick={() => action("edit", p)}>
                                Edit Profile
                              </button>
                            )}
                            {canAccess && p.id !== user.id && (
                              <button onClick={() => action("access", p)}>
                                Manage Roles &amp; Privileges
                              </button>
                            )}
                            {owner &&
                              !["owner", "customer"].includes(p.role) &&
                              p.id !== user.id && (
                                <button
                                  onClick={() =>
                                    action(
                                      p.active ? "suspend" : "reinstate",
                                      p,
                                    )
                                  }
                                >
                                  {p.active
                                    ? "Suspend Staff"
                                    : "Reinstate Staff"}
                                </button>
                              )}
                            {p.id === user.id && <span>Your account</span>}
                          </>
                        ) : canInvite ? (
                          <>
                            <button onClick={() => action("resend", p)}>
                              Resend / Renew Invitation
                            </button>
                            {p.status === "pending" && (
                              <button onClick={() => action("revoke", p)}>
                                Revoke Invitation
                              </button>
                            )}
                          </>
                        ) : (
                          <span>Invitation awaiting acceptance</span>
                        )}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <div className="staff-empty">
              No staff match your filters.
              <button className="button secondary" onClick={resetFilters}>
                Clear filters
              </button>
            </div>
          )}
        </div>
        <footer className="staff-pagination">
          <span>
            Showing {filtered.length ? (currentPage - 1) * 6 + 1 : 0} to{" "}
            {Math.min(currentPage * 6, filtered.length)} of {filtered.length}{" "}
            staff records
          </span>
          <div>
            <button
              aria-label="Previous page"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter(
                (n) => n === 1 || n === pages || Math.abs(n - currentPage) <= 1,
              )
              .map((n) => (
                <button
                  key={n}
                  className={n === currentPage ? "active" : ""}
                  aria-current={n === currentPage ? "page" : undefined}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
            <button
              aria-label="Next page"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </footer>
      </div>
      {modal === "roles" && (
        <Modal title="Role Privileges Reference" onClose={close}>
          <dl>
            {staffRoles.map((role) => (
              <div key={role}>
                <dt>
                  <strong>{roleName(role)}</strong>
                </dt>
                <dd>{staffRoleDetails[role].description}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
      {modal === "requests" && (
        <Modal title="Role & Privilege Requests" onClose={close}>
          <p>
            Changes require independent approval. Non-owners see their own
            requests.
          </p>
          {!data.accessRequests?.length && <p>No access requests yet.</p>}
          {data.accessRequests?.map((r: any) => (
            <article className="surface" key={r.id}>
              <h3>
                {data.people.find((p: any) => p.id === r.proposed_value.userId)
                  ?.name ?? "User access request"}
              </h3>
              <p>
                {roleName(r.proposed_value.role)} ·{" "}
                {branchName(r.proposed_value.branchId)} ·{" "}
                {r.status.replaceAll("_", " ")}
              </p>
              <p>Requested by {r.requester}</p>
            </article>
          ))}
        </Modal>
      )}
      {modal && !["roles", "requests"].includes(modal) && (
        <Modal
          title={
            (
              {
                invite: "Add New Staff",
                lookup: "Add Existing Account",
                edit: "Edit Staff Profile",
                access: "Manage Roles & Privileges",
                verify: "Verify Identity",
                suspend: "Suspend Staff",
                reinstate: "Reinstate Staff",
                resend: "Renew Staff Invitation",
                revoke: "Revoke Staff Invitation",
              } as any
            )[modal]
          }
          onClose={close}
        >
          {modal === "verify" ? (
            <ServiceForm
              title="Confirm your password"
              fields={[
                {
                  name: "password",
                  label: "Current password",
                  type: "password",
                },
              ]}
              send={(v) => api("reauth", v)}
              done={() => {
                close();
                setMessage(
                  "Identity verified. You can now submit sensitive staff actions.",
                );
              }}
              submit="Verify Password"
            />
          ) : modal === "invite" ? (
            <StaffInvitation
              branches={branches}
              defaultBranch={user.branchId}
              send={(v) => inviteAction("staff.invite", v)}
            />
          ) : modal === "lookup" ? (
            <ServiceForm
              title="Find an existing registered account"
              fields={[
                { name: "email", label: "Exact email address", type: "email" },
              ]}
              send={async (v) => {
                const person = await api(
                  "staff.lookup?" + new URLSearchParams(v),
                );
                setTarget(person);
                setModal("access");
                return {};
              }}
              submit="Find Account"
            />
          ) : modal === "edit" ? (
            <ServiceForm
              title={target.name}
              fields={[
                { name: "name", label: "Full name", value: target.name },
                {
                  name: "reason",
                  label: "Reason for this change (10+ characters)",
                },
              ]}
              send={(v) => api("staff.edit", { userId: target.id, ...v })}
              done={done}
            />
          ) : modal === "access" ? (
            <>
              {["owner"].includes(user.role)&&<StaffPrivileges target={target} user={user} onSaved={reload}/>}
              <details className="staff-role-change"><summary>Change role or branch</summary>
              <p>
                Changing a role updates the user’s default permissions.
                Admin / Business Owner has business-wide access. Other staff
                roles use their assigned branch and work. Technical
                qualifications and independent financial approvals still apply.
              </p>
              <Notice message="This submits an approval request; it does not immediately grant access. The recipient and requester cannot approve their own access change." />
              <ServiceForm
                title={target.name + " · " + target.email}
                fields={[
                  {
                    name: "role",
                    label: "Requested role",
                    value: target.role,
                    options: accountRoles.map((value) => ({
                      value,
                      label: value === "customer" ? "Customer (remove staff access)"
                        : value === "commercial" ? "Commercial customer (remove staff access)"
                        : staffRoleLabel(value),
                    })),
                  },
                  {
                    name: "branchId",
                    label: "Requested branch",
                    value: target.branch_id ?? "lagos",
                    options: branches,
                  },
                  { name: "reason", label: "Business reason (10+ characters)" },
                ]}
                send={(v) =>
                  api("staff.access.request", { userId: target.id, ...v })
                }
                done={() => {
                  reload();
                  close();
                  setMessage(
                    "Access request submitted. Independent approvals are required in the Approval Centre.",
                  );
                }}
                submit="Request Access Change"
              />
              </details>
            </>
          ) : ["suspend", "reinstate"].includes(modal) ? (
            <>
              <p>
                {target.name} · {target.email}.{" "}
                {modal === "suspend"
                  ? "This immediately blocks sign-in and revokes current sessions."
                  : "The existing role is restored; old sessions remain revoked and the colleague must sign in again."}
              </p>
              <ServiceForm
                title="Confirm staff status change"
                fields={[{ name: "reason", label: "Reason (10+ characters)" }]}
                send={(v) => api("staff." + modal, { userId: target.id, ...v })}
                done={done}
                submit={
                  modal === "suspend"
                    ? "Confirm Suspension"
                    : "Confirm Reinstatement"
                }
              />
            </>
          ) : (
            <>
              <p>
                {target.name} · {target.email}.{" "}
                {modal === "resend"
                  ? "A new email replaces the previous invitation link and temporary password."
                  : "The outstanding invitation link will stop working."}
              </p>
              <ServiceForm
                title="Confirm invitation action"
                fields={[]}
                send={() =>
                  inviteAction(
                    "staff.invitation." +
                      (modal === "resend" ? "resend" : "revoke"),
                    { id: target.id },
                  )
                }
                done={modal === "revoke" ? done : undefined}
                submit={
                  modal === "resend"
                    ? "Resend Invitation Email"
                    : "Confirm Revocation"
                }
              />
            </>
          )}
        </Modal>
      )}
    </section>
  );
}
