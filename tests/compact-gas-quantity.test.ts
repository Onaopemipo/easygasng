import test from "node:test";
import assert from "node:assert/strict";
import {
  gasLine,
  nextGasQuantity,
  gasMoney,
} from "../packages/business-rules/src/gas-pricing";

test("COMPACT-STEP01: steppers follow backend increments and precision without filling the cylinder", () => {
  const policy = {
    minimumKg: 0.75,
    maximumKg: 8.75,
    incrementKg: 0.25,
    precision: 1,
    capacitiesKg: [3, 12.5],
  };
  assert.equal(nextGasQuantity("", 1, 12.5, policy), 1);
  assert.equal(nextGasQuantity("2.3", 1, 12.5, policy), 2.5);
  assert.equal(nextGasQuantity("2.3", -1, 12.5, policy), 2);
  assert.equal(nextGasQuantity("8.5", 1, 12.5, policy), null);
  assert.equal(nextGasQuantity("1", -1, 12.5, policy), null);
  assert.equal(nextGasQuantity("3.5", -1, 3, policy), 3);
  assert.equal(
    nextGasQuantity("", 1, 12.5, { ...policy, incrementKg: null }),
    null,
  );
  assert.equal(gasLine("2.5", 12.5, 182900, policy).grams, 2500);
  for (const invalid of ["", "2e0", "-1", "2.55", "12.6"])
    assert.throws(() => gasLine(invalid, 12.5, 182900, policy));
});

test("COMPACT-MONEY01: fractional naira are displayed without rounding away kobo", () => {
  assert.equal(gasMoney(957250), "₦9,572.50");
  assert.equal(gasMoney(500000), "₦5,000");
});
