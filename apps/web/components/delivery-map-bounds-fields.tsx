"use client";
import { deliveryAreaBounds } from "../../../packages/business-rules/src/delivery-pin-area";
export default function DeliveryMapBoundsFields({
  value,
  onChange,
}: {
  value: any;
  onChange: (value: any) => void;
}) {
  const effective = deliveryAreaBounds({
    ...value,
    map_bounds: value.mapBounds,
  });
  return (
    <details>
      <summary>Delivery map boundary</summary>
      <p>
        Pins outside this rectangle cannot be confirmed. Use your
        business-approved boundary. This check does not verify individual
        streets or entrances.
      </p>
      <label>
        <input
          type="checkbox"
          checked={value.mapBounds != null}
          onChange={(e) =>
            onChange({
              ...value,
              mapBounds: e.target.checked
                ? (effective ?? { south: 0, north: 0, west: 0, east: 0 })
                : null,
            })
          }
        />
        Use a custom boundary
      </label>
      {value.mapBounds != null ? (
        (["south", "north", "west", "east"] as const).map((k) => (
          <label key={k}>
            {k.charAt(0).toUpperCase() + k.slice(1)} coordinate
            <input
              type="number"
              step="any"
              min={k === "south" || k === "north" ? -90 : -180}
              max={k === "south" || k === "north" ? 90 : 180}
              required
              value={value.mapBounds[k]}
              onChange={(e) =>
                onChange({
                  ...value,
                  mapBounds: {
                    ...value.mapBounds,
                    [k]: e.target.value === "" ? "" : Number(e.target.value),
                  },
                })
              }
            />
          </label>
        ))
      ) : (
        <p>
          {effective
            ? `Using the initial locality check: south ${effective.south}, north ${effective.north}, west ${effective.west}, east ${effective.east}.`
            : "No geographic boundary is configured. Add one before customers confirm map pins."}
        </p>
      )}
    </details>
  );
}
