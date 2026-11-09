import React, { useState } from "react";
import { View, Pressable, Image } from "react-native";
import { Text } from "./typography";
import { NativeForm } from "./Workflows";
export default function OrderVisit({
  api,
  order,
  driver,
  origin,
  token,
  onDone,
}: {
  api: (a: string, d?: any) => Promise<any>;
  order: any;
  driver: boolean;
  origin: string;
  token: string | null;
  onDone: () => void;
}) {
  const [photos, setPhotos] = useState<any[]>([]),
    [amendments, setAmendments] = useState<any[]>([]),
    [invoice, setInvoice] = useState<any>(null),
    [executionEnabled, setExecutionEnabled] = useState(false),
    [cylinderCount, setCylinderCount] = useState(1),
    [message, setMessage] = useState("");
  async function load() {
    try {
      const p = await api("delivery.photos?orderId=" + order.id);
      setPhotos(p.photos);
      const a = await api("doorstep.list", { orderId: order.id });
      setAmendments(a.amendments);
      setExecutionEnabled(a.commitEnabled === true);
      if (!driver) {
        const i = await api("invoice.order", { orderId: order.id });
        setInvoice(i.invoice);
      }
      setMessage("Current visit details loaded.");
    } catch (e: any) {
      setMessage(e.message);
    }
  }
  return (
    <View style={{ gap: 10, padding: 12 }}>
      <Pressable accessibilityRole="button" onPress={load}>
        <Text style={{ fontSize: 16, color: "#087a36" }}>
          View visit changes, photos and invoice
        </Text>
      </Pressable>
      {message && <Text accessibilityRole="alert">{message}</Text>}
      {photos.map((p) => (
        <View key={p.id}>
          <Image
            source={{
              uri: origin + "/api/media/" + p.id,
              headers: { Authorization: `Bearer ${token}` },
            }}
            accessibilityLabel={p.alt}
            style={{ width: 220, height: 180 }}
          />
          <Text>
            {p.alt} · Uploaded {new Date(p.created_at).toLocaleString()}
          </Text>
        </View>
      ))}
      {invoice && (
        <View>
          <Text>
            {invoice.invoice_number} · {invoice.status}
          </Text>
          <Text>
            Original: NGN {Number(invoice.total_kobo) / 100} · Effective: NGN{" "}
            {Number(invoice.effectiveTotalKobo ?? invoice.total_kobo) / 100}
          </Text>
          <Text>
            Amount due:{" "}
            {invoice.amountDueKobo === null
              ? "Finance review required"
              : "NGN " + Number(invoice.amountDueKobo) / 100}
          </Text>
          <Text>Online payments remain unconnected.</Text>
        </View>
      )}
      {amendments.map((m) => (
        <View key={m.id}>
          <Text>Amendment: {m.state}. Extra delivery fee: NGN 0.</Text>
          <Text>
            {m.proposal.lines
              ?.map((l: any) => `${l.kg} kg into a ${l.capacityKg} kg cylinder`)
              .join("; ")}
          </Text>
          {m.price_snapshot.quote.physicalLines?.map((p: any) => (
            <Text key={p.productId}>
              {p.name} × {p.quantity} · NGN {Number(p.unitPriceKobo) / 100} per
              unit
            </Text>
          ))}
          {m.product_execution && (
            <Text>
              Product execution: {m.product_execution.state} · Invoice debit:{" "}
              {m.product_execution.note_state}
            </Text>
          )}
          {executionEnabled &&
            driver &&
            m.product_execution?.state === "reserved" && (
              <>
                {m.product_execution.note_state === "approved" &&
                  !m.product_execution.cash_reported_at && (
                    <NativeForm
                      api={api}
                      action="doorstep.products.collection.report"
                      title="Report product cash actually collected"
                      fields={[
                        {
                          name: "orderId",
                          label: "Order",
                          value: order.id,
                          type: "hidden",
                        },
                        {
                          name: "amendmentId",
                          label: "Amendment",
                          value: m.id,
                          type: "hidden",
                        },
                        {
                          name: "amountKobo",
                          label: "Exact actual cash (kobo)",
                          value: Number(m.product_execution.amount_kobo),
                          type: "number",
                        },
                        { name: "reason", label: "Collection evidence" },
                      ]}
                      onDone={load}
                    />
                  )}
                <NativeForm
                  api={api}
                  action="doorstep.products.handover"
                  title="Record full physical product handover"
                  fields={[
                    {
                      name: "orderId",
                      label: "Order",
                      value: order.id,
                      type: "hidden",
                    },
                    {
                      name: "amendmentId",
                      label: "Amendment",
                      value: m.id,
                      type: "hidden",
                    },
                    {
                      name: "code",
                      label: "Customer original-visit confirmation code",
                    },
                    {
                      name: "handover",
                      label:
                        "I handed over every reserved unit and exact serial",
                      type: "checkbox",
                    },
                    { name: "reason", label: "Handover evidence" },
                  ]}
                  onDone={load}
                />
              </>
            )}
          <Text>
            Additional gas: NGN{" "}
            {Number(m.price_snapshot.quote.subtotalKobo) / 100}. Additional
            products: NGN{" "}
            {Number(m.price_snapshot.quote.physicalSubtotalKobo) / 100}.
            Additional delivery: NGN 0.
          </Text>
          <Text>
            {m.execution
              ? `Execution: ${m.execution.state}. Invoice debit: ${m.execution.note_state}.`
              : "Proposal only; inspection, vehicle buffer and independent invoice approval are required."}
          </Text>
          {executionEnabled && driver && m.execution?.state === "reserved" && (
            <>
              {m.execution.note_state === "approved" &&
                !m.execution.cash_reported_at && (
                  <NativeForm
                    api={api}
                    action="doorstep.collection.report"
                    title="Report supplementary cash actually collected"
                    fields={[
                      {
                        name: "orderId",
                        label: "Order",
                        value: order.id,
                        type: "hidden",
                      },
                      {
                        name: "amendmentId",
                        label: "Amendment",
                        value: m.id,
                        type: "hidden",
                      },
                      {
                        name: "amountKobo",
                        label: "Exact cash actually collected (kobo)",
                        type: "number",
                        value: Number(m.execution.amount_kobo),
                      },
                      { name: "reason", label: "Collection evidence" },
                    ]}
                    onDone={load}
                  />
                )}
              {(!m.execution.cylinder_lines?.length
                ? [null]
                : m.execution.cylinder_lines.filter(
                    (l: any) => l.state === "reserved",
                  )
              ).map((line: any) => (
                <NativeForm
                  key={`${m.id}:${m.execution.load_version}:${line?.id ?? "legacy"}`}
                  api={api}
                  action="doorstep.dispense"
                  title={
                    line
                      ? `Record cylinder ${line.position} dispensing`
                      : "Record supplementary metered dispensing"
                  }
                  fields={[
                    ...(line
                      ? [
                          {
                            name: "lineId",
                            label: "Cylinder line",
                            value: line.id,
                            type: "hidden" as const,
                          },
                        ]
                      : []),
                    {
                      name: "orderId",
                      label: "Order",
                      value: order.id,
                      type: "hidden",
                    },
                    {
                      name: "amendmentId",
                      label: "Amendment",
                      value: m.id,
                      type: "hidden",
                    },
                    {
                      name: "loadVersion",
                      label: "Current load version",
                      value: Number(m.execution.load_version),
                      type: "number",
                    },
                    {
                      name: "meterReadingGrams",
                      label: "Observed cumulative meter reading (grams)",
                      type: "number",
                    },
                    { name: "reason", label: "Dispensing evidence" },
                  ]}
                  onDone={load}
                />
              ))}
            </>
          )}
          {!driver && m.state === "proposed" && (
            <NativeForm
              api={api}
              action="doorstep.consent"
              title="Review extra items"
              fields={[
                {
                  name: "orderId",
                  label: "Order",
                  value: order.id,
                  type: "hidden",
                },
                {
                  name: "amendmentId",
                  label: "Amendment",
                  value: m.id,
                  type: "hidden",
                },
                {
                  name: "consent",
                  label: "I consent to the displayed proposed items and price",
                  type: "checkbox",
                },
              ]}
              onDone={load}
            />
          )}
        </View>
      ))}
      {driver && order.status === "assigned" && (
        <NativeForm
          api={api}
          action="dispatch.respond"
          title="Respond to assignment"
          fields={[
            {
              name: "orderId",
              label: "Order",
              value: order.id,
              type: "hidden",
            },
            {
              name: "version",
              label: "Current version",
              value: order.tracking_version,
              type: "number",
            },
            {
              name: "decision",
              label: "Decision",
              options: [
                { value: "acknowledged", label: "Acknowledge" },
                {
                  value: "rejected",
                  label: "Reject and ask dispatch to review",
                },
              ],
            },
            { name: "reason", label: "Reason" },
          ]}
          onDone={onDone}
        />
      )}{" "}
      {!driver && Number(invoice?.overpaidKobo) > 0 && (
        <NativeForm
          api={api}
          action="invoice.excess.request"
          title="Request excess collection as purchase credit"
          fields={[
            {
              name: "orderId",
              label: "Order",
              value: order.id,
              type: "hidden",
            },
            {
              name: "acceptWalletCredit",
              label: "I accept purchase wallet credit rather than cash",
              type: "checkbox",
            },
            { name: "reason", label: "Excess-collection review reason" },
          ]}
          onDone={load}
        />
      )}
      {driver && order.status === "out_for_delivery" && (
        <NativeForm
          api={(a, d) =>
            api(a, {
              orderId: order.id,
              version: Number(order.tracking_version),
              operationKey: d.operationKey,
              items: [{ productId: d.productId, quantity: Number(d.quantity) }],
            })
          }
          action="doorstep.products.propose"
          title="Propose additional physical products"
          fields={[
            { name: "productId", label: "Catalogue product ID" },
            { name: "quantity", label: "Units requested", type: "number" },
          ]}
          onDone={load}
        />
      )}
      {driver && order.status === "out_for_delivery" && (
        <View style={{ gap: 10 }}>
          <Text>
            Number of cylinders: {cylinderCount}. Choose before entering
            quantities; changing this clears unsent entries.
          </Text>
          <View style={{ flexDirection: "row", gap: 20 }}>
            <Pressable
              accessibilityRole="button"
              disabled={cylinderCount <= 1}
              onPress={() => setCylinderCount((n) => n - 1)}
            >
              <Text>Remove cylinder</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={cylinderCount >= 10}
              onPress={() => setCylinderCount((n) => n + 1)}
            >
              <Text>Add cylinder</Text>
            </Pressable>
          </View>
          <NativeForm
            key={cylinderCount}
            api={(action, data) =>
              api(action, {
                orderId: order.id,
                version: Number(order.tracking_version),
                operationKey: data.operationKey,
                lines: Array.from({ length: cylinderCount }, (_, i) => ({
                  capacityKg: Number(data["capacity" + i]),
                  kg: Number(data["quantity" + i]),
                })),
              })
            }
            action="doorstep.gas.propose"
            title="Propose extra gas"
            fields={Array.from({ length: cylinderCount }, (_, i) => [
              {
                name: "capacity" + i,
                label: `Cylinder ${i + 1} capacity (kg)`,
                type: "number" as const,
              },
              {
                name: "quantity" + i,
                label: `Cylinder ${i + 1} gas required (kg)`,
                type: "number" as const,
              },
            ]).flat()}
            onDone={load}
          />
        </View>
      )}
    </View>
  );
}
