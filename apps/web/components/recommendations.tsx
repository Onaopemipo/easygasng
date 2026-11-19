"use client";
import { ProductHeading } from "./product-workspace";
import React, { useEffect, useState } from "react";
import Link from "./workspace-link";
import {
  DialogDraft,
  WorkspaceDialog,
  WorkspaceTabs,
} from "./compact-workspace";
import { RecommendationRecords, relationLabels } from "./engagement-records";
import { FormInput } from "./password-input";
import { api, Loading, Notice, Modal } from "./ui";
import { ServiceForm } from "./professional-services";
export function Recommendations({ productId }: { productId?: string }) {
  const [rows, setRows] = useState<any[] | null>(null);
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
  if (!rows) return <Loading label="Loading service recommendations" />;
  return rows.length ? (
    <section className="surface">
      <h2>Professional support for your equipment</h2>
      {rows?.map((r) => (
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
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    Promise.all([
      api("recommendations.manage", undefined, { signal: controller.signal }),
      api("products.manage", undefined, { signal: controller.signal }),
      api("services.manage", undefined, { signal: controller.signal }),
    ])
      .then(([rows, products, services]) => {
        if (!controller.signal.aborted)
          setData({
            rows,
            products: products.products,
            services: services.services,
          });
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [version, user.id, user.branchId]);
  if (error)
    return (
      <>
        <Notice type="error" message={error} />
        <button className="button secondary" onClick={reload}>
          Retry recommendations
        </button>
      </>
    );
  if (!data) return <Loading label="Loading recommendation records" />;
  return <RecommendationWorkspace user={user} {...data} reload={reload} />;
}
export function RecommendationWorkspace({
  user,
  rows,
  products,
  services,
  reload,
}: {
  user: any;
  rows: any[];
  products: any[];
  services: any[];
  reload: () => void;
}) {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [creating, setCreating] = useState(false),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [tab, setTab] = useState("rules");
  const visible = rows.filter(
    (r) =>
      (!status || (status === "active" ? r.active : !r.active)) &&
      `${r.product} ${r.service}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const selected = rows.find((r) => r.id === selectedId);
  return (
    <section className="admin-compact growth-workspace recommendations-workspace">
      <div className="compact-toolbar">
        <ProductHeading
          eyebrow="GROWTH & ENGAGEMENT"
          title="Recommendations"
          description="Manage reviewed product and service suggestions."
        />
        {["owner", "manager"].includes(user.role) && (
          <button className="button" onClick={() => setCreating(true)}>
            Propose rule
          </button>
        )}
      </div>
      <WorkspaceTabs
        label="Recommendation workspace"
        value={tab}
        onChange={setTab}
        tabs={[
          ["rules", "Rules"],
          ["performance", "Performance"],
        ]}
      />
      {tab === "rules" ? (
        <section className="surface">
          <div className="compact-toolbar">
            <FormInput
              className="compact-search"
              type="search"
              aria-label="Search recommendation rules"
              placeholder="Search product or service…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="compact-actions">
              <select
                aria-label="Recommendation status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive / awaiting review</option>
              </select>
              <button className="button secondary" onClick={reload}>
                Refresh
              </button>
            </div>
          </div>
          <p className="muted">{visible.length} matching rules</p>
          <RecommendationRecords
            key={`${search}:${status}`}
            rows={visible}
            open={(r) => setSelectedId(r.id)}
          />
        </section>
      ) : (
        <section className="surface">
          <h2>Recommendation performance</h2>
          <p>
            Recorded events in the loaded rules. Completed appointments are
            separate from selections and bookings.
          </p>
          <div className="compact-metrics">
            {["displayed", "selected", "booked", "completed"].map((key) => (
              <article className="surface" key={key}>
                <h3>{key.charAt(0).toUpperCase() + key.slice(1)}</h3>
                <strong>
                  {rows.reduce((sum, r) => sum + Number(r[key] ?? 0), 0)}
                </strong>
              </article>
            ))}
          </div>
        </section>
      )}
      <WorkspaceDialog
        title="Recommendation review rules"
        trigger="Review rules"
      >
        <p>
          Rules require independent review. Suggestions never add paid items
          automatically or assert unverified compatibility. Incompatible items
          must never be recommended.
        </p>
      </WorkspaceDialog>
      {creating && (
        <Modal
          className="compact-dialog"
          title="Propose recommendation rule"
          onClose={() => setCreating(false)}
        >
          <DialogDraft>
            <ServiceForm
              title="Assessment recommendation"
              submit="Submit for independent review"
              done={() => {
                setCreating(false);
                reload();
              }}
              fields={[
                {
                  name: "productId",
                  label: "Product",
                  options: products.map((p) => ({
                    value: p.id,
                    label: p.name,
                  })),
                },
                {
                  name: "serviceId",
                  label: "Service",
                  options: services.map((s) => ({
                    value: s.id,
                    label: s.name,
                  })),
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
          </DialogDraft>
        </Modal>
      )}
      {selected && (
        <Modal
          className="compact-dialog"
          title="Review recommendation"
          onClose={() => setSelectedId(null)}
        >
          <h3>
            {selected.product} → {selected.service}
          </h3>
          <p>
            {relationLabels[selected.relation]} ·{" "}
            {selected.active ? "Active" : "Inactive / awaiting review"}
          </p>
          <p className="growth-message">{selected.evidence}</p>
          <p>
            Displayed {selected.displayed} · Selected {selected.selected} ·
            Booked {selected.booked} · Completed {selected.completed}
          </p>
          {user.role === "owner" && user.id !== selected.created_by ? (
            <DialogDraft>
              <ServiceForm
                title="Independent review"
                submit="Save review"
                done={() => {
                  setSelectedId(null);
                  reload();
                }}
                fields={[
                  {
                    name: "active",
                    label: "Enable after reviewing evidence and wording",
                    type: "checkbox",
                    value: selected.active,
                  },
                ]}
                send={(v) =>
                  api("recommendation.approve", { id: selected.id, ...v })
                }
              />
            </DialogDraft>
          ) : (
            <p>A different authorised owner must review this rule.</p>
          )}
        </Modal>
      )}
    </section>
  );
}
