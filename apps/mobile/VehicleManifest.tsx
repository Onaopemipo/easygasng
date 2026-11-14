import React, { useEffect, useState } from "react";
import { Card, Copy, Title, Feedback, type CustomerAPI } from "./CustomerUI";
import { NativeForm } from "./Workflows";
/** Online custody changes use the same canonical manifest and operation receipts as the web. */
export default function VehicleManifest({ api }: { api: CustomerAPI }) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [tick, setTick] = useState(0);
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
  return (
    <Card>
      <Title>Vehicle product stock</Title>
      <Copy>
        Actual acknowledged units only. Branch availability is not vehicle
        stock. Cash, stock discrepancies and return approval require independent
        operations review.
      </Copy>
      <Feedback loading={!data} error={error} retry={() => setTick(n => n + 1)} />
      {data?.loads
        .filter((l: any) => l.state !== "reconciled")
        .map((l: any) => (
          <Card key={`${l.id}:${l.version}`}>
            <Title>{l.name}</Title>
            <Copy>
              {l.state} · available {l.available} · reserved {l.reserved} ·
              handed over {l.handed}
            </Copy>
            {l.serials.length > 0 && (
              <Copy>
                {l.serials
                  .map((s: any) => `${s.serial}: ${s.state}`)
                  .join("; ")}
              </Copy>
            )}
            {[
              ...(l.state === "issued" ? ["acknowledge"] : []),
              ...(["active", "issued", "held"].includes(l.state)
                ? ["return.declare"]
                : []),
            ].map((action) => (
              <NativeForm
                key={action}
                api={(a, d) =>
                  api(a, {
                    ...d,
                    serialIds: String(d.serialIds ?? "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                action={`manifest.${action}`}
                title={
                  action === "acknowledge"
                    ? "Acknowledge actual stock received"
                    : "Declare actual remaining return"
                }
                fields={[
                  {
                    name: "manifestId",
                    label: "Manifest",
                    value: l.id,
                    type: "hidden",
                  },
                  {
                    name: "version",
                    label: "Version",
                    value: Number(l.version),
                    type: "hidden",
                  },
                  {
                    name: "quantity",
                    label: "Actual counted units",
                    type: "number",
                  },
                  {
                    name: "serialIds",
                    required: Boolean(l.serialized && action === "acknowledge"),
                    label: l.serialized
                      ? action === "acknowledge"
                        ? "Cylinder IDs actually counted, comma separated"
                        : "Cylinder IDs, required for each returned cylinder"
                      : "Cylinder IDs (leave blank for accessories)",
                  },
                  { name: "evidence", label: "Count evidence" },
                  { name: "reason", label: "Reason" },
                ]}
                onDone={() => setTick((n) => n + 1)}
              />
            ))}
          </Card>
        ))}
    </Card>
  );
}
