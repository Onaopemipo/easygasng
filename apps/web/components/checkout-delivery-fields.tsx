"use client";
import {selectAddressLocation} from "../../../packages/business-rules/src/address-location";
import DeliveryPinPicker from "./delivery-pin-picker";
import {confirmedDeliveryPin,type ConfirmedDeliveryPin} from "../../../packages/business-rules/src/delivery-pin";
import { FieldCaption } from "./field-caption";
import { useEffect, useState } from "react";
import {
  checkoutAddresses,
  checkoutDelivery,
  defaultCheckoutAddress,
  type CheckoutProfile,
} from "../../../packages/business-rules/src/checkout-delivery";
import { bookingPhone } from "../../../packages/business-rules/src/booking-contact";
import { AddressAreaFields } from "./address-area-fields";
import { FormInput } from "./password-input";
import { api } from "./ui";
import { ActionLoadingIndicator } from "./easygas-loader";

export function useCheckoutProfile(id?: string) {
  const [loaded, setLoaded] = useState<{ id: string; profile: CheckoutProfile | null }>();
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      setLoaded({ id, profile: null });
    }, 15000);
    api("account.profile", undefined, { signal: controller.signal })
      .then((profile: CheckoutProfile) => {
        if (!controller.signal.aborted)
          setLoaded({ id, profile: profile.user?.id === id ? profile : null });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoaded({ id, profile: null });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [id]);
  return { profile: loaded?.id === id ? loaded?.profile : undefined, loading: Boolean(id && loaded?.id !== id) };
}

export function CheckoutDeliveryFields({ user, zones, mapAreas, draftStreet = "" }: {
  user: { id: string; name: string };
  zones: string[];
  mapAreas?: {id:string;name:string;map_bounds?:unknown}[];
  draftStreet?: string;
}) {
  const { profile, loading } = useCheckoutProfile(user.id);
  if (loading) return <ActionLoadingIndicator label="Loading your delivery details" />;
  return <DeliveryFields profile={profile} name={user.name} zones={zones} mapAreas={mapAreas} draftStreet={draftStreet} />;
}

function DeliveryFields({ profile, name, zones, mapAreas, draftStreet }: {
  profile?: CheckoutProfile | null;
  name: string;
  zones: string[];
  mapAreas?: {id:string;name:string;map_bounds?:unknown}[];
  draftStreet: string;
}) {
  const areas = zones.map((zone) => mapAreas?.find(a=>a.name===zone) ?? ({ id: zone, name: zone }));
  const addresses = checkoutAddresses(profile).filter((address) => zones.includes(address.zone));
  const [choice, setChoice] = useState(draftStreet.trim() ? "draft" : defaultCheckoutAddress(addresses)?.id ?? "");
  const address = checkoutDelivery(profile, addresses.find((item) => item.id === choice), name);
  return (
    <>
      {addresses.length > 0 && (
        <label>
          <FieldCaption required={false}>Saved address</FieldCaption>
          <select value={choice} onChange={(e) => setChoice(e.target.value)}>
            {draftStreet.trim() && <option value="draft">Use the address entered earlier</option>}
            <option value="">Use a different address</option>
            {addresses.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.street}</option>)}
          </select>
        </label>
      )}
      <p className="muted">Edit the recipient, phone or address for this order.</p>
      <div key={choice}>
        <div className="form-columns">
          <label>
            <FieldCaption required={true}>Recipient name</FieldCaption>
            <FormInput name="name" required defaultValue={address.name} minLength={2} maxLength={100} autoComplete="shipping name" />
          </label>
          <label>
            <FieldCaption required={true}>Phone number</FieldCaption>
            <FormInput name="phone" required defaultValue={address.phone} type="tel" autoComplete="shipping tel" />
          </label>
        </div>
        <PinnedAddressFields areas={areas} street={choice === "draft" ? draftStreet : address.street} zone={address.zone} pin={choice === "draft" ? undefined : address.deliveryPin} />
      </div>
    </>
  );
}

function PinnedAddressFields({areas,street,zone,pin}:{areas:{id:string;name:string}[];street:string;zone:string;pin?:ConfirmedDeliveryPin}) {
 const [address,setAddress]=useState({street,zone:selectAddressLocation(street,areas,zone || undefined).location?.name ?? zone}),[point,setPoint]=useState(pin);
 return <><AddressAreaFields areas={areas} street={street} area={zone} areaLabel="Delivery area" maxLength={250} onDeliveryChange={next=>{setAddress(next);setPoint(undefined);}} />
 <DeliveryPinPicker area={areas.find(a=>a.name===address.zone)} street={address.street} zone={address.zone} value={point} onChange={setPoint}/>
 <input type="hidden" name="deliveryPin" value={point?JSON.stringify(point):""}/></>;
}

export function readCheckoutDelivery(values: Record<string, FormDataEntryValue>) {
  if (!values.name || !values.phone || !values.street || !values.zone)
    throw new Error("Enter the recipient name, phone number and delivery address.");
  let deliveryPin: ConfirmedDeliveryPin | undefined;
  if (values.deliveryPin !== undefined) {
    try {deliveryPin=confirmedDeliveryPin(JSON.parse(String(values.deliveryPin)),String(values.street),String(values.zone)) ?? undefined;} catch {}
    if (!deliveryPin) throw new Error("Choose and confirm the delivery map location.");
  }
  return {
    ...(deliveryPin?{deliveryPin}:{}),
    name: String(values.name),
    phone: bookingPhone(String(values.phone)) ?? String(values.phone),
    street: String(values.street),
    zone: String(values.zone),
  };
}
