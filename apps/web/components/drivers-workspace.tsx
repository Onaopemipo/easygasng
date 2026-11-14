"use client";

import { useEffect, useState } from "react";
import {
  CircleCheck,
  Search,
  Truck,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "./workspace-link";
import { api, Loading, Notice } from "./ui";

type Driver = {
  id: string;
  name: string;
  branch: string | null;
  active: boolean;
  driver_available: boolean;
  active_deliveries: number;
};
const perPage = 12;
const status = (driver: Driver) =>
  !driver.active
    ? "Suspended"
    : driver.driver_available
      ? "Available"
      : "Unavailable";

export default function DriversWorkspace({ refresh }: { refresh: number }) {
  const [drivers, setDrivers] = useState<Driver[] | null>(null);
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
          setDrivers(result.drivers);
          setError("");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [refresh, retry]);

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
            View delivery drivers, their dispatch availability and current
            assignments.
          </p>
        </div>
        <div className="staff-heading-actions">
          <Link className="button secondary" href="/admin/deliveries">
            Dispatch Centre
          </Link>
          <Link className="button" href="/admin/staff">
            Manage staff
          </Link>
        </div>
      </div>
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
                              className={`staff-status ${!driver.active ? "suspended" : driver.driver_available ? "active" : ""}`}
                            >
                              {status(driver)}
                            </span>
                          </td>
                          <td>{driver.active_deliveries}</td>
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
            Availability is the driver’s dispatch preference. Assignment
            eligibility is checked in Dispatch Centre.
          </p>
        </>
      )}
    </section>
  );
}
