"use client";
import { FieldCaption } from "./field-caption";
import { useState } from "react";
import {
  resolveAddressLocation,
  addressLocationMessage,
} from "../../../packages/business-rules/src/address-location";
/** Native named fields preserve the existing FormData and server validation contracts. */
export function AddressAreaFields({
  areas,
  street = "",
  area = "",
  areaName = "zone",
  areaLabel = "Delivery location",
  maxLength = 1000,
  onRecognizedArea,
}: {
  areas: { id: string; name: string }[];
  street?: string;
  area?: string;
  areaName?: string;
  areaLabel?: string;
  maxLength?: number;
  onRecognizedArea?: (area: string) => void;
}) {
  const [text, setText] = useState(street);
  const [selected, setSelected] = useState(area);
  const [hint, setHint] = useState(
    "Include your house/flat number, street, estate and area, separated by commas.",
  );
  return (
    <>
      <label>
        <FieldCaption required={true}>Complete house address</FieldCaption>
        <textarea
          name="street"
          autoComplete="street-address"
          required
          minLength={8}
          maxLength={maxLength}
          rows={3}
          placeholder="House/flat number, street, estate, area, city"
          value={text}
          onChange={(e) => {
            const value = e.target.value;
            const result = resolveAddressLocation(value, areas);
            setText(value);
            if (onRecognizedArea && result.location)
              onRecognizedArea(result.location.id);
            else setSelected(result.location?.id ?? "");
            const message = addressLocationMessage(
              result.status,
              result.location?.name,
            );
            setHint(
              onRecognizedArea ? message.replace("below", "above") : message,
            );
          }}
        />
      </label>
      <p className="address-location-feedback" role="status">
        {hint}
      </p>
      {!onRecognizedArea && (
        <label>
          <FieldCaption required={true}>{areaLabel}</FieldCaption>
          <select
            name={areaName}
            value={selected}
            required
            onChange={(e) => {
              setSelected(e.target.value);
              setHint(
                "Delivery location chosen manually. Please check it matches your address.",
              );
            }}
          >
            <option value="">Choose your location</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}
