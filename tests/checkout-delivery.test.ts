import test from "node:test";
import assert from "node:assert/strict";
import {
  checkoutAddresses,
  checkoutDelivery,
  defaultCheckoutAddress,
  type CheckoutAddress,
  type CheckoutProfile,
} from "../packages/business-rules/src/checkout-delivery";

const home: CheckoutAddress = {
  id: "home", label: "Home", street: "14 Fixture Street, Lekki",
  zone: "Lekki", location_id: "lekki", phone: "08012345678",
  is_default: true, details: { recipient: "Saved Recipient", building: "14" },
};
const legacy: CheckoutAddress = {
  id: "legacy", label: "Work", street: "20 Fixture Road, Ajah",
  zone: " ajah ", phone: "invalid old number", location_id: null,
  location_available: false,
};
const profile: CheckoutProfile = {
  user: { id: "customer", name: "Account Holder", contact_phone: "+2348091234567" },
  deliveryLocations: [{ id: "lekki", name: "Lekki" }, { id: "ajah", name: "Ajah" }],
  addresses: [legacy, home],
};

test("CHECKOUT-PREFILL01: prefer the saved default, fall back to a usable legacy address and then to the account contact", () => {
  const available = checkoutAddresses(profile);
  assert.deepEqual(available.map((a) => a.id), ["legacy", "home"]);
  const delivery = checkoutDelivery(profile, defaultCheckoutAddress(available));
  assert.deepEqual(
    [delivery.name, delivery.phone, delivery.street, delivery.zone, delivery.building],
    ["Saved Recipient", "08012345678", home.street, "Lekki", "14"],
  );
  // A saved ID for an unavailable location cannot be substituted by name.
  const unavailable = { ...home, location_id: "inactive-lekki" };
  const fallback = defaultCheckoutAddress(checkoutAddresses({ ...profile, addresses: [unavailable, legacy] }));
  assert.equal(fallback?.location_id, "ajah");
  assert.equal(fallback?.zone, "Ajah");
  assert.equal(checkoutDelivery(profile, fallback).phone, "+2348091234567");
  assert.deepEqual(checkoutDelivery(profile), {
    name: "Account Holder", phone: "+2348091234567", street: "", zone: "",
    locationId: "", building: "", landmark: "", directions: "",
  });
});
