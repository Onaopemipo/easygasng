import test from "node:test";
import assert from "node:assert/strict";
import {
  providerFee,
  quotePaymentFee,
  type PaymentFeePolicy,
} from "../packages/business-rules/src/payment-fees";
// Deliberately synthetic rates; not an approved Paystack merchant fee schedule.
const p: PaymentFeePolicy = {
  version: 1,
  currency: "NGN",
  percentageBps: 170,
  fixedKobo: 110,
  fixedWaivedBelowKobo: 2500,
  capKobo: 2000,
  rounding: "ceil",
  maximumGrossKobo: 100000,
  bearer: "customer",
};
test("PAY-FEE: zero, waiver discontinuities, caps and smallest integer gross match exhaustive search", () => {
  for (const rounding of ["ceil", "floor", "nearest"] as const) {
    const policy = { ...p, rounding, maximumGrossKobo: 10000000 };
    assert.equal(quotePaymentFee(0, policy).grossKobo, 0);
    for (const base of [
      1, 10, 100, 2300, 2347, 2400, 2499, 2500, 2501, 3000, 10000, 80000, 98000,
      109176, 109177, 110000, 111177, 120000, 200000, 2750000,
    ]) {
      let expected = base;
      while (expected - providerFee(expected, policy) < base) expected++;
      const q = quotePaymentFee(base, policy);
      assert.equal(q.grossKobo, expected);
      assert.equal(q.customerFeeKobo, q.grossKobo - base);
      assert.ok(q.expectedNetKobo >= base);
    }
  }
});
test("PAY-FEE-LIMIT: merchant absorption, maximum/invalid amounts and exact wallet principal remain distinct", () => {
  const q = quotePaymentFee(2000000, { ...p, maximumGrossKobo: 10000000 });
  assert.equal(q.baseKobo, 2000000);
  assert.ok(q.grossKobo > q.baseKobo);
  assert.equal(
    quotePaymentFee(10000, { ...p, bearer: "merchant" }).grossKobo,
    10000,
  );
  assert.throws(() => quotePaymentFee(-1, p));
  assert.throws(() => quotePaymentFee(0.5, p));
  assert.throws(() => quotePaymentFee(Number.MAX_SAFE_INTEGER, p));
  assert.throws(() => quotePaymentFee(100000, p));
  assert.throws(() => quotePaymentFee(100, { ...p, percentageBps: 10000 }));
});
