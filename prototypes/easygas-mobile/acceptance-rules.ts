/** Review-only business checks. Authoritative production rules remain in the real app/API. */
export const failure=(message:string,status=409)=>({error:message,__status:status});
export function checkoutCalculation(data:any,baseline:any){
 const config=baseline.customer['gas.catalogue']?.data||baseline.owner['gas.catalogue'].data;
 if(data.rewardPoints||data.rewardOfferId)throw Error('Reward discounts are disabled in this prototype snapshot.');for(const k of ['priceVersion','feeVersion','policyVersion'])if(data.pricing?.[k]!==undefined&&Number(data.pricing[k])!==Number(config[k]))throw Error('The quote has changed. Review the current version before confirming.');
 const gas=data.gasLines||[],items=data.items||[];if(!gas.length&&!items.length)throw Error('Add gas or an available product before checkout.');
 const lines=gas.map((l:any)=>{const kg=Number(l.kg),capacity=Number(l.capacityKg);if(!Number.isFinite(kg)||kg<config.policy.minimumKg||kg>config.policy.maximumKg||!config.policy.capacitiesKg.includes(capacity)||kg>capacity||Math.abs(kg*2-Math.round(kg*2))>0.00001)throw Error('Enter a valid gas quantity within the selected cylinder capacity.');return{kg,capacityKg:capacity,subtotalKobo:Math.round(kg*config.priceKobo)};});
 const catalogue=baseline.customer.catalogue?.data?.products||baseline.owner.catalogue.data.products;
 const products=items.map((i:any)=>{const product=catalogue.find((p:any)=>p.id===i.productId),quantity=Number(i.quantity);if(!product||!product.published||product.archived||!Number.isSafeInteger(quantity)||quantity<=0||quantity>Number(product.available))throw Error('Choose an available product and valid quantity.');return{product_id:product.id,productId:product.id,name:product.name,quantity,unit_price_kobo:Number(product.price_kobo),subtotal_kobo:Number(product.price_kobo)*quantity};});
 for(const product of products){const aggregate=products.filter((i:any)=>i.product_id===product.product_id).reduce((n:number,i:any)=>n+i.quantity,0);const available=Number(catalogue.find((p:any)=>p.id===product.product_id).available);if(aggregate>available)throw Error('Combined quantity exceeds product availability.');}
 const address=data.address||{},location=config.locations.find((l:any)=>l.id===address.locationId||l.name===address.zone);if(!location||!location.active||!String(address.street||'').trim())throw Error('Select an active delivery area and enter the house address.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(data.date||'')||!data.window)throw Error('Choose a delivery date and window.');
 if(!['wallet','cash_on_delivery','card'].includes(data.paymentMethod))throw Error('Choose an available payment method.');
 const subtotal=lines.reduce((n:number,l:any)=>n+l.subtotalKobo,0)+products.reduce((n:number,i:any)=>n+i.subtotal_kobo,0),delivery=Number(config.deliveryKobo),total=subtotal+delivery;
 if(data.pricing?.totalKobo!==undefined&&Number(data.pricing.totalKobo)!==total)throw Error('The quote has changed. Review the current total before confirming.');
 return{lines,items:products,subtotal,delivery,total,address:{...address,zone:location.name,locationId:location.id}};
}
export function transitionFailure(order:any,status:string,role:string,actorId:string){
 if(!order)return failure('Prototype order not found.',404);
 if(role==='driver'&&order.driver_id!==actorId)return failure('This order is not assigned to this driver.',403);
 if(role==='driver'&&!['out_for_delivery','delivered','delivery_failed'].includes(status))return failure('This driver action belongs to Operations.',403);
 const next:any={placed:['accepted','cancelled'],accepted:['preparing','cancelled'],preparing:['assigned','cancelled'],assigned:['out_for_delivery','delivery_failed'],out_for_delivery:['out_for_delivery','delivered','delivery_failed'],delivery_failed:['assigned','cancelled']};
 if(!next[order.status]?.includes(status))return failure('This order stage is no longer valid. Refresh and review the current status.');
 if(status==='accepted'&&order.payment_method==='card'&&order.payment_status!=='verified')return failure('Card payment is unverified. Resolve payment before acceptance.');return null;
}
export function dateRangeFailure(from:any,to:any){if((from&&!/^\d{4}-\d{2}-\d{2}$/.test(from))||(to&&!/^\d{4}-\d{2}-\d{2}$/.test(to))||(from&&to&&from>to))return failure('Choose a valid date range with From on or before To.');return null;}
export function inRange(value:any,from:any,to:any){const day=String(value||'').slice(0,10);return(!from||day>=from)&&(!to||day<=to);}
