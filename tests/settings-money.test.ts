import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import SettingSummary from '../apps/web/components/setting-summary';
test('SETUP-MONEY01: stored kobo displays as naira exactly once for gas, delivery, zero and fractional naira',()=>{
 for(const [value,display] of [[180000,'₦1,800.00'],[180500,'₦1,805.00'],[500000,'₦5,000.00'],[0,'₦0.00'],[101,'₦1.01']] as const){const html=renderToStaticMarkup(React.createElement(SettingSummary,{value,type:'money'}));assert.ok(html.includes(display),`${value} kobo must display ${display}`);}
 const html=renderToStaticMarkup(React.createElement(SettingSummary,{value:180000,type:'money'}));assert.ok(!html.includes('₦180,000.00'));assert.ok(!html.includes('₦18.00'));
 assert.ok(renderToStaticMarkup(React.createElement(SettingSummary,{value:180000,type:'integer'})).includes('180000'));
 assert.ok(renderToStaticMarkup(React.createElement(SettingSummary,{value:null,type:'money'})).includes('Not configured'));
});
