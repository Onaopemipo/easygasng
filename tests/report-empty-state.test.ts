import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ReportActivityTables} from '../apps/web/components/business-centre';
test('REPORT-EMPTY01: empty schedule and delivery lists show one helpful state and populated lists retain distinct records',()=>{
 const render=(schedules:any[],deliveries:any[])=>renderToStaticMarkup(React.createElement(ReportActivityTables,{schedules,deliveries}));
 const empty=render([],[]);assert.equal((empty.match(/No scheduled reports yet/g)||[]).length,1);assert.ok(empty.includes('Create a report schedule above'));assert.ok(!empty.includes('No recorded activity'));assert.ok(!empty.includes('<table'));
 const schedule={id:'schedule-fixture',report:'sales',frequency:'weekly',next_run:'2026-11-11',active:true},delivery={id:'delivery-fixture',status:'available_in_app'};
 const schedules=render([schedule],[]);assert.ok(schedules.includes('schedule-fixture'));assert.ok(schedules.includes('No scheduled reports are ready yet.'));assert.ok(!schedules.includes('No scheduled reports yet'));
 const deliveries=render([],[delivery]);assert.ok(deliveries.includes('delivery-fixture'));assert.ok(deliveries.includes('No report schedules have been created.'));
 const both=render([schedule],[delivery]);assert.equal((both.match(/<table>/g)||[]).length,2);assert.ok(both.includes('Report schedules'));assert.ok(both.includes('Generated reports'));assert.ok(!both.includes('No recorded activity'));
});
