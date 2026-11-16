"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CircleCheck,
  Search,
  Truck,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "./workspace-link";
import { FieldCaption } from "./field-caption";
import { FormInput } from "./password-input";
import StaffInvitation from "./staff-invitation";
import { api, Loading, Modal, Notice } from "./ui";

type Driver = {
  id: string;
  name: string;
  branch: string | null;
  active: boolean;
  driver_available: boolean;
  active_deliveries: number;
};
type Directory = {
  drivers: Driver[];
  canEdit: boolean;
  canManageAccounts: boolean;
  canChangeAvailability: boolean;
  branches: { value: string; label: string }[];
};

function DriverManagement({
  driver,
  canManageAccounts,
  canChangeAvailability,
  onSaved,
}: {
  driver: Driver;
  canManageAccounts: boolean;
  canChangeAvailability: boolean;
  onSaved: (message: string) => void;
}) {
  const [action, setAction] = useState("staff.edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [verify, setVerify] = useState(false);
  const [dirty, setDirty] = useState(false);
  const inFlight = useRef(false);
  const edit = action === "staff.edit";
  const suspend = action === "staff.suspend";
  const changeAvailability = action === "staff.driver.availability";
  const nextAvailable = !driver.driver_available;
  const availabilityLabel = nextAvailable
    ? "Mark available for dispatch"
    : "Mark unavailable";
  const label = changeAvailability
    ? availabilityLabel
    : edit
      ? "Save driver profile"
      : suspend
        ? "Suspend account"
        : "Reinstate account";
  const success = changeAvailability
    ? nextAvailable
      ? "Driver marked available for dispatch."
      : "Driver marked unavailable."
    : edit
      ? "Driver profile updated."
      : suspend
        ? "Driver account suspended."
        : "Driver account reinstated.";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = new FormData(event.currentTarget);
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      if (verify) {
        await api("reauth", { password: form.get("password") });
        setVerify(false);
      }
      await api(action, {
        userId: driver.id,
        reason: form.get("reason"),
        ...(changeAvailability ? { available: nextAvailable } : { expectedRole: "driver" }),
        ...(edit ? { name: form.get("name") } : {}),
      });
      onSaved(success);
    } catch (e) {
      const problem = e as Error & { code?: string };
      setError(problem.message);
      if (problem.code === "REAUTH_REQUIRED") setVerify(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form
      className="surface service-form product-form"
      onSubmit={submit}
      onChange={() => setDirty(true)}
      data-unsaved={dirty ? "true" : undefined}
    >
      <p className="muted">
        {driver.name} · {driver.branch ?? "No assigned branch"}
      </p>
      {(canManageAccounts || (canChangeAvailability && driver.active)) && (
        <label>
          <FieldCaption required>Action</FieldCaption>
          <select
            value={action}
            disabled={busy}
            onChange={(e) => {
              setAction(e.target.value);
              setError("");
            }}
          >
            <option value="staff.edit">Edit driver profile</option>
            {canChangeAvailability && driver.active && (
              <option value="staff.driver.availability">{availabilityLabel}</option>
            )}
            {canManageAccounts && (
              driver.active
                ? <option value="staff.suspend">Suspend account</option>
                : <option value="staff.reinstate">Reinstate account</option>
            )}
          </select>
        </label>
      )}
      {edit ? (
        <label>
          <FieldCaption required>Full name</FieldCaption>
          <input
            name="name"
            defaultValue={driver.name}
            minLength={2}
            maxLength={100}
            required
            disabled={busy}
          />
        </label>
      ) : (
        <Notice
          message={
            changeAvailability
              ? nextAvailable
                ? "Dispatch can consider this driver for new assignments. An active account and dispatch eligibility checks still apply."
                : "Pause new assignments for this driver. Resolve any active deliveries first."
              : suspend
                ? "Suspending this driver signs them out and removes them from future dispatch. Resolve any active deliveries first."
                : "Reinstating this driver restores sign-in. Set availability separately when the driver is ready."
          }
        />
      )}
      <label>
        <FieldCaption required>Reason for change</FieldCaption>
        <textarea
          name="reason"
          minLength={10}
          maxLength={1000}
          required
          disabled={busy}
        />
        <small className="muted">
          Enter at least 10 characters for Audit History.
        </small>
      </label>
      {error && <Notice type="error" message={error} />}
      {verify && (
        <label>
          <FieldCaption required>Current password</FieldCaption>
          <FormInput
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={busy}
          />
        </label>
      )}
      {busy && <Loading />}
      <button className="button" disabled={busy}>
        {verify ? "Verify and continue" : label}
      </button>
    </form>
  );
}

const perPage = 12;
const status = (driver: Driver) =>
  !driver.active
    ? "Suspended"
    : driver.driver_available
      ? "Available"
      : "Unavailable";

export default function DriversWorkspace({ refresh }: { refresh: number }) {
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [selected, setSelected] = useState<Driver | null>(null);
  const [invite, setInvite] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    api("drivers.workspace", undefined, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) {
          setDirectory(result);
          setError("");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          if (e.status === 401 || e.status === 403) setDirectory(null);
          setError(e.message);
        }
      });
    return () => controller.abort();
  }, [refresh, retry]);

  const drivers = directory?.drivers;
  const filtered =
    drivers?.filter(
      (driver) =>
        (!filter || status(driver) === filter) &&
        [driver.name, driver.branch]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    ) ?? [];
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = Math.min(page, pageCount);
  const from = (current - 1) * perPage;
  const stats = drivers && [
    {
      title: "Total drivers",
      value: drivers.length,
      Icon: UsersRound,
      tone: "green",
    },
    {
      title: "Active accounts",
      value: drivers.filter((d) => d.active).length,
      Icon: UserRound,
      tone: "blue",
    },
    {
      title: "Available for dispatch",
      value: drivers.filter((d) => d.active && d.driver_available).length,
      Icon: CircleCheck,
      tone: "green",
    },
    {
      title: "Active deliveries",
      value: drivers.reduce((sum, d) => sum + d.active_deliveries, 0),
      Icon: Truck,
      tone: "amber",
    },
  ];
  return (
    <section className="staff-screen driver-directory">
      <div className="staff-heading">
        <div>
          <h1>Drivers</h1>
          <p>
            Manage delivery drivers and review their availability and current
            assignments.
          </p>
        </div>
        <div className="staff-heading-actions">
          <Link className="button secondary" href="/admin/deliveries">
            Dispatch Centre
          </Link>
          {directory?.canManageAccounts && directory.branches.length > 0 && (
            <button className="button" onClick={() => setInvite(true)}>
              Invite driver
            </button>
          )}
        </div>
      </div>
      {message && <Notice type="success" message={message} />}
      {error && (
        <div>
          <Notice type="error" message={error} />
          <button
            className="button secondary"
            onClick={() => {
              setError("");
              setRetry((v) => v + 1);
            }}
          >
            Try again
          </button>
        </div>
      )}
      {!drivers && !error && <Loading />}
      {drivers && (
        <>
          <div className="staff-stats">
            {stats?.map(({ title, value, Icon, tone }) => (
              <article className="staff-stat" key={title}>
                <span className={"staff-stat-icon " + tone}>
                  <Icon size={25} aria-hidden="true" />
                </span>
                <div>
                  <strong>{value}</strong>
                  <h2>{title}</h2>
                </div>
              </article>
            ))}
          </div>
          <div className="staff-table-card">
            <div className="driver-directory-filters">
              <label className="staff-search">
                <Search size={18} aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Search drivers"
                  placeholder="Search by driver or branch"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <select
                aria-label="Filter drivers by status"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                {["Available", "Unavailable", "Suspended"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            {filtered.length ? (
              <>
                <div className="staff-table-scroll">
                  <table className="staff-table">
                    <thead>
                      <tr>
                        <th scope="col">Driver</th>
                        <th scope="col">Branch</th>
                        <th scope="col">Status</th>
                        <th scope="col">Active deliveries</th>
                        {directory?.canEdit && <th scope="col">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(from, from + perPage).map((driver) => (
                        <tr key={driver.id}>
                          <td>
                            <strong>{driver.name}</strong>
                          </td>
                          <td>{driver.branch ?? "No assigned branch"}</td>
                          <td>
                            <span
                              className={`staff-status ${!driver.active ? "suspended" : driver.driver_available ? "active" : "driver-unavailable"}`}
                            >
                              {status(driver)}
                            </span>
                          </td>
                          <td>{driver.active_deliveries}</td>
                          {directory?.canEdit && (
                            <td>
                              <button
                                className="button secondary"
                                aria-label={`Manage ${driver.name}`}
                                onClick={() => {
                                  setMessage("");
                                  setSelected(driver);
                                }}
                              >
                                Manage
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <footer className="staff-pagination">
                  <span>
                    Showing {from + 1}–
                    {Math.min(from + perPage, filtered.length)} of{" "}
                    {filtered.length} drivers
                  </span>
                  <div>
                    <button
                      className="button secondary"
                      disabled={current <= 1}
                      onClick={() => setPage(current - 1)}
                    >
                      Previous
                    </button>
                    <button
                      className="button secondary"
                      disabled={current >= pageCount}
                      onClick={() => setPage(current + 1)}
                    >
                      Next
                    </button>
                  </div>
                </footer>
              </>
            ) : (
              <div className="staff-empty">
                {drivers.length
                  ? "No drivers match your filters."
                  : "No drivers are registered in your workspace yet."}
              </div>
            )}
          </div>
          <p className="muted">
            Unavailable means new assignments are paused. Drivers can change
            their availability from Home in the driver workspace.
            {directory?.canChangeAvailability && " Authorised staff can also change it from Manage."}
            {" "}Dispatch Centre checks assignment eligibility separately.
          </p>
        </>
      )}
      {invite && directory?.canManageAccounts && (
        <Modal title="Invite driver" onClose={() => setInvite(false)}>
          <StaffInvitation
            branches={directory.branches}
            fixedRole="driver"
            send={(value) => api("staff.invite", value)}
          />
        </Modal>
      )}
      {selected && directory?.canEdit && (
        <Modal title="Manage driver" onClose={() => setSelected(null)}>
          <DriverManagement
            driver={selected}
            canManageAccounts={directory.canManageAccounts}
            canChangeAvailability={directory.canChangeAvailability}
            onSaved={(notice) => {
              setSelected(null);
              setMessage(notice);
              setRetry((v) => v + 1);
            }}
          />
        </Modal>
      )}
    </section>
  );
}
