import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {CustomerWallet} from "../apps/web/components/customer-wallet";
import {WalletFunding} from "../apps/web/components/hosted-payment";
test("WALLET-UI: top-up methods render without inventing a receiving bank or claiming an unverified balance",()=>{
 const html=renderToStaticMarkup(React.createElement(WalletFunding));
 assert.match(html,/Top up your wallet/);
 assert.match(html,/Bank transfer · approval required/);
 assert.match(html,/Credit \/ debit card · automatic verification/);
 assert.match(html,/Continue/);
 assert.match(html,/Loading payment methods/);
 assert.doesNotMatch(html,/Account number|type="password"|type="credit-card"/);
});

test("WALLET-QUIET: default wallet shows balance and transactions without mounting funding or document filters",()=>{
 const html=renderToStaticMarkup(React.createElement(CustomerWallet,{data:{balanceKobo:0,entries:[]}}));
 assert.match(html,/Top up wallet/);assert.match(html,/Transactions/);assert.match(html,/Invoices &amp; receipts/);
 assert.doesNotMatch(html,/Search documents|Document status|Top up your wallet|A fresh start/);
});
