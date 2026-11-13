"use client";
import {ProductHeading} from "./product-workspace";
import React, { useEffect, useState } from "react";
import { api, Loading, Notice, money } from "./ui";
import { ServiceForm } from "./professional-services";
export function BundleOffers({ select }: { select: (b: any) => void }) {
  const [rows, setRows] = useState<any[] | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("bundles")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <section>
      {(rows?.length ?? 0) > 0 && <h2>Products & service bundles</h2>}
      {error && <Notice type="error" message={error} />}
      {!rows && !error && <Loading label="Loading bundles" />}
      <div className="service-grid">
        {rows?.map((b) => (
          <article className="surface" key={b.id}>
            <h3>{b.name}</h3>
            <p>{b.config.description}</p>
            {b.products.map((p: any) => (
              <p key={p.productId}>
                {p.quantity} × {p.name} · {money(p.unitPriceKobo)}
              </p>
            ))}
            <p>
              {b.serviceName} · {money(b.servicePriceKobo)} plus call-out{" "}
              {money(b.calloutKobo)}
            </p>
            <p>
              Service saving {money(b.discountKobo)} · Subtotal{" "}
              {money(b.totalKobo)}. Product delivery is additional; appointment
              availability is confirmed at checkout. Additional work needs a
              separate approved quotation.
            </p>
            <button className="button secondary" onClick={() => select(b)}>
              Use this bundle as my cart & choose appointment
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
export default function BundleAdmin({ user }: { user: any }) {
  const [rows, setRows] = useState<any[] | null>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  useEffect(() => {
    api("bundles.manage")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [version]);
  return (
    <section className="product-workspace governed-workspace">
      <ProductHeading eyebrow="PRODUCTS & STOCK" title="Product & service bundles" description="Manage product and service packages with clear, separately governed charges." />
      <p>
        Products retain their approved individual prices. A configured
        percentage reduces only the fixed service labour price. Call-out,
        delivery and later approved additional work retain their separate
        charges.
      </p>
      {error && <Notice type="error" message={error} />}
      {!rows && !error && <Loading label="Loading bundles" />}{" "}
      {user.role === "owner" && (
        <ServiceForm
          title="Create a draft bundle"
          fields={[{ name: "name", label: "Bundle name" }]}
          done={reload}
          send={(v) =>
            api("bundle.create", { ...v, branchId: user.branchId ?? "lagos" })
          }
        />
      )}{" "}
      {rows?.map((b) => (
        <details className="surface" key={b.id + ":" + version}>
          <summary>
            {b.name} · {b.config.active ? "Active" : "Draft"} · v{b.version}
          </summary>
          <ServiceForm
            title="Propose bundle configuration"
            fields={[
              {
                name: "products",
                label: "Product IDs and quantities as JSON",
                type: "textarea",
                value: JSON.stringify(b.config.products),
              },
              {
                name: "serviceId",
                label: "Fixed-price service ID",
                value: b.config.serviceId,
              },
              {
                name: "serviceDiscountPercent",
                label: "Service labour discount percent (0–30)",
                type: "number",
                value: b.config.serviceDiscountPercent,
              },
              {
                name: "description",
                label: "Customer description",
                type: "textarea",
                value: b.config.description,
              },
              {
                name: "active",
                label: "Publish after independent owner approval",
                type: "checkbox",
                value: b.config.active,
              },
              { name: "reason", label: "Business approval reason" },
            ]}
            done={reload}
            send={(v) => {
              let products;
              try {
                products = JSON.parse(v.products);
              } catch {
                throw new Error(
                  'Products must be valid JSON, such as [{"productId":"regulator","quantity":1}].',
                );
              }
              return api("bundle.propose", {
                id: b.id,
                version: b.version,
                config: {
                  products,
                  serviceId: v.serviceId,
                  serviceDiscountPercent: v.serviceDiscountPercent,
                  description: v.description,
                  active: v.active,
                },
                reason: v.reason,
              });
            }}
          />
        </details>
      ))}
    </section>
  );
}
