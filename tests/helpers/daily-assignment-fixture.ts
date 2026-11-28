import { setup } from "./daily-delivery-fixture";
import { id, hashPassword, issueSession } from "../../apps/web/lib/auth";
export async function mismatched(database?: import("../../apps/web/lib/db").DB) {
 const f=await setup(database);
 await f.run('owner','dispatch.vehicle.assign',{driverId:f.actors.driver.id,vehicleId:f.v.id,startOdometer:10,makeAvailable:true});
 const o=await f.make(12.5);await f.assign(o);
 const next=id();await f.db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id,driver_available) VALUES($1,'Today driver',$2,$3,'driver','lagos',true)",[next,next+'@synthetic.test',hashPassword('Tracking-fixture-only-123!')]);
 f.actors.today={id:next,token:await issueSession(f.db,next)};
 const v=await f.run('owner','fleet.vehicle.create',{branchId:'lagos',label:'Synthetic today vehicle',capacityGrams:100000,lpgSuitable:true});
 await f.run('owner','daily.start',{driverId:next,vehicleId:v.id,openingKg:25,startOdometer:10});
 return {...f,o};
}
