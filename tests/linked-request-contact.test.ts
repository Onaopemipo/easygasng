import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bookingPhone, bookingPhoneMessage } from "../packages/business-rules/src/booking-contact";
import { bookingInput } from "../apps/web/lib/professional-services";

test("LINK-CONTACT01: server normalizes equivalent Nigerian formats and rejects invalid or foreign contacts with actionable text", () => {
 const base:any={serviceId:"service",serviceVersion:1,slotId:crypto.randomUUID(),address:{street:"12 Example Street",zone:"Lekki",phone:"08012345678"},equipment:{brand:"",type:"Cooker",burners:2,newEquipment:false,supplyPresent:true,concerns:"Install cooker"},notes:"",idempotencyKey:crypto.randomUUID()};
 for(const phone of ["08012345678","+2348012345678"]){assert.equal(bookingPhone(phone),phone);assert.equal(bookingInput.parse({...base,address:{...base.address,phone}}).address.phone,phone);}
 for(const phone of ["0801 234 5678","+234 (801) 234-5678","2348012345678"]){assert.equal(bookingInput.parse({...base,address:{...base.address,phone}}).address.phone,"+2348012345678");}
 for(const phone of ["","1234","+447123456789","080123456789","0801abc5678"]){const r=bookingInput.safeParse({...base,address:{...base.address,phone}});assert.equal(r.success,false);if(!r.success) assert.ok(r.error.issues.some(i=>i.message===bookingPhoneMessage));}
});
test("LINK-CONTACT02: saved linked appointments expose correction and validate before API submission",async()=>{
 const source=await readFile("apps/web/components/combined-checkout.tsx","utf8");
 assert.match(source,/Contact mobile number for/);assert.match(source,/sessionStorage.setItem\(storage, JSON.stringify\(next\)\)/);
 assert.ok(source.indexOf("const validatedAppointments")<source.indexOf('api("checkout.mixed"'));
 assert.match(source,/appointments: validatedAppointments/);
 const form=await readFile("apps/web/components/professional-services.tsx","utf8");
 assert.ok(form.indexOf("if (!phone) throw new Error(bookingPhoneMessage)")<form.indexOf('storage = "easygas.serviceDrafts."'));
});
