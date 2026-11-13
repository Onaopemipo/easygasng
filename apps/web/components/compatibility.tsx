"use client";
import { useEffect, useState } from "react";
import { api, Loading, Notice } from "./ui";
import { ServiceForm } from "./professional-services";
export function Compatibility({
  productId,
  user,
  manage = false,
}: {
  productId: string;
  user?: any;
  manage?: boolean;
}) {
  const [rows, setRows] = useState<any[] | null>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  useEffect(() => {
    api(
      (manage ? "compatibility.manage" : "compatibility") +
        "?productId=" +
        encodeURIComponent(productId),
    )
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [productId, manage, version]);
  return (
    <section className="surface">
      <h3>Equipment compatibility records</h3>
      <p>
        Match the exact brand, model, connection and pressure specification.
        Unknown equipment requires professional confirmation.
      </p>
      {error && <Notice type="error" message={error} />}{" "}
      {!rows && !error && <Loading label="Loading compatibility records" />}
      {rows?.length === 0 && (
        <p>No independently reviewed compatibility records are published.</p>
      )}
      {rows?.map((c) => (
        <article className="quote-card" key={c.id}>
          <strong>
            {c.equipment_brand} · {c.equipment_model}
          </strong>
          <p>
            {c.connection_spec} · {c.pressure_spec}
          </p>
          <p>
            {c.status.replaceAll("_", " ")} ·{" "}
            {c.reviewed_by
              ? "Independently reviewed"
              : "Awaiting independent review"}
          </p>
          <p>{c.evidence}</p>
          {manage &&
            ["owner"].includes(user?.role) &&
            !c.reviewed_by &&
            c.proposed_by !== user.id && (
              <ServiceForm
                title="Review specification evidence"
                fields={[
                  {
                    name: "approve",
                    label:
                      "I have checked this specific equipment match and evidence",
                    type: "checkbox",
                  },
                ]}
                send={(v) => api("compatibility.review", { id: c.id, ...v })}
                done={reload}
              />
            )}
        </article>
      ))}
      {manage &&
        ["owner", "manager"].includes(user?.role) && (
          <ServiceForm
            title="Record a specific equipment match"
            fields={[
              { name: "equipmentBrand", label: "Equipment brand" },
              { name: "equipmentModel", label: "Exact equipment model" },
              {
                name: "connectionSpec",
                label: "Verified connection specification",
              },
              { name: "pressureSpec", label: "Verified operating pressure" },
              {
                name: "evidence",
                label: "Manufacturer specification / evidence reference",
                type: "textarea",
              },
              {
                name: "status",
                label: "Assessment",
                options: [
                  "unknown",
                  "professional_confirmation",
                  "verified_compatible",
                  "incompatible",
                ].map((value) => ({
                  value,
                  label: value.replaceAll("_", " "),
                })),
              },
            ]}
            send={(v) => api("compatibility.propose", { productId, ...v })}
            done={reload}
          />
        )}
    </section>
  );
}
