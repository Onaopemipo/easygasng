import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate } from "../apps/web/lib/db";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";

test("ROLEACC-CATALOGUE: advertised empty-cylinder availability uses eligible serials and canonical stock, excluding reservations and unsafe custody", async () => {
  const db = await createDatabase("memory://");
  try {
    await migrate(db);
    const owner = id(),
      customer = id();
    for (const [uid, role] of [
      [owner, "owner"],
      [customer, "customer"],
    ])
      await db.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$2,'lagos')",
        [
          uid,
          role,
          uid + "@catalogue.example.test",
          hashPassword("Catalogue-fixture-only-123!"),
        ],
      );
    const token = await issueSession(db, customer);
    await db.exec(
      "UPDATE inventory SET quantity=5,reserved=0,price_kobo=2600000,published=true WHERE product_id='cylinder-empty-6'; UPDATE settings SET value='true' WHERE key IN ('delivery.enabled','payment.cod') AND scope='lagos'; UPDATE delivery_locations SET coverage='Synthetic fixture coverage';",
    );
    const available = async (view?: string) => {
      const data = await dispatch("catalogue", token, view ? { view } : {}, db);
      return data.products.find((p: any) => p.id === "cylinder-empty-6")
        ?.available;
    };
    assert.equal(
      await available(),
      0,
      "aggregate quantity does not invent eligible serials",
    );
    assert.equal(await available("homepage"), 0);
    const future = new Date(Date.now() + 90 * 86400000)
      .toISOString()
      .slice(0, 10);
    const serials: string[] = [];
    for (const [ownership, status, due, customerId] of [
      ["company", "empty", future, null],
      ["company", "empty", future, null],
      ["company", "empty", "2000-01-01", null],
      ["company", "quarantined", future, null],
      ["customer", "empty", future, customer],
      ["supplier", "empty", future, null],
    ]) {
      const cid = id();
      serials.push(cid);
      await db.query(
        "INSERT INTO cylinders(id,branch_id,serial,size_kg,ownership,status,test_due,customer_id) VALUES($1,'lagos',$1,6,$2,$3,$4,$5)",
        [cid, ownership, status, due, customerId],
      );
    }
    assert.equal(await available(), 2);
    await db.query(
      "UPDATE inventory SET quantity=1 WHERE product_id='cylinder-empty-6'",
    );
    assert.equal(
      await available(),
      1,
      "do not exceed aggregate unreserved stock",
    );
    const order: any = await dispatch(
      "checkout",
      token,
      {
        items: [{ productId: "cylinder-empty-6", quantity: 1 }],
        address: {
          name: "Synthetic customer",
          phone: "08012345678",
          street: "12 Synthetic Street",
          zone: "Lekki",
        },
        date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        window: "14:00–18:00",
        paymentMethod: "cash_on_delivery",
        idempotencyKey: id(),
      },
      db,
    );
    assert.equal(await available(), 0);
    await db.query(
      "UPDATE inventory SET quantity=5 WHERE product_id='cylinder-empty-6'",
    );
    assert.equal(
      await available(),
      1,
      "serial reservation caps larger aggregate stock",
    );
    const allocated = (
      await db.query(
        "SELECT cylinder_id FROM cylinder_allocations WHERE order_id=$1",
        [order.id],
      )
    ).rows[0].cylinder_id;
    const remaining = serials.slice(0, 2).find((cid) => cid !== allocated)!;
    await db.query(
      "INSERT INTO cylinder_allocations(id,cylinder_id,order_id,state) VALUES($1,$2,$3,'issued')",
      [id(), remaining, order.id],
    );
    assert.equal(
      await available(),
      0,
      "issued serials stay unavailable even if aggregate quantity is stale",
    );
    await db.query(
      "UPDATE cylinder_allocations SET state='released' WHERE cylinder_id=$1",
      [remaining],
    );
    assert.equal(await available(), 1);
    const vehicle = id(),
      trip = id(),
      load = id();
    await db.query(
      "INSERT INTO driver_vehicles(id,branch_id,label,capacity_grams,lpg_suitable) VALUES($1,'lagos','Synthetic catalogue fixture',30000,true)",
      [vehicle],
    );
    await db.query(
      "INSERT INTO driver_trips(id,driver_id,vehicle_id,branch_id,start_odometer,location_consent) VALUES($1,$2,$3,'lagos',0,false)",
      [trip, owner, vehicle],
    );
    await db.query(
      "INSERT INTO vehicle_product_loads(id,trip_id,branch_id,product_id,quantity,unit_weight_grams,available,issued_by,evidence) VALUES($1,$2,'lagos','cylinder-empty-6',1,5000,1,$3,'Synthetic held stock fixture')",
      [load, trip, owner],
    );
    await db.query(
      "INSERT INTO vehicle_product_serials(id,load_id,cylinder_id) VALUES($1,$2,$3)",
      [id(), load, remaining],
    );
    assert.equal(
      await available(),
      0,
      "vehicle-held serials cannot be advertised for another checkout",
    );
  } finally {
    await db.close?.();
  }
});
