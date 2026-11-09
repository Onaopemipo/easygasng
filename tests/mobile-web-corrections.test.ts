import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OrderCardPayment, paymentMoney } from "../apps/web/components/hosted-payment";
import {
  PageLoadingFallback,
  SectionLoadingFallback,
} from "../apps/web/components/easygas-loader";
import { Loading } from "../apps/web/components/ui";
import {
  customerAuthHref,
  parseShoppingCart,
} from "../packages/business-rules/src/customer-navigation";

test("MWEB-02: auth switching keeps checkout return and rejects external destinations; carts retain only bounded product quantities", () => {
  assert.equal(
    customerAuthHref(true, "/checkout"),
    "/register?returnTo=%2Fcheckout",
  );
  assert.equal(
    customerAuthHref(false, "/checkout"),
    "/login?returnTo=%2Fcheckout",
  );
  assert.equal(
    customerAuthHref(true, "https://evil.example/checkout"),
    "/register?returnTo=%2Faccount",
  );
  assert.equal(
    customerAuthHref(false, "//evil.example"),
    "/login?returnTo=%2Faccount",
  );
  assert.deepEqual(
    parseShoppingCart(
      JSON.stringify([
        { productId: "hose", quantity: 2, price: 1, customerId: "ignore" },
        { productId: "hose", quantity: 2 },
        { productId: "regulator", quantity: 999 },
      ]),
    ),
    [{ productId: "hose", quantity: 2 }],
  );
  assert.deepEqual(parseShoppingCart("corrupt"), []);
});
test("MWEB-03-UI: card payment remains distinct from payment confirmation and never prompts paid, COD or cancelled orders", () => {
  assert.match(paymentMoney(700508), /7,005\.08/);
  assert.match(paymentMoney(50), /0\.50/);
  const render = (order: any) =>
    renderToStaticMarkup(React.createElement(OrderCardPayment, { order }));
  assert.match(
    render({
      id: "fixture",
      payment_method: "card",
      payment_status: "unpaid",
      status: "placed",
    }),
    /unpaid until Paystack verification succeeds/,
  );
  for (const order of [
    { payment_method: "wallet", payment_status: "verified" },
    { payment_method: "cash_on_delivery", payment_status: "unpaid" },
    { payment_method: "card", payment_status: "verified" },
    { payment_method: "card", payment_status: "unpaid", status: "cancelled" },
  ])
    assert.equal(render(order), "");
});
test("MWEB-04: route waits use full viewport; page waits and local waits have separate containers", () => {
  assert.match(
    renderToStaticMarkup(React.createElement(PageLoadingFallback)),
    /eg-loader--fullscreen/,
  );
  assert.match(
    renderToStaticMarkup(React.createElement(SectionLoadingFallback)),
    /eg-loader--section/,
  );
  assert.match(
    renderToStaticMarkup(React.createElement(Loading, { page: true })),
    /loading--page/,
  );
  assert.doesNotMatch(
    renderToStaticMarkup(React.createElement(Loading)),
    /loading--page|eg-loader--fullscreen/,
  );
});
