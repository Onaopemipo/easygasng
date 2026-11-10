import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SettingSummary, { readableSetting } from '../apps/web/components/setting-summary';
import { readFileSync } from 'node:fs';
test('SETUP-01: payment summary preserves false flags and exact money without raw object dumps', () => {
 const html = renderToStaticMarkup(React.createElement(SettingSummary, {value:{enabled:true,walletFunding:false,environment:'test',channels:['card'],walletMinimumKobo:10000,walletMaximumKobo:10000000,fee:{percentageBps:150,fixedKobo:10000,capKobo:200000,fixedWaivedBelowKobo:250000,maximumGrossKobo:10000000,bearer:'customer'},merchantApprovalReference:'SANDBOX approved only'}}));
 for(const text of ['Card top-ups · Disabled','Sandbox / test mode','Credit / debit card','Customer','1.5%','100.00','100,000.00','SANDBOX approved only','<details']) assert.ok(html.includes(text),text);
 assert.ok(!html.includes('[object Object]'));
 assert.equal(readableSetting({nested:{enabled:false}}),'Nested: Enabled: Disabled');
 assert.equal(readableSetting(null),'Not configured');
});
test('SETUP-02: existing proposal roles, approval and history actions remain; tools are collapsed', () => {
 const s=readFileSync('apps/web/components/admin.tsx','utf8');
 assert.ok(s.includes('d.propose_roles.includes(user.role)'));
 assert.ok(s.includes('setting.rollback'));
 assert.ok(s.includes('Two distinct authorised approvers + identity verification'));
 assert.ok(s.includes('<details className="settings-tools">'));
 assert.ok(s.includes('setActionError(e.message)'));
 assert.ok(s.includes('aria-pressed={c === current && !query}'));
});
test('SETUP-03: locations show readable visibility and missing coverage without inventing approval', () => {
 const value={name:'Ajah',city:'Lagos',state:'Lagos',country:'Nigeria',active:true,visible:true,archived:false,branchId:'lagos',coverage:'',description:'',displayOrder:4};
 const html=renderToStaticMarkup(React.createElement(SettingSummary,{type:'location',value}));
 for(const text of ['Active location','Shown to customers','Coverage boundary needs confirmation','Ajah, Lagos, Nigeria','Location details','Staff confirms each delivery address']) assert.ok(html.includes(text),text);
 assert.ok(!html.includes('active: true')); assert.ok(!html.includes('branchId'));
 const hidden=renderToStaticMarkup(React.createElement(SettingSummary,{type:'location',value:{...value,active:false,visible:false,archived:true,coverage:'Approved street list',requiresAddressConfirmation:false}}));
 for(const text of ['Archived','Hidden from customers','Approved street list','subject to existing backend checks']) assert.ok(hidden.includes(text));
 assert.ok(!hidden.includes('Coverage boundary needs confirmation'));
});
