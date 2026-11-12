import test from "node:test";
import assert from "node:assert/strict";
import { dispatch } from "../apps/web/lib/service";
import { fixture } from "./helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
import { safeCustomerReturn } from "../packages/business-rules/src/customer-navigation";
import {
  activeServiceSlots,
  assertServiceSelection,
  serviceDetailText,
  serviceMoney,
  servicePrice,
  serviceSlotDay,
  serviceSlotTime,
} from "../packages/business-rules/src/service-detail";

test("SDR-T005: money and details preserve real zero and configured content, with honest missing states", () => {
  assert.equal(serviceMoney(0), "₦0");
  assert.equal(serviceMoney(undefined), null);
  assert.equal(serviceMoney(null), null);
  assert.equal(
    servicePrice({ priceKobo: 115025, pricingModel: "starting" }),
    "From ₦1,150.25",
  );
  assert.equal(
    servicePrice({ priceKobo: null, pricingModel: "fixed" }),
    "Price unavailable",
  );
  assert.equal(
    servicePrice({ priceKobo: null, pricingModel: "quote" }),
    "Quotation required",
  );
  assert.equal(serviceDetailText("Business configuration required."), "");
  assert.equal(serviceDetailText("No warranty terms configured."), "");
  assert.equal(
    serviceDetailText("Configured scope\nConfigured second item"),
    "Configured scope\nConfigured second item",
  );
});

test("SDR-T025: changed service version and stale slots cannot reach review; slot times use Lagos", () => {
  const starts_at = new Date(Date.now() + 120000).toISOString();
  const ends_at = new Date(Date.now() + 3600000).toISOString();
  const available = {
    status: "available" as const,
    serviceVersion: 5,
    slots: [{ id: "fixture", starts_at, ends_at }],
  };
  assert.doesNotThrow(() => assertServiceSelection(available, 5, "fixture"));
  assert.throws(
    () => assertServiceSelection(available, 4, "fixture"),
    /pricing changed/,
  );
  assert.throws(
    () => assertServiceSelection(available, 5, "another"),
    /no longer available/,
  );
  assert.deepEqual(
    activeServiceSlots(available.slots, Date.parse(starts_at)),
    [],
  );
  const boundary = {
    id: "lagos",
    starts_at: "2030-01-01T23:30:00Z",
    ends_at: "2030-01-02T00:30:00Z",
  };
  assert.match(serviceSlotDay(boundary), /2 Jan/);
  assert.equal(serviceSlotTime(boundary), "00:30–01:30");
});

test("SDR-T022: real slot read distinguishes configuration, coverage, qualification and absence without exposing staff", async () => {
  const f = await fixture();
  const input = f.input();
  const query = { serviceId: input.serviceId, branchId: input.branchId };
  const read = (extra = {}) =>
    dispatch(
      "services.slots",
      null,
      { ...query, view: "detail", ...extra },
      f.db,
    );
  try {
    const available = await read({ zone: input.address.zone });
    assert.equal(available.status, "available");
    assert.equal(available.serviceVersion, input.serviceVersion);
    assert.deepEqual(Object.keys(available.slots[0]).sort(), [
      "ends_at",
      "id",
      "starts_at",
    ]);
    assert.deepEqual(
      available.slots,
      await dispatch("services.slots", null, query, f.db),
    );
    assert.equal(
      (await read({ zone: "Outside service coverage" })).status,
      "outside_coverage",
    );
    assert.equal((await read({ serviceId: "unknown" })).status, "unconfigured");

    await f.db.query(
      "UPDATE service_slots SET ends_at=ends_at+interval '15 minutes' WHERE id=$1",
      [input.slotId],
    );
    assert.equal((await read()).status, "no_slots");
    await assert.rejects(
      () => f.call("customer", "booking.create", input),
      /duration|qualification/,
    );
    await f.db.query(
      "UPDATE service_slots SET ends_at=ends_at-interval '15 minutes' WHERE id=$1",
      [input.slotId],
    );
    await f.db.query(
      "UPDATE users SET technician_available=false WHERE id=$1",
      [f.actors.technician.id],
    );
    assert.equal((await read()).status, "no_qualified_technician");
    await f.db.query("UPDATE users SET technician_available=true WHERE id=$1", [
      f.actors.technician.id,
    ]);
    const created = await f.call("customer", "booking.create", {
      ...input,
      operationKey: id(),
    });
    assert.match(created.reference, /^EGS-/);
    assert.equal((await read()).status, "no_slots");
    assert.deepEqual(await f.call("commercial", "bookings"), []);
  } finally {
    await f.db.close?.();
  }
});

test("SDR-T030: service sign-in return preserves known booking context and drops unrecognised parameters", () => {
  assert.equal(
    safeCustomerReturn(
      "/services/cooker-servicing?followup=abc&bundle=kit&bundleVersion=2&next=https://invalid.test",
    ),
    "/services/cooker-servicing?followup=abc&bundle=kit&bundleVersion=2",
  );
  assert.equal(
    safeCustomerReturn("//example.test/services/cooker-servicing"),
    "/account",
  );
});
