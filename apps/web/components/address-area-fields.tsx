"use client";
import { FieldCaption } from "./field-caption";
import { useState } from "react";
import { selectAddressLocation } from "../../../packages/business-rules/src/address-location";
/** Native named fields preserve the existing FormData and server validation contracts. */
export function AddressAreaFields({
  areas,
  street = "",
  area = "",
  areaName = "zone",
  areaLabel = "Delivery location",
  maxLength = 1000,
  onRecognizedArea,
  onDeliveryChange,
}: {
  areas: { id: string; name: string }[];
  street?: string;
  area?: string;
  areaName?: string;
  areaLabel?: string;
  maxLength?: number;
  onRecognizedArea?: (area: string) => void;
  onDeliveryChange?: (value:{street:string;zone:string})=>void;
}) {
  const [text, setText] = useState(street);
  const [chosen, setChosen] = useState<string | null>(area || null);
  const selection = selectAddressLocation(
    !onRecognizedArea && chosen === "" ? "" : text,
    areas,
    onRecognizedArea ? area : (chosen ?? undefined),
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
            setText(value);
            const next=selectAddressLocation(value,areas,onRecognizedArea?area:chosen === ""?undefined:(chosen??undefined));
            onDeliveryChange?.({street:value,zone:next.location?.name ?? ""});
            if (chosen === "") setChosen(null);
            if (onRecognizedArea && !area) {
              const { location } = selectAddressLocation(value, areas);
              if (location) onRecognizedArea(location.id);
            }
          }}
        />
      </label>
      {selection.message && (
        <p className="address-location-feedback" role="status">
          {selection.message}
        </p>
      )}
      {!onRecognizedArea && (
        <label>
          <FieldCaption required={true}>{areaLabel}</FieldCaption>
          <select
            name={areaName}
            value={selection.location?.id ?? ""}
            required
            onChange={(e) => {setChosen(e.target.value);onDeliveryChange?.({street:text,zone:areas.find(a=>a.id===e.target.value)?.name ?? ""});}}
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
