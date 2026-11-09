import test from "node:test";
import assert from "node:assert/strict";
import { resolveAddressLocation } from "../packages/business-rules/src/address-location";
const locations = [
  { id: "vi", name: "Victoria Island" },
  { id: "lekki", name: "Lekki" },
  { id: "ajah", name: "Ajah" },
];
test("ADR-01: full house addresses identify a single configured locality", () => {
  assert.equal(
    resolveAddressLocation(
      "Flat 4, 12 Adeola Street, Victoria Island, Lagos, Nigeria",
      locations,
    ).location?.id,
    "vi",
  );
  assert.equal(
    resolveAddressLocation("12 Example Road; LEKKI Lagos Nigeria", locations)
      .location?.id,
    "lekki",
  );
});
test("ADR-04: addresses without commas match only explicit locality and city suffixes", () => {
  assert.equal(
    resolveAddressLocation(
      "Flat 4 12 Example Road Victoria Island Lagos Nigeria",
      locations,
    ).location?.id,
    "vi",
  );
  assert.equal(
    resolveAddressLocation("12 Example Road Lekki Abuja", locations).location,
    null,
  );
});
test("ADR-02: ambiguous, unknown and street-name matches require confirmation", () => {
  for (const text of [
    "12 Lekki Street, Abuja",
    "12 Road, Lekki, Abuja",
    "12 Road, Lekkiwood",
    "12 Road",
    "",
  ])
    assert.equal(resolveAddressLocation(text, locations).status, "unmatched");
  assert.equal(
    resolveAddressLocation("12 Road, Ajah, Lekki, Lagos", locations).status,
    "ambiguous",
  );
  assert.equal(
    resolveAddressLocation(
      "12 Road, Victoria Island",
      locations.filter((l) => l.id !== "vi"),
    ).status,
    "unmatched",
  );
});
test("ADR-03: changing or deleting an address cannot reuse a previous automatic match", () => {
  assert.equal(
    resolveAddressLocation("12 Road, Lekki", locations).location?.id,
    "lekki",
  );
  assert.equal(
    resolveAddressLocation("12 Road, unknown", locations).location,
    null,
  );
  assert.equal(resolveAddressLocation("", locations).location, null);
});
