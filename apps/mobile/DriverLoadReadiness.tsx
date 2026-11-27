import React, { useEffect, useState } from "react";
import { Button, Card, Copy, Title, type CustomerAPI } from "./CustomerUI";
import {
  driverLoadReadiness,
  driverLoadScope,
} from "../../packages/business-rules/src/driver-load-readiness";

export default function DriverLoadReadiness({
  api,
  order,
  tripId,
  onChange,
  onReviewLoad,
}: {
  api: CustomerAPI;
  order: any;
  tripId: string | null;
  onChange: (result: { key: string; ready: boolean }) => void;
  onReviewLoad: () => void;
}) {
  const key = driverLoadScope(order, tripId),
    gas = !!order.gas_lines?.length;
  const [result, setResult] = useState<{
    key: string;
    data?: any;
    error?: string;
  } | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let current = true;
    onChange({ key, ready: !gas });
    setResult(null);
    if (!gas) return;
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(Error("Load check timed out.")), 15000);
    });
    Promise.race([api("bulk.summary"), deadline])
      .then((data) => {
        if (!current) return;
        const readiness = driverLoadReadiness(order, tripId, data);
        setResult({ key, data: readiness });
        onChange({ key, ready: readiness.state === "ready" });
      })
      .catch((error) => {
        if (current)
          setResult({ key, error: error.message || "Connection unavailable." });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [api, key, gas, revision, onChange]);
  if (!gas) return null;
  const current = result?.key === key ? result : null;
  return (
    <Card>
      <Title>Vehicle gas readiness</Title>
      <Copy>
        Accepting an order confirms the assignment. Starting delivery also needs
        its vehicle gas allocation and your measured load confirmation.
      </Copy>
      <Copy>
        {current?.error
          ? "Could not verify the vehicle gas load. Reconnect and refresh before starting delivery."
          : (current?.data?.message ??
            "Checking this order’s vehicle gas allocation…")}
      </Copy>
      {!!current?.data && current.data.state !== "ready" && (
        <Button
          label="Open vehicle gas load"
          secondary
          onPress={onReviewLoad}
        />
      )}
      <Button
        label="Refresh gas readiness"
        secondary
        disabled={!current}
        onPress={() => {
          onChange({ key, ready: false });
          setResult(null);
          setRevision((n) => n + 1);
        }}
      />
    </Card>
  );
}
