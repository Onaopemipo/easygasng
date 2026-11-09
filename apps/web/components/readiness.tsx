"use client";
import { useEffect, useState } from "react";
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
    <section>
      <h1>Production readiness · {data.recommendation}</h1>
      <p>
        Automated checks and remaining evidence requirements. These checks do
        not authorise deployment or certify safety, compliance or financial
        operations.
      </p>
      <p>Checked {new Date(data.checkedAt).toLocaleString()}</p>
      {data.gates.map((g: any) => (
        <article className="surface" key={g.id}>
          <h2>
            {g.id}. {g.name} · {g.status}
          </h2>
          <p>{g.evidence}</p>
        </article>
      ))}
    </section>
  );
}
