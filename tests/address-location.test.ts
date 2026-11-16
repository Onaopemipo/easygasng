import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveAddressLocation,
  selectAddressLocation,
} from "../packages/business-rules/src/address-location";
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

test("ADR-07: address edits preserve explicitly selected and saved areas", () => {
  for (const address of [
    "",
    "27 Adeola Street",
    "27 Adeola Street, Victoria I",
  ])
    assert.equal(
      selectAddressLocation(address, locations, "vi").location?.id,
      "vi",
    );

  const conflict = selectAddressLocation(
    "27 Adeola Street, Lekki",
    locations,
    "vi",
  );
  assert.equal(conflict.location?.id, "vi");
  assert.match(conflict.message, /mentions Lekki.*selected Victoria Island/);
  const ambiguous = selectAddressLocation(
    "27 Adeola Street, Lekki, Ajah",
    locations,
    "vi",
  );
  assert.equal(ambiguous.location?.id, "vi");
  assert.match(ambiguous.message, /more than one area/);
});

test("ADR-08: an automatic suggestion follows the address and respects current choices", () => {
  assert.equal(
    selectAddressLocation("27 Adeola Street, Lekki", locations).location?.id,
    "lekki",
  );
  assert.equal(
    selectAddressLocation("27 Adeola Street, Ajah", locations).location?.id,
    "ajah",
  );
  assert.equal(
    selectAddressLocation("27 Adeola Street", locations).location,
    null,
  );
  assert.equal(
    selectAddressLocation("27 Adeola Street", locations, "retired-area")
      .location,
    null,
  );
  assert.equal(
    selectAddressLocation("27 Lekki Street, Abuja", locations).location,
    null,
  );
});
