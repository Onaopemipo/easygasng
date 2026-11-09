"use client";
import { useEffect, useState } from "react";
import { Compatibility } from "./compatibility";
import { ImageUpload } from "./image-upload";
import { api, Notice, Loading, ProductArt } from "./ui";
import { ServiceForm } from "./professional-services";

export default function CatalogueTools({
  user,
  initialId = "",
}: {
  user: any;
  initialId?: string;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0),
    [selected, setSelected] = useState(initialId);
  const reload = () => setVersion((n) => n + 1);
  useEffect(() => {
    api("catalogue.manage")
      .then(setData)
      .catch((e) => setError(e.message));
  }, [version]);
  if (error) return <Notice type="error" message={error} />;
  if (!data) return <Loading />;
  const product = data.products.find((p: any) => p.id === selected),
    attrs = product?.attributes ?? {};
  return (
    <section className="service-workspace">
      <h2>Specifications, variants & images</h2>
      <p>
        Prices and sale publication remain independently governed through
        Settings and the Approval Centre. Every variant is a separate product
        record with its own SKU, approved price and inventory.
      </p>
      {user.role === "owner" && (
        <details className="surface">
          <summary>Manage product categories</summary>
          <ServiceForm
            title="Create or update category"
            fields={[
              { name: "name", label: "Category name" },
              {
                name: "active",
                label: "Category is active",
                type: "checkbox",
                value: true,
              },
            ]}
            send={(v) => api("category.save", v)}
            done={reload}
          />
          {data.categories.map((c: any) => (
            <p key={c.name}>
              {c.name} · {c.active ? "Active" : "Inactive"}
            </p>
          ))}
        </details>
      )}
      <label>
        Product / variant
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Choose…</option>
          {data.products.map((p: any) => (
            <option value={p.id} key={p.id}>
              {p.name} · {p.sku}
              {p.archived ? " · Archived" : ""}
            </option>
          ))}
        </select>
      </label>
      {product && (
        <div key={product.id + ":" + version}>
          <ProductArt product={product} />
          <Compatibility productId={product.id} user={user} manage />
          {user.role === "owner" && (
            <>
              <ServiceForm
                title="Edit specifications and variant relationship"
                fields={[
                  { name: "sku", label: "Unique SKU", value: product.sku },
                  {
                    name: "parentId",
                    label: "Variant of base product (optional)",
                    value: product.parent_id ?? "",
                    options: [
                      { value: "", label: "Base product" },
                      ...data.products
                        .filter(
                          (p: any) =>
                            p.id !== product.id && !p.parent_id && !p.archived,
                        )
                        .map((p: any) => ({ value: p.id, label: p.name })),
                    ],
                    required: false,
                  },
                  {
                    name: "archived",
                    label: "Archive this product from new purchases",
                    type: "checkbox",
                    value: product.archived,
                  },
                  {
                    name: "brand",
                    label: "Manufacturer / brand, if verified",
                    value: attrs.brand ?? "",
                    required: false,
                  },
                  {
                    name: "model",
                    label: "Model",
                    value: attrs.model ?? "",
                    required: false,
                  },
                  {
                    name: "specifications",
                    label:
                      "Verified size, connection, pressure, material and variant specifications",
                    type: "textarea",
                    value: attrs.specifications ?? "",
                    required: false,
                  },
                  {
                    name: "warranty",
                    label: "Documented warranty",
                    type: "textarea",
                    value: attrs.warranty ?? "",
                    required: false,
                  },
                  {
                    name: "installationRequired",
                    label: "Professional installation required",
                    type: "checkbox",
                    value: attrs.installationRequired,
                  },
                  {
                    name: "compatibility",
                    label: "Compatibility status",
                    value: attrs.compatibility ?? "unknown",
                    options: [
                      { value: "unknown", label: "Unknown" },
                      {
                        value: "professional_confirmation",
                        label: "Professional confirmation required",
                      },
                      { value: "incompatible", label: "Known incompatible" },
                    ],
                  },
                  {
                    name: "compatibilityEvidence",
                    label: "Specification / incompatibility evidence",
                    type: "textarea",
                    value: attrs.compatibilityEvidence ?? "",
                    required: false,
                  },
                ]}
                done={reload}
                send={(v) =>
                  api("product.metadata", {
                    id: product.id,
                    ...v,
                    parentId: v.parentId || null,
                  })
                }
              />
              <ImageUpload productId={product.id} done={reload} />
            </>
          )}
          <div className="service-grid">
            {data.images
              .filter((m: any) => m.product_id === product.id && !m.archived)
              .map((m: any) => (
                <div className="surface" key={m.id}>
                  <img
                    className="catalogue-photo"
                    src={"/api/media/" + m.id}
                    alt={m.alt}
                  />
                  {user.role === "owner" && (
                    <ServiceForm
                      title="Image order and visibility"
                      fields={[
                        { name: "alt", label: "Description", value: m.alt },
                        {
                          name: "position",
                          label: "Display order; lowest is primary",
                          type: "number",
                          value: m.position,
                        },
                        {
                          name: "archived",
                          label: "Remove image from display",
                          type: "checkbox",
                          value: false,
                        },
                      ]}
                      done={reload}
                      send={(v) => api("media.update", { id: m.id, ...v })}
                    />
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </section>
  );
}
