"use client";
import { useEffect, useState } from "react";
import { api, Loading, Notice } from "./ui";
export function VehicleManifestPanel({ user, Form }: { user: any; Form: any }) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);
  useEffect(() => {
    let active = true;
    api("manifest.summary")
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [tick]);
  const stock = ["owner", "finance"].includes(user.role),
    driver = user.role === "driver",
    evidence = [
      { name: "evidence", label: "Actual count / inspection evidence" },
      { name: "reason", label: "Reason" },
    ];
  return (
    <details className="panel">
      <summary>Vehicle product manifests and returns</summary>
      <p>
        Branch stock remains inclusive of vehicle custody. Only independently
        acknowledged stock can be offered at the doorstep. Actual measured
        payload capacity, serials and returns must reconcile.
      </p>
      {error && <Notice type="error" message={error} />}
      {!data && !error && <Loading label="Loading vehicle manifests" />}
      {data && stock && (
        <Form
          title="Request existing vehicle payload update"
          action="fleet.vehicle.payload.request"
          onDone={refresh}
          fields={[
            {
              name: "vehicleId",
              label: "Vehicle",
              options:
                data?.trips.map((t: any) => ({
                  value: t.vehicle_id,
                  label: t.label,
                })) ?? [],
            },
            {
              name: "physicalCapacityGrams",
              label: "Measured / certified physical product capacity (grams)",
              type: "number",
            },
            { name: "evidence", label: "Capacity evidence" },
            { name: "reason", label: "Reason for independent safety review" },
          ]}
        />
      )}
      {stock && data && (
        <Form
          title="Issue measured physical stock"
          action="manifest.issue"
          onDone={refresh}
          fields={[
            {
              name: "tripId",
              label: "Active trip",
              options: data.trips.map((t: any) => ({
                value: t.id,
                label: `${t.label} · ${t.branch_id} · physical capacity ${t.physical_capacity_grams ?? "unconfigured"} g`,
              })),
            },
            {
              name: "productId",
              label: "Catalogue product",
              options:
                data.products?.map((p: any) => ({
                  value: p.id,
                  label: `${p.name} · ${p.branch_id} · ${p.available} available`,
                })) ?? [],
            },
            { name: "quantity", label: "Actual units loaded", type: "number" },
            {
              name: "unitWeightGrams",
              label: "Measured packed weight per unit (grams)",
              type: "number",
            },
            {
              name: "serialIds",
              label:
                "Exact cylinder IDs (comma separated; leave empty for accessories)",
              type: "csv",
              optional: true,
            },
            ...evidence,
          ]}
        />
      )}
      {data?.loads.map((l: any) => {
        const context = [
          { name: "manifestId", label: "Manifest ID", value: l.id },
          {
            name: "version",
            label: "Current manifest version",
            type: "number",
            value: l.version,
          },
        ];
        const returned = [
          ...context,
          {
            name: "foundQuantity",
            label: "Actual units independently found",
            type: "number",
          },
          {
            name: "saleableQuantity",
            label: "Units independently inspected safe for sale",
            type: "number",
          },
          {
            name: "foundSerialIds",
            label: "Actual cylinder IDs found (comma separated)",
            type: "csv",
            optional: true,
          },
          {
            name: "saleableSerialIds",
            label: "Safe cylinder IDs (comma separated)",
            type: "csv",
            optional: true,
          },
          ...evidence,
        ];
        return (
          <article className="panel" key={`${l.id}:${l.version}`}>
            <h3>
              {l.name} · {l.label}
            </h3>
            <p>
              Manifest {l.id} · {l.state} · available on vehicle {l.available} ·
              reserved {l.reserved} · handed over {l.handed} · returned{" "}
              {l.returned} · removed after approved loss/quarantine {l.removed}
            </p>
            {l.serials.length > 0 && (
              <p>
                Serials:{" "}
                {l.serials
                  .map((s: any) => `${s.serial}: ${s.state}`)
                  .join("; ")}
              </p>
            )}
            {driver && l.state === "issued" && (
              <Form
                title="Acknowledge actual stock received"
                action="manifest.acknowledge"
                onDone={refresh}
                fields={[
                  ...context,
                  {
                    name: "quantity",
                    label: "Actual units received",
                    type: "number",
                  },
                  {
                    name: "serialIds",
                    label: "Exact cylinder IDs received (comma separated)",
                    type: "csv",
                    optional: true,
                  },
                  ...evidence,
                ]}
              />
            )}
            {driver && ["issued", "active", "held"].includes(l.state) && (
              <Form
                title="Declare actual remaining stock for return"
                action="manifest.return.declare"
                onDone={refresh}
                fields={[
                  ...context,
                  {
                    name: "quantity",
                    label: "Actual units returned",
                    type: "number",
                  },
                  {
                    name: "serialIds",
                    label: "Actual cylinder IDs returned (comma separated)",
                    type: "csv",
                    optional: true,
                  },
                  ...evidence,
                ]}
              />
            )}
            {stock &&
              (["returning", "held"].includes(l.state) ||
                (l.driver_active === false &&
                  ["issued", "active"].includes(l.state))) && (
                <>
                  <Form
                    title="Independently receive counted return"
                    action="manifest.return.receive"
                    onDone={refresh}
                    fields={returned}
                  />
                  {user.role === "finance" && (
                    <Form
                      title="Request owner and finance discrepancy review"
                      action="manifest.return.review"
                      onDone={refresh}
                      fields={returned}
                    />
                  )}
                </>
              )}
            <details>
              <summary>Custody history</summary>
              <ul>
                {l.events.map((e: any, i: number) => (
                  <li key={i}>
                    {new Date(e.created_at).toLocaleString()} · {e.kind} ·{" "}
                    {e.detail.reason ?? ""}
                  </li>
                ))}
              </ul>
            </details>
          </article>
        );
      })}
    </details>
  );
}
