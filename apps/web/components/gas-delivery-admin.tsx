"use client";
import { useEffect, useState } from "react";
import { api, Notice, money } from "./ui";
import {
  gasReportRows,
  gasReportCsv,
  gasReportExcel,
  gasReportHtml,
} from "../../../packages/business-rules/src/gas-report-export";
import { ActionForm } from "./workflows";
export default function GasDeliveryAdmin({
  user,
  settings,
  onEdit,
  refresh,
  onRefresh,
}: {
  user: any;
  settings: any[];
  onEdit: (s: any) => void;
  refresh: number;
  onRefresh: () => void;
}) {
  const [locations, setLocations] = useState<any[]>([]),
    [stock, setStock] = useState<any[]>([]),
    [inspections, setInspections] = useState<any[]>([]),
    [report, setReport] = useState<any>(null),
    [error, setError] = useState(""),
    [add, setAdd] = useState(false),
    [tick, setTick] = useState(0);
  useEffect(() => {
    if (
      ["owner", "manager", "finance"].includes(
        user.role,
      )
    )
      api("delivery.locations.manage")
        .then(setLocations)
        .catch((e) => setError(e.message));
    if (["owner", "finance"].includes(user.role))
      api("gas.inspections")
        .then(setInspections)
        .catch((e) => setError(e.message));
    if (["owner", "manager", "finance"].includes(user.role))
      api("gas.stock")
        .then(setStock)
        .catch((e) => setError(e.message));
  }, [refresh, tick, user.role]);
  return (
    <section className="surface">
      <h2>Gas pricing & delivery</h2>
      <p>
        Manage home delivery prices and confirmed coverage. The Approval Centre
        records changes and any reviews they require.
      </p>
      <div className="metric-grid">
        {["gas.price_per_kg", "delivery.fee"].map((k) => {
          const s = settings.find((x) => x.key === k);
          return (
            s && (
              <article className="surface" key={k}>
                <h3>{s.label}</h3>
                <strong>
                  {money(s.value)}
                  {k === "gas.price_per_kg" ? "/kg" : "/order"}
                </strong>
                <p>Version {s.version}</p>
                {s.propose_roles.includes(user.role) && (
                  <button className="button" onClick={() => onEdit(s)}>
                    Update or schedule
                  </button>
                )}
              </article>
            )
          );
        })}
      </div>
      <details>
        <summary>Manage gas stock, delivery locations and reports</summary>
        <p>
          Verified bulk gas available:{" "}
          {stock
            .map(
              (s) =>
                `${s.branch_id}: ${(Number(s.grams) - Number(s.reserved_grams)) / 1000} kg`,
            )
            .join(" · ") || "Not available to this role"}
        </p>
        {["owner", "finance"].includes(user.role) && (
          <ActionForm
            action="gas.stock.receive"
            title="Receive verified bulk gas"
            fields={[
              {
                name: "branchId",
                label: "Branch ID",
                value: user.branchId ?? "lagos",
              },
              { name: "grams", label: "Received gas (grams)", type: "number" },
              { name: "reference", label: "Supplier receipt reference" },
              { name: "reason", label: "Physical count and receipt evidence" },
            ]}
            onDone={() => setTick((t) => t + 1)}
          />
        )}
        {["owner", "finance"].includes(user.role) && (
          <section>
            <h3>Gas filling inspections</h3>
            {inspections.map((g) => (
              <div className="surface" key={g.id}>
                <p>
                  {g.reference} · {Number(g.grams) / 1000} kg gas ·{" "}
                  {Number(g.capacity_grams) / 1000} kg cylinder
                </p>
                <ActionForm
                  action="gas.cylinder.intake"
                  title="Register a customer-owned cylinder intake"
                  fields={[
                    {
                      name: "lineId",
                      type: "hidden",
                      label: "Gas line",
                      value: g.id,
                    },
                    { name: "serial", label: "Verified manufacturer serial" },
                    {
                      name: "sizeKg",
                      label: "Physical cylinder capacity (kg)",
                      type: "number",
                      step: "0.001",
                      value: Number(g.capacity_grams) / 1000,
                    },
                    {
                      name: "testDue",
                      label: "Documented test due date",
                      type: "date",
                    },
                    {
                      name: "reason",
                      label: "Verified physical intake and ownership evidence",
                    },
                  ]}
                  onDone={() => setTick((t) => t + 1)}
                />
                <p>
                  New customer intakes remain quarantined until a documented
                  inspection is completed in Cylinders. Existing serials must
                  use their current record and return-custody controls.
                </p>
                <ActionForm
                  action="gas.inspection.record"
                  title="Record physical cylinder filling eligibility"
                  fields={[
                    {
                      name: "lineId",
                      label: "Gas line",
                      type: "hidden",
                      value: g.id,
                    },
                    { name: "cylinderId", label: "Cylinder record ID" },
                    {
                      name: "allowableKg",
                      label: "Verified additional fill allowance (kg)",
                      type: "number",
                      step: "0.001",
                    },
                    {
                      name: "reason",
                      label:
                        "Physical intake, residual gas and inspection evidence",
                    },
                  ]}
                  onDone={() => setTick((t) => t + 1)}
                />
              </div>
            ))}
          </section>
        )}
        <h3>Delivery Locations</h3>
        {["owner", "manager"].includes(user.role) && (
          <button className="button secondary" onClick={() => setAdd(!add)}>
            Add delivery location
          </button>
        )}
        {add && (
          <ActionForm
            action="delivery.location.create"
            title="Propose a new location"
            fields={[
              { name: "config.name", label: "Location name" },
              { name: "config.city", label: "City", value: "Lagos" },
              { name: "config.state", label: "State", value: "Lagos" },
              { name: "config.country", label: "Country", value: "Nigeria" },
              {
                name: "config.branchId",
                label: "Fulfilment branch ID",
                value: user.branchId ?? "lagos",
              },
              {
                name: "config.active",
                label: "Activate after approval",
                type: "checkbox",
                value: true,
              },
              {
                name: "config.visible",
                label: "Visible to customers after approval",
                type: "checkbox",
                value: true,
              },
              {
                name: "config.archived",
                label: "Archive",
                type: "checkbox",
                value: false,
              },
              {
                name: "config.displayOrder",
                label: "Display order",
                type: "number",
                value: 5,
              },
              {
                name: "config.coverage",
                label: "Business-confirmed coverage definition",
                required: false,
              },
              {
                name: "config.description",
                label: "Customer description",
                required: false,
              },
              { name: "reason", label: "Reason for adding this location" },
            ]}
            onDone={() => {
              setAdd(false);
              onRefresh();
              setTick((t) => t + 1);
            }}
          />
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Location</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Orders / Delivered</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((l) => (
                <tr key={l.id}>
                  <td>
                    {l.name}
                    <small>
                      {l.coverage || "Boundary verification required"}
                    </small>
                  </td>
                  <td>{l.branch_id}</td>
                  <td>
                    {l.archived ? "Archived" : l.active ? "Active" : "Inactive"}
                  </td>
                  <td>
                    {l.order_count} / {l.delivered_count}
                  </td>
                  <td>
                    <button
                      className="text-link"
                      onClick={() => {
                        const s = settings.find(
                          (s) => s.key === "location." + l.id,
                        );
                        if (s) onEdit(s);
                        else
                          setError(
                            "Refresh Settings to load the new governed location.",
                          );
                      }}
                    >
                      Manage location
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {["owner", "finance", "manager"].includes(user.role) && (
          <>
            <h3>Gas & delivery reporting</h3>
            <ActionForm
              action="gas.report"
              title="Filter gas sales report"
              fields={[
                {
                  name: "branchId",
                  label: "Branch ID (optional)",
                  required: false,
                },
                {
                  name: "capacityKg",
                  label: "Cylinder capacity (kg)",
                  type: "number",
                  step: "0.001",
                  required: false,
                },
                {
                  name: "minimumKg",
                  label: "Minimum order gas (kg)",
                  type: "number",
                  step: "0.001",
                  required: false,
                },
                {
                  name: "maximumKg",
                  label: "Maximum order gas (kg)",
                  type: "number",
                  step: "0.001",
                  required: false,
                },
                {
                  name: "customerCategory",
                  label: "Customer category",
                  required: false,
                  options: [
                    { value: "customer", label: "Household customer" },
                    { value: "commercial", label: "Business customer" },
                  ],
                },
                {
                  name: "from",
                  label: "From date",
                  type: "date",
                  required: false,
                },
                { name: "to", label: "To date", type: "date", required: false },
                {
                  name: "locationId",
                  label: "Delivery location",
                  required: false,
                  options: locations.map((l) => ({
                    value: l.id,
                    label: l.name,
                  })),
                },
                { name: "status", label: "Order status", required: false },
                {
                  name: "paymentStatus",
                  label: "Payment status",
                  required: false,
                },
              ]}
              submit="Run report"
              onResult={setReport}
            />
            {report && (
              <>
                <div className="metric-grid">
                  {Object.entries(report.summary).map(([key, value]) => (
                    <article className="surface" key={key}>
                      <h4>
                        {key.replace(/([A-Z])/g, " $1").replace("Kobo", "(₦)")}
                      </h4>
                      <strong>
                        {key.endsWith("Kobo")
                          ? money(Number(value))
                          : String(value)}
                      </strong>
                    </article>
                  ))}
                </div>
                <p>
                  Revenue is separate from verified receipts and profit.
                  Historical transactions retain their recorded prices.
                </p>
                <div className="button-row">
                  {[
                    ["CSV", "text/csv", "csv"],
                    ["Excel", "application/vnd.ms-excel", "xml"],
                  ].map(([label, type, extension]) => (
                    <button
                      className="button secondary"
                      key={label}
                      onClick={() => {
                        const rows = gasReportRows(report),
                          data =
                            label === "CSV"
                              ? gasReportCsv(rows)
                              : gasReportExcel(rows);
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(
                          new Blob([data], { type }),
                        );
                        a.download = "easygas-gas-delivery." + extension;
                        a.click();
                        URL.revokeObjectURL(a.href);
                      }}
                    >
                      Export {label}
                    </button>
                  ))}
                  <button
                    className="button secondary"
                    onClick={() => {
                      const w = window.open("", "_blank");
                      if (w) {
                        w.document.write(gasReportHtml(gasReportRows(report)));
                        w.document.close();
                        w.print();
                      }
                    }}
                  >
                    Print / Save PDF
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <tbody>
                      {gasReportRows(report).map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) =>
                            i === 0 ? (
                              <th key={j}>{cell}</th>
                            ) : (
                              <td key={j}>{cell}</td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </details>
      {error && <Notice type="error" message={error} />}
    </section>
  );
}
