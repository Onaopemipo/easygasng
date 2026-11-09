import React, { useEffect, useState } from "react";
import {
  Card,
  Copy,
  Title,
  Feedback,
  Button,
  type CustomerAPI,
} from "./CustomerUI";
import { NativeForm } from "./Workflows";

/** Uses the driver's existing session, orders and online operation receipts. */
export default function BulkLPG({ api }: { api: CustomerAPI }) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [tick, setTick] = useState(0);
  useEffect(() => {
    let current = true;
    api("bulk.summary")
      .then((r) => {
        if (current) {
          setData(r);
          setError("");
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [api, tick]);
  const refresh = () => setTick((n) => n + 1);
  if (!data?.enabled && !data?.loads?.length && !error) return null;
  return (
    <Card>
      <Title>Bulk LPG custody</Title>
      <Copy>
        Use measured mass in grams. Online confirmation is required; an
        uncertain request is not a confirmed dispense or return.
      </Copy>
      {!!error && <Feedback error={error} retry={refresh} />}
      <Button label="Refresh LPG custody" onPress={refresh} />
      {!data?.enabled && (
        <Copy>Custody changes await operational release approval.</Copy>
      )}
      {data?.loads?.map((load: any) => {
        const context = [
          {
            name: "loadId",
            label: "Load",
            value: load.id,
            type: "hidden" as const,
          },
          {
            name: "version",
            label: "Version",
            value: Number(load.version),
            type: "hidden" as const,
          },
        ];
        const reason = {
          name: "reason",
          label: "Measurement evidence and reason",
        };
        return (
          <Card key={`${load.id}-${load.version}`}>
            <Title>
              {load.label} · {load.state}
            </Title>
            <Copy>
              {Number(load.loaded_grams) / 1000} kg loaded ·{" "}
              {Number(load.dispensed_grams) / 1000} kg dispensed ·{" "}
              {Number(load.buffer_grams) / 1000} kg buffer
            </Copy>
            {load.state === "held" && (
              <Copy>
                Return discrepancy recorded. Contact operations. Stock remains
                reserved and trip closure is held.
              </Copy>
            )}
            {data.enabled &&
              load.state === "active" &&
              load.allocations
                .filter(
                  (a: any) =>
                    a.state === "allocated" &&
                    a.payment_method === "cash_on_delivery",
                )
                .map((allocation: any) => (
                  <NativeForm
                    key={`${allocation.order_id}-cash`}
                    api={api}
                    action="bulk.collection.record"
                    title={`Record actual cash collected · ${allocation.reference}`}
                    onDone={refresh}
                    fields={[
                      ...context,
                      {
                        name: "orderId",
                        label: "Order",
                        value: allocation.order_id,
                        type: "hidden",
                      },
                      {
                        name: "amountKobo",
                        label: "Cash actually collected (kobo)",
                        type: "number",
                      },
                      reason,
                    ]}
                  />
                ))}
            {data.enabled && load.state === "issued" && (
              <NativeForm
                api={api}
                action="bulk.load.acknowledge"
                title="Acknowledge measured load"
                onDone={refresh}
                fields={[
                  ...context,
                  {
                    name: "returnGrams",
                    label: "Observed loaded mass (grams)",
                    type: "number",
                  },
                  {
                    name: "meterReadingGrams",
                    label: "Observed cumulative meter reading (grams)",
                    type: "number",
                  },
                  reason,
                ]}
              />
            )}
            {data.enabled &&
              load.state === "active" &&
              load.allocations
                .filter((a: any) => a.state === "allocated")
                .map((allocation: any) => (
                  <NativeForm
                    key={allocation.order_id}
                    api={api}
                    action="bulk.dispense"
                    title={`Record dispensing · ${allocation.reference}`}
                    onDone={refresh}
                    fields={[
                      ...context,
                      {
                        name: "orderId",
                        label: "Order",
                        value: allocation.order_id,
                        type: "hidden",
                      },
                      {
                        name: "meterReadingGrams",
                        label: `New cumulative meter reading (grams); allocated ${allocation.grams} g`,
                        type: "number",
                      },
                      reason,
                    ]}
                  />
                ))}
            {data.enabled && ["issued", "active"].includes(load.state) && (
              <NativeForm
                api={api}
                action="bulk.return.declare"
                title="Declare measured LPG return"
                onDone={refresh}
                fields={[
                  ...context,
                  {
                    name: "returnGrams",
                    label: "Physically returned mass (grams)",
                    type: "number",
                  },
                  reason,
                ]}
              />
            )}
          </Card>
        );
      })}
    </Card>
  );
}
