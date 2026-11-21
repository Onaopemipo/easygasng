// Current synthetic hosted acceptance. Historical run/state/evidence are never overwritten.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {client,hash,evidenceRoot,label} from './demo-role-acceptance-20261121-client.mjs';
const phase=process.argv[2]??'preflight';
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
if(phase==='sync-trip'){
 const profile=await c.ok('driver','driver.snapshot');const d=await c.ok('driver','driver.location');assert.ok(d.trip);assert.equal(d.trip.vehicle_id,c.state.qaVehicleId);assert.equal(d.trip.driver_id,c.state.roles.driver.id);assert.equal(Number(d.trip.start_odometer),1000);assert.equal(d.trip.location_consent,false);assert.equal(profile.profile.driver_available,true);
 c.state.trip={id:d.trip.id,vehicleId:d.trip.vehicle_id};c.state.driverWasAvailable=c.state.initialDriverAvailable;await c.save();
 const input={vehicleId:d.trip.vehicle_id,startOdometer:1000,locationConsent:false,operationKey:c.key('duplicate.trip.start')};
 const response=await c.call('driver','trip.start',input);await write('trip-start',{tripId:d.trip.id,vehicleId:d.trip.vehicle_id,locationConsent:false,available:true,duplicateAttempt:{status:response.status,error:response.data.error,code:response.data.code},uiStarted:true});
 assert.equal(response.status,409,'Duplicate active trip needs a user-facing conflict, not a server error');
 assert.equal((await c.ok('driver','driver.snapshot')).trip.id,d.trip.id);await c.check('ROD21-TRIP','Actual driver UI started own sandbox trip with consent off and availability on; duplicate trip rejected409 with original trip retained.');
}
