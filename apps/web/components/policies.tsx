"use client";
import {ProductHeading} from "./product-workspace";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, Notice, Loading } from "./ui";
import { ServiceForm } from "./professional-services";
export function LegalDocument({
  kind,
  compact = false,
}: {
  kind?: string;
  compact?: boolean;
}) {
  const [rows, setRows] = useState<any[] | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("policies")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  if (error) return <Notice type="error" message={error} />;
  if (!rows) return <Loading />;
  const doc = rows.find((r) => r.kind === kind);
  if (kind && !doc)
    return (
      <section className="surface">
        <h2>Policy awaiting business publication</h2>
        <p>
          EasyGas must publish its reviewed {kind.replaceAll("-", " ")} policy
          before the affected commercial workflow launches.
        </p>
        <Link href="/contact">Contact EasyGas</Link>
      </section>
    );
  if (!kind)
    return (
      <section>
        <h1>Customer policies</h1>
        {!rows.length && (
          <Notice message="Reviewed customer policies have not been published. The platform remains in pre-launch preparation." />
        )}
        {rows.map((r) => (
          <article className="surface" key={r.kind}>
            <h2>{r.title}</h2>
            <p>
              Version {r.version} · Effective{" "}
              {new Date(r.effective_at).toLocaleDateString()}
            </p>
            <div className="policy-content">{r.content}</div>
          </article>
        ))}
      </section>
    );
  return (
    <article className="surface">
      {compact ? <h2>{doc.title}</h2> : <h1>{doc.title}</h1>}
      <p>
        Version {doc.version} · Effective{" "}
        {new Date(doc.effective_at).toLocaleDateString()}
      </p>
      <div className="policy-content">{doc.content}</div>
    </article>
  );
}
export default function PolicyAdmin({ user }: { user: any }) {
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    api("policies.manage")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [version]);
  return (
    <section className="product-workspace governed-workspace">
      <ProductHeading eyebrow="ADMINISTRATION & CONTROL" title="Customer policy publication" description="Manage policy versions and review publication requests." />
      <p>
        Use business-reviewed text. Publishing a document does not establish
        legal, financial or LPG certification. An independent owner must approve
        each proposal.
      </p>
      {error && <Notice type="error" message={error} />}{" "}
      {rows.map((r) => (
        <details className="surface" key={r.kind + ":" + version}>
          <summary>
            {r.title} · {r.published ? "Published" : "Draft"}
          </summary>
          {user.role === "owner" ? (
            <ServiceForm
              title="Propose policy content"
              submit="Request independent owner approval"
              fields={[
                { name: "title", label: "Title", value: r.title },
                {
                  name: "content",
                  label: "Reviewed policy text",
                  type: "textarea",
                  value: r.content,
                },
                {
                  name: "published",
                  label: "Publish after approval and effective date",
                  type: "checkbox",
                  value: r.published,
                },
                {
                  name: "effectiveAt",
                  label: "Effective date and time (device timezone)",
                  type: "datetime-local",
                  value: r.effective_at
                    ? new Date(
                        new Date(r.effective_at).getTime() -
                          new Date().getTimezoneOffset() * 60000,
                      )
                        .toISOString()
                        .slice(0, 16)
                    : "",
                },
                { name: "reason", label: "Review reference and reason" },
              ]}
              done={() => setVersion((n) => n + 1)}
              send={(v) =>
                api("setting.propose", {
                  key: "legal." + r.kind,
                  scope: "lagos",
                  version: r.version,
                  value: {
                    title: v.title,
                    content: v.content,
                    published: v.published,
                    effectiveAt: v.effectiveAt,
                  },
                  reason: v.reason,
                })
              }
            />
          ) : (
            <p className="policy-content">
              {r.content || "No reviewed content entered."}
            </p>
          )}
        </details>
      ))}
    </section>
  );
}
