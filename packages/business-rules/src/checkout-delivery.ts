import { bookingPhone } from "./booking-contact";

export type CheckoutAddress = {
  id: string;
  label: string;
  street: string;
  zone: string;
  phone: string;
  is_default?: boolean;
  location_available?: boolean;
  location_id?: string | null;
  details?: { recipient?: string; building?: string; landmark?: string; directions?: string };
};

export type CheckoutProfile = {
  user?: { id: string; name?: string; contact_phone?: string | null };
  addresses?: CheckoutAddress[];
  deliveryLocations?: { id: string; name: string }[];
};

export function checkoutAddresses(profile?: CheckoutProfile | null) {
  return (profile?.addresses ?? []).flatMap((address) => {
    // Older address records have a zone name but no location ID.
    const location = profile?.deliveryLocations?.find((area) =>
      address.location_id
        ? address.location_id === area.id
        : address.zone.trim().toLowerCase() === area.name.trim().toLowerCase(),
    );
    return location ? [{ ...address, location_id: location.id, zone: location.name }] : [];
  });
}

export function defaultCheckoutAddress(addresses: CheckoutAddress[]) {
  return addresses.find((address) => address.is_default) ?? addresses[0];
}

export function checkoutDelivery(
  profile?: CheckoutProfile | null,
  address?: CheckoutAddress,
  accountName = "",
) {
  return {
    name: address?.details?.recipient?.trim() || profile?.user?.name || accountName,
    phone: bookingPhone(address?.phone ?? "") ?? bookingPhone(profile?.user?.contact_phone ?? "") ?? "",
    street: address?.street ?? "",
    zone: address?.zone ?? "",
    locationId: address?.location_id ?? "",
    building: address?.details?.building ?? "",
    landmark: address?.details?.landmark ?? "",
    directions: address?.details?.directions ?? "",
  };
}
