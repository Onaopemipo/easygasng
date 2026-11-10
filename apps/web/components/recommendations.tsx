"use client";
import {ProductHeading} from "./product-workspace";
import React, { useEffect, useState } from "react";
import Link from "./workspace-link";
import { api, Notice } from "./ui";
import { ServiceForm } from "./professional-services";
export function Recommendations({ productId }: { productId?: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    api(
      "recommendations" +
        (productId ? "?productId=" + encodeURIComponent(productId) : ""),
    )
      .then((r) => {
        setRows(r);
        for (const row of r)
          api("recommendation.event", {
            ruleId: row.id,
            kind: "displayed",
          }).catch(() => {});
      })
      .catch(() => setRows([]));
  }, [productId]);
  return rows.length ? (
    <section className="surface">
      <h2>Professional support for your equipment</h2>
      {rows.map((r) => (
        <div key={r.id}>
          <h3>{r.service}</h3>
          <p>{r.message}</p>
          <Link
            className="text-link"
            href={"/services/" + r.service_id + "?recommendation=" + r.id}
            onClick={() => {
              api("recommendation.event", {
                ruleId: r.id,
                kind: "selected",
              }).catch(() => {});
            }}
          >
            View service and available appointments →
          </Link>
        </div>
      ))}
    </section>
  ) : null;
}
export default function RecommendationAdmin({ user }: { user: any }) {
  const [rows, setRows] = useState<any[]>([]),
    [products, setProducts] = useState<any[]>([]),
    [services, setServices] = useState<any[]>([]),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  const reload = () => setVersion((n) => n + 1);
  useEffect(() => {
    Promise.all([
      api("recommendations.manage"),
      api("products.manage"),
      api("services.manage"),
    ])
      .then(([r, p, s]) => {
        setRows(r);
        setProducts(p.products);
        setServices(s.services);
      })
      .catch((e) => setError(e.message));
  }, [version]);
  return (
    <section className="product-workspace governed-workspace">
      <ProductHeading eyebrow="GROWTH & ENGAGEMENT" title="Product & service recommendations" description="Manage relevant service suggestions and review their performance." />
      <p>
        Rules require independent review. Suggestions never add paid items
        automatically or assert unverified compatibility. Completed appointments
        are counted separately from clicks.
      </p>
      {error && <Notice type="error" message={error} />}{" "}
      {["owner", "service_manager"].includes(user.role) && (
        <ServiceForm
          title="Propose an assessment recommendation"
          done={reload}
          fields={[
            {
              name: "productId",
              label: "Product",
              options: products.map((p) => ({ value: p.id, label: p.name })),
            },
            {
              name: "serviceId",
              label: "Service",
              options: services.map((s) => ({ value: s.id, label: s.name })),
            },
            {
              name: "relation",
              label: "Relationship",
              options: [
                {
                  value: "assessment",
                  label: "Professional assessment offered",
                },
                {
                  value: "unknown",
                  label: "Compatibility unknown; assessment required",
                },
                {
                  value: "incompatible",
                  label: "Known incompatible — never recommend",
                },
              ],
            },
            {
              name: "evidence",
              label: "Rationale and specification evidence",
              type: "textarea",
            },
          ]}
          send={(v) =>
            api("recommendation.propose", {
              branchId: user.branchId ?? "lagos",
              ...v,
            })
          }
        />
      )}{" "}
      {rows.map((r) => (
        <article className="surface" key={r.id}>
          <h2>
            {r.product} → {r.service}
          </h2>
          <p>{r.evidence}</p>
          <p>
            {r.relation} · {r.active ? "Active" : "Inactive / awaiting review"}
          </p>
          <p>
            Displayed {r.displayed} · Selected {r.selected} · Booked {r.booked}{" "}
            · Completed {r.completed}
          </p>
          {["owner", "safety_officer"].includes(user.role) &&
            user.id !== r.created_by && (
              <ServiceForm
                title="Record independent review"
                done={reload}
                fields={[
                  {
                    name: "active",
                    label: "Enable after reviewing evidence and wording",
                    type: "checkbox",
                    value: r.active,
                  },
                ]}
                send={(v) => api("recommendation.approve", { id: r.id, ...v })}
              />
            )}
        </article>
      ))}
    </section>
  );
}
