import test from 'node:test';import assert from 'node:assert/strict';
import {driverOrderLabel,driverNextAction,driverAcceptedAssignmentNotice} from '../packages/business-rules/src/driver-presentation';
import {driverLoadScope} from '../packages/business-rules/src/driver-load-readiness';
test('DIO-LABELS daily acceptance progresses from office waiting to ready without pickup wording; actual legacy pickup remains intact',()=>{
 const o={id:'O',status:'assigned',attempt:{state:'assigned'},gas_lines:[{grams:6000}],tracking_version:4,legacy_lpg:false};
 assert.equal(driverOrderLabel(o,'acknowledged'),'Waiting for office');assert.equal(driverNextAction(o,'acknowledged'),'Review daily allocation');
 const ready={...o,daily_run:{run_id:'R',state:'active',allocation_state:'allocated',grams:6000,supplied_grams:0}};
 assert.equal(driverOrderLabel(ready,'acknowledged'),'Ready to start');assert.equal(driverNextAction(ready,'acknowledged'),'Start delivery');assert.match(driverAcceptedAssignmentNotice(ready),/Tap Start delivery/);assert.doesNotMatch(driverAcceptedAssignmentNotice(ready),/pickup|load|meter|office reserves/);
 assert.notEqual(driverLoadScope(o,'T'),driverLoadScope(ready,'T'));assert.equal(o.tracking_version,ready.tracking_version);
 assert.equal(driverOrderLabel({...o,legacy_lpg:true},'acknowledged'),'Awaiting pickup');assert.match(driverAcceptedAssignmentNotice({...o,legacy_lpg:true}),/pickup/);
 assert.equal(driverOrderLabel({...ready,status:'out_for_delivery',attempt:{state:'arrived'}},'acknowledged'),'At destination');
});
