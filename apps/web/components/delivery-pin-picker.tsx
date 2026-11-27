"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  confirmedDeliveryPin,
  deliveryAddressKey,
  parseDeliveryPoint,
  type ConfirmedDeliveryPin,
  type DeliveryPoint,
} from "../../../packages/business-rules/src/delivery-pin";
import "leaflet/dist/leaflet.css";

import { deliveryPinAreaError, deliveryAreaBounds, type DeliveryMapArea } from "../../../packages/business-rules/src/delivery-pin-area";

export default function DeliveryPinPicker({
  street,
  zone,
  value,
  area,
  onChange,
  disabled = false,
}: {
  street: string;
  zone: string;
  value?: ConfirmedDeliveryPin;
  area?: DeliveryMapArea;
  onChange: (pin: ConfirmedDeliveryPin | undefined) => void;
  disabled?: boolean;
}) {
  const id = useId(),
    valid = confirmedDeliveryPin(value, street, zone) && !deliveryPinAreaError(value, area ?? zone) ? confirmedDeliveryPin(value, street, zone) : null;
  const [point, setPoint] = useState<DeliveryPoint | null>(confirmedDeliveryPin(value, street, zone)),
    [open, setOpen] = useState(false),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const key = deliveryAddressKey(street, zone),
    lastKey = useRef(key),
    alive = useRef(true),
    host = useRef<HTMLDivElement>(null),
    map = useRef<import("leaflet").Map | null>(null),
    marker = useRef<import("leaflet").CircleMarker | null>(null),
    latest = useRef({ disabled, onChange });
  latest.current = { disabled, onChange };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (lastKey.current !== key) {
      lastKey.current = key;
      setPoint(confirmedDeliveryPin(value, street, zone));
      setError("");
    }
  }, [key]);
  useEffect(() => {
    const bound = confirmedDeliveryPin(value, street, zone);
    if (bound) setPoint(bound);
  }, [value?.latitude, value?.longitude, value?.addressKey, value?.confirmed]);
  function choose(p: DeliveryPoint) {
    if (disabled) return;
    setPoint(p);
    onChange(undefined);
    setError("");
  }
  const bounds = deliveryAreaBounds(area ?? zone);
  useEffect(() => {
    if (!open || !host.current) return;
    let live = true;
    void import("leaflet")
      .then((L) => {
        if (!live || !host.current) return;
        const centre = point ?? (bounds ? {latitude:(bounds.south+bounds.north)/2,longitude:(bounds.west+bounds.east)/2} : { latitude: 6.5244, longitude: 3.3792 }),
          m = L.map(host.current).setView(
            [centre.latitude, centre.longitude],
            point ? 17 : 11,
          );
        map.current = m;
        L.tileLayer(
          process.env.NEXT_PUBLIC_EASYGAS_ADDRESS_TILES ??
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            referrerPolicy: "origin",
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
          },
        )
          .on("tileerror", () => {
            if (live)
              setError(
                "The map could not load. Use current location or paste a full map link below.",
              );
          })
          .addTo(m);
        m.on("click", (event: import("leaflet").LeafletMouseEvent) => {
          if (latest.current.disabled) return;
          setPoint({ latitude: event.latlng.lat, longitude: event.latlng.lng });
          latest.current.onChange(undefined);
          setError("");
        });
        if (point)
          marker.current = L.circleMarker([point.latitude, point.longitude], {
            radius: 10,
            color: "#07592e",
            fillColor: "#87c900",
            fillOpacity: 1,
          }).addTo(m);
      })
      .catch(() => {
        if (live)
          setError(
            "Map unavailable. Use current location or paste a full map link.",
          );
      });
    return () => {
      live = false;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, [open, zone, bounds?.south, bounds?.north, bounds?.west, bounds?.east]);
  useEffect(() => {
    if (!point) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!map.current) return;
    void import("leaflet").then((L) => {
      if (!map.current) return;
      marker.current?.remove();
      marker.current = L.circleMarker([point.latitude, point.longitude], {
        radius: 10,
        color: "#07592e",
        fillColor: "#87c900",
        fillOpacity: 1,
      }).addTo(map.current);
      map.current.setView(
        [point.latitude, point.longitude],
        Math.max(map.current.getZoom(), 16),
      );
    });
  }, [point?.latitude, point?.longitude, open]);
  function locate() {
    if (disabled || busy) return;
    if (!navigator.geolocation) {
      setError(
        "Location is unavailable. Choose a pin on the map or paste a full map link.",
      );
      return;
    }
    setBusy(true);
    setError("");
    const requestedKey = key;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (!alive.current) return;
        setBusy(false);
        if (lastKey.current !== requestedKey) return;
        choose({ latitude: p.coords.latitude, longitude: p.coords.longitude });
        setOpen(true);
      },
      () => {
        if (!alive.current || lastKey.current !== requestedKey) return;
        setBusy(false);
        setError(
          "Location permission is unavailable. Choose a pin on the map or paste a full map link.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  }
  const areaError = point ? deliveryPinAreaError(point, area ?? zone) : "";
  const canConfirm = !!point && !areaError && street.trim().length >= 8 && !!zone.trim();
  return (
    <section
      className="delivery-pin-picker"
      aria-labelledby={id}
      style={{
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 16,
        display: "grid",
        gap: 12,
      }}
    >
      <strong id={id}>Delivery map location</strong>
      <p style={{ margin: 0 }}>
        {valid
          ? "Delivery pin confirmed for this address."
          : "Choose the delivery address on the map. Current location is only suitable when you are there."}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className="button secondary"
          disabled={disabled || busy}
          onClick={locate}
        >
          {busy ? "Finding location…" : "Use my current location"}
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={disabled}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? "Hide map" : "Choose on map"}
        </button>
      </div>
      {open && (
        <>
          <p style={{ margin: 0 }}>Tap the map to place your delivery pin.</p>
          <div
            ref={host}
            role="region"
            aria-label="Choose delivery map location"
            style={{
              height: 280,
              borderRadius: 12,
              isolation: "isolate",
              zIndex: 0,
            }}
          />
        </>
      )}
      <details>
        <summary>Paste a map link or coordinates</summary>
        <label>
          Full map link or latitude, longitude
          <input
            value={text}
            disabled={disabled}
            onChange={(e) => setText(e.target.value)}
            placeholder="6.45, 3.46"
          />
        </label>
        <button
          type="button"
          className="button secondary"
          disabled={disabled}
          onClick={() => {
            const p = parseDeliveryPoint(text);
            if (p) {
              choose(p);
              setOpen(true);
            } else
              setError(
                "Use a full map link containing coordinates, or latitude, longitude. Shortened links cannot be read here.",
              );
          }}
        >
          Use this location
        </button>
      </details>
      {point && (
        <p style={{ margin: 0 }}>
          Selected pin: {point.latitude.toFixed(5)},{" "}
          {point.longitude.toFixed(5)}
        </p>
      )}
      <label style={{ display: "flex", gap: 10, alignItems: "start" }}>
        <input
          type="checkbox"
          checked={!!valid}
          disabled={disabled || !canConfirm}
          onChange={(e) =>
            onChange(
              e.target.checked && point && canConfirm
                ? { ...point, confirmed: true, addressKey: key }
                : undefined,
            )
          }
        />
        <span>This pin matches my delivery address.</span>
      </label>
      {areaError && <p role="alert">{areaError}</p>}
      {!canConfirm && point && !areaError && (
        <p role="status">
          Enter your complete street address and delivery area before confirming
          the pin.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
