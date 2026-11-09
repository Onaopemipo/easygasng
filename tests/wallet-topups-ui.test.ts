import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {WalletFunding} from "../apps/web/components/hosted-payment";
test("WALLET-UI: top-up methods render without inventing a receiving bank or claiming an unverified balance",()=>{
 const html=renderToStaticMarkup(React.createElement(WalletFunding));
 assert.match(html,/Top up your wallet/);
 assert.match(html,/Bank transfer · approval required/);
 assert.match(html,/Credit \/ debit card · automatic verification/);
 assert.match(html,/Bank-transfer funding is unavailable until EasyGas configures its receiving bank account/);
 assert.doesNotMatch(html,/Account number|type="password"|type="credit-card"/);
});
