import test from "node:test";
import assert from "node:assert/strict";
import { gatewayPolicy } from "../apps/web/lib/payments/policy";
import { customerMobileLink } from "../packages/business-rules/src/customer-mobile";
const policy = {
  enabled: false,
  environment: "test",
  channels: [],
  fee: null,
  providerAutomaticFees: "unknown",
  passThroughApproved: false,
  merchantApprovalReference: "",
  quoteLifetimeSeconds: 600,
  walletFunding: false,
  walletMinimumKobo: 10000,
  walletMaximumKobo: 10000000,
  partialInvoices: false,
};
test("PAY-POLICY: missing merchant terms, dashboard fee double charge, live activation and undeclared secrets fail closed", () => {
  assert.ok(gatewayPolicy.safeParse(policy).success);
  assert.equal(
    gatewayPolicy.safeParse({ ...policy, enabled: true }).success,
    false,
  );
  const fee = {
    version: 1,
    currency: "NGN",
    percentageBps: 170,
    fixedKobo: 110,
    fixedWaivedBelowKobo: 2500,
    capKobo: 2000,
    rounding: "ceil",
    maximumGrossKobo: 10000000,
    bearer: "customer",
  };
  const enabled = {
    ...policy,
    enabled: true,
    channels: ["card"],
    fee,
    providerAutomaticFees: "off",
    merchantApprovalReference: "Synthetic policy fixture",
  };
  assert.equal(gatewayPolicy.safeParse(enabled).success, false);
  assert.ok(
    gatewayPolicy.safeParse({ ...enabled, passThroughApproved: true }).success,
  );
  assert.equal(
    gatewayPolicy.safeParse({
      ...enabled,
      passThroughApproved: true,
      environment: "live",
    }).success,
    false,
  );
  assert.equal(
    gatewayPolicy.safeParse({
      ...enabled,
      passThroughApproved: true,
      providerAutomaticFees: "on",
    }).success,
    false,
  );
  assert.equal(
    gatewayPolicy.safeParse({
      ...enabled,
      passThroughApproved: true,
      secretKey: "forbidden",
    }).success,
    false,
  );
  assert.equal(
    gatewayPolicy.safeParse({
      ...enabled,
      passThroughApproved: true,
      walletMinimumKobo: 100000,
      walletMaximumKobo: 100,
    }).success,
    false,
  );
});
test("PAY-LINK: native payment return carries only one opaque intent ID; success/amount/provider redirects cannot authorize payment", () => {
  const id = "0bd87322-b752-4f87-b205-abde180fa008";
  assert.deepEqual(customerMobileLink("easygas://payment?intentId=" + id), {
    screen: "payment",
    id,
  });
  for (const suffix of ["&success=true", "&amount=100", "&intentId=" + id])
    assert.equal(
      customerMobileLink("easygas://payment?intentId=" + id + suffix),
      null,
    );
  assert.equal(
    customerMobileLink("https://checkout.paystack.com/?intentId=" + id),
    null,
  );
  assert.equal(customerMobileLink("easygas://payment?intentId=invalid"), null);
});
