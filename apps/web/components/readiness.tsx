"use client";
import {ProductHeading} from "./product-workspace";
import React, { useEffect, useState } from "react";
import { api, Loading, Notice } from "./ui";
export default function Readiness() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    api("production.readiness")
      .then(setData)
      .catch((e) => setError(e.message));
  }, [version]);
  if (error)
    return (
      <>
        <Notice type="error" message={error} />
        <button
          className="button"
          onClick={() => {
            setError("");
            setVersion((v) => v + 1);
          }}
        >
          Retry
        </button>
      </>
    );
  if (!data) return <Loading />;
  return (
    <section className="product-workspace readiness-workspace">
      <ProductHeading eyebrow="LAUNCH READINESS" title={`Production readiness · ${data.recommendation}`} description="Review launch gates, their supporting evidence and outstanding work." />
      <p>
        Automated checks and remaining evidence requirements. These checks do
        not authorise deployment or certify safety, compliance or financial
        operations.
      </p>
      <p>Checked {new Date(data.checkedAt).toLocaleString()}</p>
      {data.gates.map((g: any) => (
        <article className="surface readiness-gate" key={g.id} data-status={g.status}>
          <h2>
            {g.id}. {g.name} · {g.status}
          </h2>
          <p>{g.evidence}</p>
        </article>
      ))}
    </section>
  );
}
