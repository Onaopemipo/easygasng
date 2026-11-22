import React, { useEffect, useState } from "react";
import { EasyGasLoader } from "./EasyGasLoader";
import { AppState } from "react-native";
import { lagosDate } from "../../packages/business-rules/src/dispatch-centre";
import { Button, Card, Copy, Title, type CustomerAPI } from "./CustomerUI";
import NativeRiderMap from "./NativeRiderMap";

type DriverLocation = {
  id: string;
  name: string;
  active_stops: string | number;
  location?: {
    lastKnown?: {
      lat: number;
      lng: number;
      recordedAt: string;
      accuracy: number;
      delayedUpload: boolean;
    };
  };
};

export default function FleetLocations({
  api,
  branchId = "",
  standalone = false,
}: {
  api: CustomerAPI;
  branchId?: string;
  standalone?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [access, setAccess] = useState<
    "loading" | "allowed" | "denied" | "error"
  >("loading");
  const [accessRevision, setAccessRevision] = useState(0);
  const allowed = access === "allowed";
  const [drivers, setDrivers] = useState<DriverLocation[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setAccess("loading");
    api("navigation.access")
      .then((result) => {
        if (!active) return;
        setAccess(
          Array.isArray(result.allowed)
            ? result.allowed.includes("deliveries")
              ? "allowed"
              : "denied"
            : "error",
        );
      })
      .catch((failure) => {
        if (active) setAccess(failure?.status === 403 ? "denied" : "error");
      });
    return () => {
      active = false;
    };
  }, [accessRevision]);
  useEffect(() => {
    if (!open || !allowed) return;
    let active = true;
    let generation = 0;
    const refresh = async () => {
      if (AppState.currentState !== "active") return;
      const request = ++generation;
      try {
        const query = new URLSearchParams({
          date: lagosDate(),
          ...(branchId ? { branch: branchId } : {}),
        });
        const result = await api("dispatch.centre?" + query);
        if (active && request === generation) {
          setDrivers(
            result.drivers.filter(
              (driver: DriverLocation) => Number(driver.active_stops) > 0,
            ),
          );
          setError("");
        }
      } catch (failure) {
        if (active && request === generation) {
          if ((failure as { status?: number }).status === 403)
            setAccess("denied");
          setDrivers(null);
          setError(
            "Fleet locations couldn’t refresh. Try again when connected.",
          );
        }
      }
    };
    void refresh();
    const timer = setInterval(refresh, 30000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
      else {
        generation++;
        setDrivers(null);
      }
    });
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [open, allowed, branchId]);
  const points = (drivers ?? []).flatMap((driver) => {
    const fix = driver.location?.lastKnown;
    return fix
      ? [{ id: driver.id, label: driver.name, lat: fix.lat, lng: fix.lng }]
      : [];
  });
  if (!allowed) {
    if (!standalone) return null;
    return (
      <Card>
        <Title>Dispatch centre</Title>
        {access === "loading" ? (
          <EasyGasLoader
            size="sm"
            variant="section"
            label="Checking dispatch access"
          />
        ) : (
          <>
            <Copy>
              {access === "denied"
                ? "Fleet locations are not available for this account. Ask your Admin to review your branch and delivery access."
                : "Could not check dispatch access. Check your connection and try again."}
            </Copy>
            <Button
              label="Retry access check"
              secondary
              onPress={() => setAccessRevision((n) => n + 1)}
            />
          </>
        )}
      </Card>
    );
  }
  return (
    <Card>
      <Button
        label={open ? "Hide fleet locations" : "View fleet locations"}
        secondary
        onPress={() => {
          setDrivers(null);
          setError("");
          setOpen(!open);
        }}
      />
      {open && (
        <>
          <NativeRiderMap points={points.slice(0, 50)} />
          {points.length > 50 && (
            <Copy>
              Showing 50 map points. All scoped drivers are listed below.
            </Copy>
          )}
          {drivers === null && !error ? (
            <EasyGasLoader
              size="sm"
              variant="section"
              label="Loading fleet locations"
            />
          ) : (
            <Copy>
              {error ||
                (!drivers?.length
                  ? "No active deliveries."
                  : "Last recorded observations. ETA unavailable.")}
            </Copy>
          )}
          {drivers?.map((driver) => {
            const fix = driver.location?.lastKnown;
            return (
              <Copy key={driver.id}>
                {driver.name} · {driver.active_stops} deliveries ·{" "}
                {fix
                  ? `${fix.delayedUpload ? "Delayed upload" : "Recorded GPS"} ${new Date(fix.recordedAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })} (Lagos) · ±${Math.round(fix.accuracy)} m`
                  : "GPS unavailable"}
              </Copy>
            );
          })}
        </>
      )}
    </Card>
  );
}
