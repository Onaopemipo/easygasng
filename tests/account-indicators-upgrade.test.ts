import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { hashPassword, issueSession } from "../apps/web/lib/auth";
import { readFile } from "node:fs/promises";

test("ACI-01: older recorded migrations repair missing default-address field without losing addresses or inferring a default", async () => {
  const db = await createDatabase("memory://");
  try {
    await migrate(db);
    for (const uid of ["upgrade-a", "upgrade-b"])
      await db.query(
        "INSERT INTO users(id,name,email,password_hash,role) VALUES($1,$1,$2,$3,'customer')",
        [uid, uid + "@example.test", hashPassword("Upgrade-fixture-only-123!")],
      );
    const token = await issueSession(db, "upgrade-a");
    const otherToken = await issueSession(db, "upgrade-b");
    await db.query(
      "INSERT INTO account_addresses(id,customer_id,label,street,zone,phone,location_id) VALUES('89ce7f56-e85e-4b13-8ec8-99cc69d452e3','upgrade-a','Home','Synthetic road','Lekki','08012345678','lekki')",
    );
    await db.exec("ALTER TABLE account_addresses DROP COLUMN is_default");
    await db.query(
      "DELETE FROM schema_migrations WHERE version IN ('038','039')",
    );
    await assert.rejects(
      dispatch("customer.dashboard", token, { widget: "navigation" }, db),
      (e: any) => e.code === "42703",
    );
    await migrate(db);
    assert.equal(
      (
        await one(
          db,
          "SELECT count(*)::int AS n FROM schema_migrations WHERE version='038'",
        )
      )?.n,
      1,
    );
    const saved = await one(
      db,
      "SELECT * FROM account_addresses WHERE id='89ce7f56-e85e-4b13-8ec8-99cc69d452e3'",
    );
    assert.equal(saved?.street, "Synthetic road");
    assert.equal(saved?.is_default, false);
    const result = await dispatch(
      "customer.dashboard",
      token,
      { widget: "navigation" },
      db,
    );
    assert.deepEqual(result.counts, {
      notifications: 0,
      orders: 0,
      bookings: 0,
      support: 0,
    });
    assert.equal(result.address, null);
    await dispatch(
      "address.default",
      token,
      { id: "89ce7f56-e85e-4b13-8ec8-99cc69d452e3" },
      db,
    );
    const sql = await readFile(
      "database/migrations/038_address_default_compatibility.sql",
      "utf8",
    );
    await db.exec(sql);
    await migrate(db);
    assert.equal(
      (
        await dispatch(
          "customer.dashboard",
          token,
          { widget: "navigation" },
          db,
        )
      ).address.id,
      "89ce7f56-e85e-4b13-8ec8-99cc69d452e3",
    );
    assert.equal(
      (
        await dispatch(
          "customer.dashboard",
          otherToken,
          { widget: "navigation" },
          db,
        )
      ).address,
      null,
    );
    await assert.rejects(
      dispatch(
        "address.default",
        otherToken,
        { id: "89ce7f56-e85e-4b13-8ec8-99cc69d452e3" },
        db,
      ),
      /not found/i,
    );
    await assert.rejects(
      dispatch(
        "customer.dashboard",
        token,
        { widget: "navigation", customerId: "upgrade-b" },
        db,
      ),
    );
    await assert.rejects(
      db.query(
        "INSERT INTO account_addresses(id,customer_id,label,street,zone,phone,is_default) VALUES('duplicate-default','upgrade-a','Other','Synthetic road','Lekki','08012345678',true)",
      ),
      (e: any) => e.code === "23505",
    );
  } finally {
    await db.close();
  }
});
