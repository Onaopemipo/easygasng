import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeContracts,nativeRequest,nativeWorkspaces,workspaceActions,visibleWorkspaces,nativeInternalDestination,nativeRows} from '../packages/business-rules/src/native-workspaces';
import {NativeWorkspaceSession} from '../packages/business-rules/src/native-workspace-session';

test('NATIVE-CONTRACTS: every native business action has an authoritative contract, and all six roles have deliberate visibility',()=>{
 for(const[key,w]of Object.entries(nativeWorkspaces))for(const action of [...w.actions,...w.recordActions||[]]){assert.ok(nativeContracts[action],key+': '+action);assert.match(nativeContracts[action].source,/^apps\/web\/lib\//);const walk=(fields:any[])=>{for(const f of fields){if(f.type==='select')assert.ok(f.options?.length,action+': '+f.name+' enum choices');if(f.fields)walk(f.fields);if(f.item)walk([f.item]);}};walk(nativeContracts[action].fields);}
 const allowed=Object.values(nativeWorkspaces).map(w=>w.access);
 for(const role of ['owner','manager','finance'])assert.ok(visibleWorkspaces(role,allowed).length>5);
 for(const role of ['customer','driver'])assert.equal(visibleWorkspaces(role,allowed).length,0);
 assert.deepEqual(visibleWorkspaces('technician',allowed).map(([k])=>k),['quotations']);
 assert.ok(workspaceActions('campaigns','manager').includes('campaign.decide'));
 assert.ok(!workspaceActions('equipment','finance').includes('bulk.meter.recalibrate'));
 assert.ok(!workspaceActions('credits','manager').includes('credit.decide'));
 assert.equal(nativeRows({documents:[{id:'one'}]}).length,1);
});
test('NATIVE-MONEY: UI naira converts once to exact kobo; invalid, fractional, unsafe and out-of-range amounts fail before a request',()=>{
 const base={customerId:'customer',amountKobo:'1250.25',receiptReference:'Native bounded test',reason:'Isolated native credit review'};
 assert.equal(nativeRequest('credit.request',base).amountKobo,125025);
 for(const amountKobo of ['NaN','Infinity','12.345','900719925474099','-12'])assert.throws(()=>nativeRequest('credit.request',{...base,amountKobo}));
 assert.throws(()=>nativeRequest('credit.request',{...base,reason:' '}));
 assert.throws(()=>nativeRequest('credit.decide',{id:'request',decision:'bypass',reason:'Isolated review attempt'}));
 assert.throws(()=>nativeRequest('unknown.operation',{}));
});
test('NATIVE-NESTED: line editors produce the actual API arrays/objects without stale removed fields or prototype state',()=>{
 const body=nativeRequest('bundle.propose',{id:'bundle',version:'2','config.active':false,'config.products.0.productId':'hose','config.products.0.quantity':'2','config.serviceId':'cooker-servicing','config.serviceDiscountPercent':'10','config.description':'A bounded native test bundle',reason:'Native array editor test'});
 assert.equal(body.version,2);assert.equal(body.config.products[0].quantity,2);
 assert.equal(body.config.active,false);
 const quote=nativeRequest('booking.quote',{bookingId:'booking',labourKobo:'300.50',lines:[],notes:'No extra materials required',operationKey:'stable-operation'});
 assert.deepEqual(quote.lines,[]);assert.equal(quote.labourKobo,30050);assert.equal(quote.operationKey,'stable-operation');
 const load=nativeRequest('bulk.load.issue',{tripId:'trip',meterId:'meter',grams:1000,meterReadingGrams:500,orderIds:[],reason:'Isolated load issue evidence'});
 assert.ok(!('recovery' in load));
});
test('NATIVE-HANDOFFS: internal business links stay native with bounded scope; unsafe/external links never enter the native router',()=>{
 assert.deepEqual(nativeInternalDestination('/admin/inventory?branchId=lagos&from=2026-11-01&token=secret'),{screen:'workspace:inventory',scope:{branchId:'lagos',from:'2026-11-01'}});
 for(const p of ['/admin/orders?id=abc','/admin/orders/abc','/admin/orders?orderId=abc','/orders/abc'])assert.equal(nativeInternalDestination(p)?.orderId,'abc');
 for(const p of ['https://evil.test/admin/settings','//evil.test/admin/orders','/\\evil.test','/admin\n/settings','javascript:alert(1)','/unknown'])assert.equal(nativeInternalDestination(p),null);
 assert.equal(nativeInternalDestination('/admin/reports')?.screen,'workspace:reports');
});
test('NATIVE-AUTHORITY: fresh identity and privileges checked before mutation, role revocation/identity change/disposal cannot submit',async()=>{
 for(const nav of [{user:{id:'other',role:'owner'},allowed:['inventory']},{user:{id:'one',role:'finance'},allowed:['inventory']},{user:{id:'one',role:'owner'},allowed:[]}]){
  const calls:string[]=[];const s=new NativeWorkspaceSession(async(a)=>{calls.push(a);return nav},'one','owner');
  await assert.rejects(()=>s.submit('inventory','inventory.receipt',{}),/no longer/);assert.deepEqual(calls,['navigation']);
 }
 let finish!:(x:any)=>void;const calls:string[]=[];const s=new NativeWorkspaceSession(async(a)=>{calls.push(a);return new Promise(resolve=>finish=resolve)},'one','owner');
 const pending=s.submit('inventory','inventory.receipt',{});s.dispose();finish({user:{id:'one',role:'owner'},allowed:['inventory']});await assert.rejects(pending,/changed/);assert.deepEqual(calls,['navigation']);
});
test('NATIVE-REPLAY: double taps are blocked while confirmation is pending, network failures remain failures, uncertain committed outcomes require readback',async()=>{
 let finish!:(x:any)=>void,calls=0;const api=async(a:string)=>a==='navigation'?{user:{id:'one',role:'owner'},allowed:['inventory']}:new Promise(resolve=>{calls++;finish=resolve});
 const s=new NativeWorkspaceSession(api,'one','owner'),pending=s.submit('inventory','inventory.receipt',{reference:'same'});
 await new Promise(r=>setImmediate(r));await assert.rejects(()=>s.submit('inventory','inventory.receipt',{}),/awaiting/);assert.equal(calls,1);finish({id:'receipt'});assert.equal((await pending).id,'receipt');
 s.setApi(async(a)=>{if(a==='navigation')return{user:{id:'one',role:'owner'},allowed:['inventory']};throw Error('Connection lost; outcome unknown')});
 await assert.rejects(()=>s.submit('inventory','inventory.receipt',{}),/Connection lost/);
 await assert.rejects(()=>s.submit('inventory','inventory.receipt',{}),/unknown outcome/);
 s.confirmReadback();s.setApi(api);const uncertain=s.submit('inventory','inventory.receipt',{});await new Promise(r=>setImmediate(r));s.dispose();finish({id:'committed'});await assert.rejects(uncertain,/establish its outcome/);
});

test('NATIVE-IMPORT-PREVIEW: quoted rows, duplicate IDs, invalid quantities and restricted columns never import stock or customer data',async()=>{
 const{nativeCataloguePreview}=await import('../packages/business-rules/src/native-catalogue-preview');
 const csv='id,name,description,category,sizeKg,asset,safety\r\nhose,"Gas, hose",Synthetic long product description,Accessories,,hose,Read the approved safety evidence\r\n';
 const result=nativeCataloguePreview(csv,[{id:'hose'}]);assert.equal(result.length,1);assert.equal(result[0].name,'Gas, hose');assert.equal(result[0].existing,true);assert.deepEqual(result[0].errors,[]);
 assert.ok(nativeCataloguePreview(csv+csv.split('\r\n')[1],[{id:'hose'}])[1].errors.some(e=>e.includes('twice')));
 assert.throws(()=>nativeCataloguePreview('id,name,quantity\na,Unsafe,10',[]),/headers/);assert.throws(()=>nativeCataloguePreview(csv.replace('sizeKg,asset','stock,asset'),[]),/headers/);assert.throws(()=>nativeCataloguePreview(csv+'"unclosed',[]),/quoted/);
 assert.ok(nativeCataloguePreview(csv.replace(',,hose',',not-a-number,hose'),[])[0].errors.length);
});


test('NATIVE-REPORT-FILTERS: hidden filters cannot leak between reports and point-in-time views omit date constraints',async()=>{
 const{nativeReportRequest,nativeReportsForRole}=await import('../packages/business-rules/src/native-report-scope');
 assert.deepEqual(nativeReportRequest({report:'wallet',from:'2026-11-01',to:'2026-11-20',category:'Gas',orderStatus:'cancelled'},{branchId:'lagos'}),{report:'wallet',branchId:'lagos'});
 assert.deepEqual(nativeReportRequest({report:'deliveries',category:'Gas',orderStatus:'assigned',locationId:'lekki'}),{report:'deliveries',orderStatus:'assigned',locationId:'lekki'});
 assert.ok(!nativeReportsForRole('manager').includes('audit'));assert.ok(!nativeReportsForRole('finance').includes('refills'));
});
