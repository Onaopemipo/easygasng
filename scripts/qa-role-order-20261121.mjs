// Current synthetic hosted acceptance. Historical run/state/evidence are never overwritten.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {client,hash,evidenceRoot,label} from './demo-role-acceptance-20261121-client.mjs';
const phase=process.argv[2]??'preflight';
assert.ok(['preflight','before-trip','sync-trip','active-guards','role-boundaries','media-guards','reconcile','logout'].includes(phase));
const c=await client();
const note=s=>`${label}: ${s}. Synthetic QA only; no real goods, funds, travel or certification.`;
const write=(name,value)=>fs.writeFile(`${evidenceRoot}/${name}.json`,JSON.stringify(value,null,2)+'\n');
async function rejected(role,action,body,statuses){const r=await c.call(role,action,body);assert.ok(statuses.includes(r.status),`${role} ${action}: expected${statuses}, got${r.status}: ${r.data.error}`);return{role,action,status:r.status,message:r.data.error,code:r.data.code};}
async function owned(name){const ref=c.state.orders[name];assert.ok(ref);assert.ok(!c.state.baseline.orders.some(o=>o.id===ref.id));return(await c.ok('owner','orders?id='+ref.id))[0];}
if(phase==='preflight'){
 const pay=await c.ok('owner','payments/paystack/configuration');assert.equal(pay.environment,'test');
 c.state.roles??={};
 for(const role of ['owner','manager','sales','dispatcher','finance','inventory','driver','customer','commercial','technician','service_manager','safety_officer','administrator']){
  const me=(await c.ok(role,'me')).user;
  c.state.roles[role]={id:me.id,canonicalRole:me.role,branch:me.branch_id};
  if(!['customer','commercial'].includes(role))c.state.roles[role].navigation=(await c.ok(role,'navigation.access')).allowed;
 }
 const values={};
 for(const[name,role,action]of [['orders','owner','orders'],['ledger','finance','finance.ledger'],['catalogue','customer','catalogue'],['wallet','customer','wallet'],['commercialWallet','commercial','wallet'],['fleet','owner','fleet.summary'],['bulk','owner','bulk.summary'],['inventory','inventory','inventory.workspace'],['driver','driver','driver.snapshot'],['services','owner','services.manage'],['credits','finance','credits']])values[name]=await c.ok(role,action);
 if(!c.state.baseline){c.state.baseline=values;c.state.initialDriverAvailable=values.driver.profile.driver_available;await c.save();}
 else assert.deepEqual(values.orders,c.state.baseline.orders,'Preflight cannot replace the original baseline after mutations');
 const ids=new Set(Object.values(c.state.roles).map(r=>r.id));
 const summary={at:new Date().toISOString(),roles:c.state.roles,originalOrderCount:values.orders.length,baselineHashes:Object.fromEntries(Object.entries(values).map(([k,v])=>[k,hash(v)])),walletKobo:values.wallet.balanceKobo,qaActiveTrip:values.driver.trip?{id:values.driver.trip.id,vehicleId:values.driver.trip.vehicle_id}:null,driverAvailable:values.driver.profile.driver_available,vehicles:values.fleet.vehicles.map(v=>({id:v.id,label:v.label,branchId:v.branch_id,active:v.active,lpgSuitable:v.lpg_suitable,capacityGrams:v.capacity_grams})),meters:values.bulk.meters.map(m=>({id:m.id,vehicleId:m.vehicle_id,serial:m.serial,calibrationExpiresAt:m.calibration_expires_at,expired:Date.parse(m.calibration_expires_at)<=Date.now()})),qualifications:values.services.qualifications.filter(q=>ids.has(q.user_id)).map(q=>({userId:q.user_id,code:q.code,expiresAt:q.expires_at,expired:Date.parse(q.expires_at)<=Date.now(),verifiedBy:q.verified_by})),products:values.catalogue.products.map(p=>({id:p.id,name:p.name,available:p.available,priceKobo:p.price_kobo}))};
 await c.check('ROD21-PREFLIGHT','Thirteen labelled identities authenticated; actual canonical roles mapped; baseline retained privately before any new business mutation.');await write('preflight',summary);console.log(JSON.stringify(summary,null,2));
}
if(phase==='media-guards'){
 const o=await owned('product-cod');assert.equal(o.status,'delivered');const before=await c.ok('driver','delivery.photos?orderId='+o.id);assert.equal(before.photos.length,1);
 const bytes=await fs.readFile(evidenceRoot+'/product-proof.png');const rows=[];
 async function upload(role,consent,capturedAt){const form=new FormData();form.set('image',new File([bytes],'product-proof.png',{type:'image/png'}));form.set('orderId',o.id);form.set('alt',label+' synthetic product QA proof; no real goods or delivery');if(consent)form.set('photoConsent','on');form.set('capturedAt',capturedAt);const response=await fetch(c.state.origin+'/api/media',{method:'POST',headers:{origin:c.state.origin,'x-easygas-client':'native',authorization:'Bearer '+c.state.tokens[role]},body:form,signal:AbortSignal.timeout(30000)});return{status:response.status,data:await response.json()};}
 const actual=before.photos[0].captured_at;
 for(const[role,consent,at,status]of [['finance',true,actual,403],['driver',false,actual,400],['driver',true,new Date(Date.now()+120000).toISOString(),409]]){const r=await upload(role,consent,at);assert.equal(r.status,status);rows.push({role,status:r.status,message:r.data.error});}
 const replay=await upload('driver',true,actual);assert.equal(replay.status,200);assert.equal(replay.data.id,before.photos[0].id);assert.equal(replay.data.replayed,true);
 assert.deepEqual(await c.ok('driver','delivery.photos?orderId='+o.id),before);await write('proof-guards',{reference:o.reference,rejected:rows,replay:{id:replay.data.id,replayed:true},proofCountUnchanged:true});await c.check('ROD21-PROOF-GUARDS','Wrong uploader role, missing consent and future capture rejected; exact original proof replay retained one record.');
}
if(phase==='active-guards'){
 const trip=(await c.ok('driver','driver.location')).trip;assert.equal(trip.id,c.state.trip.id);const rows=[];
 rows.push(await rejected('owner','trip.end',{tripId:trip.id,endOdometer:1000,operationKey:c.key('owner.end.own-driver.trip')},[403]));
 rows.push(await rejected('driver','trip.end',{tripId:trip.id,endOdometer:999,operationKey:c.key('lower.end.odometer')},[400]));
 rows.push(await rejected('driver','trip.end',{tripId:trip.id,endOdometer:1000,operationKey:c.key('unreconciled.load.end')},[409]));
 assert.equal((await c.ok('driver','driver.location')).trip.id,trip.id);await write('active-trip-guards',{tripId:trip.id,rejected:rows,activeTripPreserved:true});await c.check('ROD21-ACTIVE-GUARDS','Owner cannot end driver trip; lower odometer and unreconciled LPG custody block end; active trip preserved.');
}
if(phase==='role-boundaries'){
 const o=await owned('product-cod'),before=hash(o),rows=[];
 for(const role of Object.keys(c.state.roles)){
  const u=(await c.ok(role,'me')).user;c.state.roles[role].branch=u.branchId??u.branch_id;
 }
 const u=(await c.ok('other_driver','me')).user;assert.equal(u.role,'driver');assert.notEqual(u.id,c.state.roles.driver.id);c.state.roles.other_driver={id:u.id,canonicalRole:u.role,branch:u.branchId??u.branch_id};await c.save();
 assert.deepEqual(await c.ok('other_driver','orders?id='+o.id),[]);
 rows.push(await rejected('other_driver','trip.start',{vehicleId:c.state.trip.vehicleId,startOdometer:1000,locationConsent:false,operationKey:c.key('other.driver.occupied.vehicle')},[409]));
 rows.push(await rejected('other_driver','delivery.pickup',{orderId:o.id,version:Number(o.tracking_version),manifest:o.manifest,reason:note('Unassigned driver must not pick up this order'),operationKey:c.key('other.driver.pickup')},[403,404,409]));
 for(const role of ['commercial','technician','other_driver'])rows.push(await rejected(role,'delivery.photos?orderId='+o.id,undefined,[403,404]));
 await c.ok('customer','delivery.photos?orderId='+o.id);
 const foreignOrder=c.state.baseline.orders.find(x=>x.customer_id!==c.state.roles.customer.id);assert.ok(foreignOrder);rows.push(await rejected('customer','delivery.photos?orderId='+foreignOrder.id,undefined,[404]));
 const owner=await c.ok('owner','finance.ledger?limit=500'),finance=await c.ok('finance','finance.ledger?limit=500');assert.equal(owner.hasMore,false);assert.equal(finance.hasMore,false);
 const foreign=owner.rows.find(r=>r.reference==='SYNTHETIC-QA-HLED-PAY-20261121');assert.ok(foreign);assert.notEqual(foreign.branch_id,c.state.roles.finance.branch);
 assert.ok(finance.rows.every(r=>r.branch_id===c.state.roles.finance.branch));assert.ok(!finance.rows.some(r=>r.id===foreign.id));
 rows.push(await rejected('finance','finance.ledger?after='+foreign.id,undefined,[400]));rows.push(await rejected('finance','finance.ledger?branchId='+foreign.branch_id,undefined,[400]));
 assert.equal(hash(await owned('product-cod')),before);await write('role-boundaries',{identities:c.state.roles,foreignBranchHidden:true,foreignCursorRejected:true,rejected:rows,productOrderUnchanged:true});await c.check('ROD21-BOUNDARIES','Alternate existing driver cannot view or pick up another assignment or reuse its active vehicle; customer/commercial/technician proof boundaries and foreign-branch finance ledger/cursor denial verified.');
}
if(phase==='before-trip'){
 const o=await owned('product-cod');assert.equal(o.status,'preparing');
 const before={order:hash(o),inventory:hash(await c.ok('inventory','inventory')),ledger:hash(await c.ok('finance','finance.ledger'))};
 const snapshot=await c.ok('driver','driver.snapshot');assert.equal(snapshot.trip,null);assert.equal(snapshot.profile.driver_available,false);
 const candidates=await c.ok('dispatcher','dispatch.candidates?orderId='+o.id);const driver=candidates.candidates.find(d=>d.id===c.state.roles.driver.id);assert.ok(driver.readiness.issues.some(i=>i.code==='DRIVER_UNAVAILABLE'));assert.ok(driver.readiness.issues.some(i=>i.code==='DRIVER_TRIP_REQUIRED'));
 const vehicle=c.state.baseline.fleet.vehicles.find(v=>v.active&&v.lpg_suitable&&v.branch_id==='lagos');assert.ok(vehicle);c.state.qaVehicleId=vehicle.id;await c.save();
 const rows=[];
 for(const role of ['owner','manager','technician','customer'])rows.push(await rejected(role,'trip.start',{vehicleId:vehicle.id,startOdometer:1000,locationConsent:false,operationKey:c.key('wrong.trip:'+role)},[403]));
 rows.push(await rejected('driver','trip.start',{vehicleId:vehicle.id,startOdometer:-1,locationConsent:false,operationKey:c.key('negative.odometer')},[400]));
 rows.push(await rejected('driver','trip.start',{vehicleId:c.key('missing.vehicle'),startOdometer:1000,locationConsent:false,operationKey:c.key('invalid.vehicle')},[409]));
 rows.push(await rejected('dispatcher','dispatch.assign',{orderId:o.id,driverId:c.state.roles.driver.id,version:Number(o.tracking_version),reason:note('Unavailable driver with no trip must not be assigned'),operationKey:c.key('before.trip.assignment')},[409]));
 const after={order:hash(await owned('product-cod')),inventory:hash(await c.ok('inventory','inventory')),ledger:hash(await c.ok('finance','finance.ledger'))};assert.deepEqual(after,before);assert.equal((await c.ok('driver','driver.snapshot')).trip,null);
 await write('before-trip',{reference:o.reference,requirements:driver.readiness.issues,rejected:rows,before,after});await c.check('ROD21-TRIP-GUARDS','No-trip and unavailable guidance verified; four wrong-role starts, negative odometer, nonexistent vehicle and assignment without prerequisites rejected without order/stock/ledger effects.');
}
if(phase==='reconcile'){
 const expected={'abandoned-card':['cancelled','unpaid'],'product-cod':['delivered','verified'],'gas-wallet':['delivered','verified'],'failed-wallet':['delivered','verified'],'wallet-cancel':['cancelled','refunded'],'commercial-unpaid':['cancelled','unpaid']};
 const orders=await c.ok('owner','orders'),ids=new Set(c.state.baseline.orders.map(o=>o.id));
 assert.deepEqual(orders.filter(o=>ids.has(o.id)),c.state.baseline.orders);assert.equal(orders.length,ids.size+6);
 for(const[name,statuses]of Object.entries(expected)){const o=await owned(name);assert.deepEqual([o.status,o.payment_status],statuses);}
 const wallet=await c.ok('customer','wallet'),credits=await c.ok('finance','credits');
 const fund=credits.find(r=>r.id===c.state.funding),refund=credits.find(r=>r.id===c.state.refundApproved);assert.equal(fund.status,'approved');assert.equal(refund.status,'approved');
 const gas=await owned('gas-wallet'),retry=await owned('failed-wallet');
 const expectedBalance=Number(c.state.baseline.wallet.balanceKobo)+Number(fund.amount_kobo)-Number(gas.total_kobo)-Number(retry.total_kobo)+Number(refund.amount_kobo);
 assert.equal(wallet.balanceKobo,expectedBalance);assert.equal(wallet.entries.reduce((n,e)=>n+Number(e.amount_kobo),0),wallet.balanceKobo);assert.equal(new Set(wallet.entries.map(e=>e.reference)).size,wallet.entries.length);
 for(const old of c.state.baseline.wallet.entries)assert.deepEqual(wallet.entries.find(e=>e.id===old.id),old);
 assert.deepEqual(await c.ok('commercial','wallet'),c.state.baseline.commercialWallet);
 const ledger=await c.ok('finance','finance.ledger?limit=500');assert.equal(ledger.hasMore,false);for(const old of c.state.baseline.ledger.rows)assert.deepEqual(ledger.rows.find(r=>r.id===old.id),old);
 const physical=(await c.ok('inventory','inventory')).find(r=>r.product_id==='cylinder-empty-6'),oldPhysical=c.state.orders['product-cod'].stockBefore.find(r=>r.product_id==='cylinder-empty-6');
 assert.equal(Number(physical.quantity),Number(oldPhysical.quantity)-3);assert.equal(Number(physical.reserved),Number(oldPhysical.reserved));
 const gasStock=(await c.ok('inventory','inventory.workspace')).gas;
 for(const old of c.state.baseline.inventory.gas){const row=gasStock.find(r=>r.branch_id===old.branch_id);assert.ok(row);assert.equal(Number(row.on_hand),Number(old.on_hand)-(old.branch_id==='lagos'?6000:0));assert.equal(Number(row.reserved),Number(old.reserved));}
 const cylinders=await c.ok('inventory','cylinders');for(const id of Object.values(c.state.serials)){const r=cylinders.find(r=>r.id===id);assert.equal(r.status,'sold');assert.equal(r.customer_id,c.state.roles.customer.id);}
 const load=(await c.ok('owner','bulk.summary')).loads.find(l=>l.id===c.state.gasLoad.id);assert.equal(load.state,'reconciled');assert.equal(Number(load.dispensed_grams),6000);
 const cash=(await c.ok('finance','cash.collections')).find(r=>r.id===c.state.cashCollection);assert.ok(cash.verified_at);assert.equal(Number(cash.amount_kobo),5700000);assert.notEqual(cash.collector_id,c.state.roles.finance.id);
 const invoices={};for(const name of ['product-cod','gas-wallet','failed-wallet','wallet-cancel']){const inv=(await c.ok('customer','invoice.order',{orderId:c.state.orders[name].id})).invoice;assert.equal(inv.status,name==='wallet-cancel'?'voided':'paid');assert.equal(inv.amountDueKobo,0);invoices[name]={number:inv.invoice_number,status:inv.status,totalKobo:inv.total_kobo,effectiveTotalKobo:inv.effectiveTotalKobo,paidKobo:inv.paidKobo,dueKobo:inv.amountDueKobo};}
 assert.equal(credits.filter(r=>r.kind==='refund'&&r.status==='approved'&&r.order_id===c.state.orders['product-cod'].id).length,1);
 const incident=(await c.ok('dispatcher','incidents')).find(i=>i.category==='delivery_failure'&&i.target===c.state.failedWalletSnapshot.attemptId);assert.ok(incident);assert.equal(retry.status,'delivered');
 if(incident.status!=='resolved')await c.ok('dispatcher','incident.update',{id:incident.id,status:'resolved',note:note('Independent full return and successful second attempt resolved this synthetic failure; original history retained')});
 assert.equal((await c.ok('dispatcher','incidents')).find(i=>i.id===incident.id).status,'resolved');
 let driver=await c.ok('driver','driver.snapshot');if(driver.trip){assert.equal(driver.trip.id,c.state.trip.id);await c.ok('driver','trip.end',{tripId:c.state.trip.id,endOdometer:1000,operationKey:c.key('final.trip.end')});}
 const restoreAvailability={available:c.state.initialDriverAvailable,operationKey:c.key('final.availability.restore')};await c.save();await c.ok('driver','driver.availability',restoreAvailability);driver=await c.ok('driver','driver.snapshot');assert.equal(driver.trip,null);assert.equal(driver.profile.driver_available,c.state.initialDriverAvailable);
 const final={status:'PASS',completedAt:new Date().toISOString(),originalOrdersPreserved:ids.size,totalOrders:orders.length,originalWalletAndLedgerRowsPreserved:true,newOrders:Object.fromEntries(Object.keys(expected).map(n=>{const o=orders.find(o=>o.id===c.state.orders[n].id);return[n,{id:o.id,reference:o.reference,status:o.status,payment:o.payment_status}]})),walletBaselineKobo:c.state.baseline.wallet.balanceKobo,syntheticFundingKobo:Number(fund.amount_kobo),gasDebitKobo:Number(gas.total_kobo),retryDebitKobo:Number(retry.total_kobo),partialRefundKobo:Number(refund.amount_kobo),walletBalanceKobo:wallet.balanceKobo,empty6kg:{before:oldPhysical.quantity,after:physical.quantity,reserved:physical.reserved,soldTestSerials:3},gas:gasStock,loadReconciled:true,cash:{collectedKobo:Number(cash.amount_kobo),verifiedAt:cash.verified_at,independent:true},invoices,incident:{id:incident.id,resolvedAfterRetry:true},qaTripEnded:true,driverAvailabilityRestored:true,qaQualificationExpiry:c.state.qaRenewal.expiresAt,productionDecision:'Existing production NO-GO, native/provider/physical/actual-import/retain-all holds unchanged',scope:'Synthetic hosted demo only; no actual goods, funds, gas, GPS, travel, certification or provider transaction'};
 await write('final-reconciliation',final);await c.check('ROD21-RECONCILE','Six new orders reconciled; sixteen original orders and original wallet/ledger rows preserved; one6kg gas debit and three sold serials; independent cash/invoice/return review; own trip closed and initial availability restored.');console.log('PASS ROD21-RECONCILE');
}
if(phase==='logout'){
 const results=[];for(const[role,token]of Object.entries(c.state.tokens)){
  const r=await fetch(c.state.origin+'/api/logout',{method:'POST',headers:{origin:c.state.origin,'content-type':'application/json','x-easygas-client':'native',authorization:'Bearer '+token},body:'{}'});assert.equal(r.status,200,role+' logout');
  const denied=await fetch(c.state.origin+'/api/me',{headers:{'x-easygas-client':'native',authorization:'Bearer '+token}});assert.equal(denied.status,401,role+' revoked token');results.push({role,logoutStatus:r.status,revokedReadStatus:denied.status});delete c.state.tokens[role];await c.save();
 }
 await write('session-cleanup',{status:'PASS',results,ownSessionsOnly:true});await c.check('ROD21-CLEANUP','All fourteen run-owned API sessions revoked; each old bearer now401; other users and browser sessions untouched.');console.log('PASS ROD21-CLEANUP');
}
if(phase==='sync-trip'){
 const profile=await c.ok('driver','driver.snapshot');const d=await c.ok('driver','driver.location');assert.ok(d.trip);assert.equal(d.trip.vehicle_id,c.state.qaVehicleId);assert.equal(d.trip.driver_id,c.state.roles.driver.id);assert.equal(Number(d.trip.start_odometer),1000);assert.equal(d.trip.location_consent,false);assert.equal(profile.profile.driver_available,true);
 c.state.trip={id:d.trip.id,vehicleId:d.trip.vehicle_id};c.state.driverWasAvailable=c.state.initialDriverAvailable;await c.save();
 const input={vehicleId:d.trip.vehicle_id,startOdometer:1000,locationConsent:false,operationKey:c.key('duplicate.trip.start')};
 const response=await c.call('driver','trip.start',input);await write('trip-start',{tripId:d.trip.id,vehicleId:d.trip.vehicle_id,locationConsent:false,available:true,duplicateAttempt:{status:response.status,error:response.data.error,code:response.data.code},uiStarted:true});
 assert.equal(response.status,409,'Duplicate active trip needs a user-facing conflict, not a server error');
 assert.equal((await c.ok('driver','driver.snapshot')).trip.id,d.trip.id);await c.check('ROD21-TRIP','Actual driver UI started own sandbox trip with consent off and availability on; duplicate trip rejected409 with original trip retained.');
}
