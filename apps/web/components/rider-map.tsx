"use client";

import { useEffect, useRef, useState } from "react";

type Position = { lat: number; lng: number };
export type RiderMapPoint = Position & {
  id: string;
  label: string;
  onSelect?: () => void;
};

type Marker = EventTarget & { map: MapInstance | null };
type Bounds = { extend(point: Position): void };
type MapInstance = { fitBounds(bounds: Bounds, padding: number): void };
type Maps = {
  Map: new (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => MapInstance;
  LatLngBounds: new () => Bounds;
  marker: {
    AdvancedMarkerElement: new (options: Record<string, unknown>) => Marker;
  };
};

const browserKey = process.env.NEXT_PUBLIC_EASYGAS_GOOGLE_MAPS_BROWSER_KEY;
const mapId = process.env.NEXT_PUBLIC_EASYGAS_GOOGLE_MAPS_MAP_ID;
const configured =
  process.env.NEXT_PUBLIC_EASYGAS_GOOGLE_MAPS_ENABLED === "true" &&
  browserKey &&
  mapId;
const failureEvent = "easygas:map-provider-error";
let loading: Promise<Maps> | undefined;

function loadMaps(): Promise<Maps> {
  if (loading) return loading;
  const browser = window as Window & {
    google?: { maps: Maps };
    easyGasMapsReady?: () => void;
    gm_authFailure?: () => void;
  };
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => {
      clearTimeout(timeout);
      script.remove();
      delete browser.easyGasMapsReady;
      window.dispatchEvent(new Event(failureEvent));
      reject(new Error("Map provider unavailable."));
    };
    const timeout = setTimeout(fail, 12000);
    browser.gm_authFailure = fail;
    browser.easyGasMapsReady = () => {
      clearTimeout(timeout);
      delete browser.easyGasMapsReady;
      const maps = browser.google?.maps;
      if (maps?.marker?.AdvancedMarkerElement) resolve(maps);
      else fail();
    };
    script.async = true;
    script.onerror = fail;
    script.src =
      "https://maps.googleapis.com/maps/api/js?" +
      new URLSearchParams({
        key: browserKey ?? "",
        v: "quarterly",
        loading: "async",
        libraries: "marker",
        callback: "easyGasMapsReady",
      });
    document.head.append(script);
  });
  return loading;
}

function MapCanvas({ points }: { points: RiderMapPoint[] }) {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<{ maps: Maps; map: MapInstance } | null>(null);
  const [maps, setMaps] = useState<Maps | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const fail = () => {
      if (active) setFailed(true);
    };
    window.addEventListener(failureEvent, fail);
    loadMaps()
      .then((value) => {
        if (active) setMaps(value);
      })
      .catch(fail);
    return () => {
      active = false;
      window.removeEventListener(failureEvent, fail);
    };
  }, []);

  useEffect(() => {
    if (!maps || failed || !host.current || !points.length) return;
    const center = { lat: points[0].lat, lng: points[0].lng };
    try {
      const map =
        instance.current?.map ??
        new maps.Map(host.current, {
          center,
          mapId,
          zoom: 14,
          maxZoom: 16,
          gestureHandling: "cooperative",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
      instance.current = { maps, map };
      const bounds = new maps.LatLngBounds();
      const markers = points.map(({ lat, lng, label, onSelect }) => {
        const position = { lat, lng };
        bounds.extend(position);
        const marker = new maps.marker.AdvancedMarkerElement({
          position,
          map,
          title: label,
          gmpClickable: Boolean(onSelect),
        });
        if (onSelect) marker.addEventListener("gmp-click", onSelect);
        return { marker, onSelect };
      });
      map.fitBounds(bounds, 40);
      return () => {
        for (const { marker, onSelect } of markers) {
          if (onSelect) marker.removeEventListener("gmp-click", onSelect);
          marker.map = null;
        }
      };
    } catch {
      setFailed(true);
    }
  }, [maps, failed, points]);

  if (failed)
    return (
      <p role="status">
        The map couldn’t load. Location details are listed below when available.
      </p>
    );
  return (
    <>
      {!maps && <p role="status">Loading map…</p>}
      <div
        ref={host}
        role="region"
        aria-label="Recorded rider locations"
        style={{ minHeight: 260 }}
      />
    </>
  );
}

export function RiderMap({ points }: { points: RiderMapPoint[] }) {
  const [visible, setVisible] = useState(false);
  if (!points.length)
    return <p>No rider locations are available to display.</p>;
  if (!configured) return <p>The embedded map is unavailable.</p>;
  return (
    <div>
      <button
        type="button"
        className="button secondary"
        aria-expanded={visible}
        onClick={() => setVisible(!visible)}
      >
        {visible ? "Hide map" : "Show Google Maps"}
      </button>
      {visible && <MapCanvas points={points} />}
    </div>
  );
}
