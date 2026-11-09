import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { id } from "../apps/web/lib/auth";
test("LOCAL-01: early recorded rewards revision upgrades without losing customer, points or legacy redemption history", async () => {
  const db = await createDatabase("memory://");
  try {
    await db.exec(
      "CREATE TABLE schema_migrations(version text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now());INSERT INTO schema_migrations(version) VALUES('043'),('043c'),('044'),('045'),('046')",
    );
    await migrate(db);
    await db.exec(
      (await readFile("database/migrations/043_easyrewards.sql", "utf8")).split(
        "-- Discounts extend",
      )[0],
    );
    const uid = id(),
      entry = id(),
      redemption = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Upgrade fixture',$2,'invalid-non-login-fixture','customer','lagos')",
      [uid, uid + "@fixture.example.test"],
    );
    await db.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,73,$1)",
      [entry, uid],
    );
    await db.query(
      "INSERT INTO reward_redemptions(id,customer_id,points,credit_kobo,idempotency_key) VALUES($1,$2,10,1000,$1)",
      [redemption, uid],
    );
    await db.exec(
      "DELETE FROM schema_migrations WHERE version IN ('043c','044','045','046')",
    );
    await migrate(db);
    await migrate(db);
    assert.equal(
      (await one(db, "SELECT points FROM reward_entries WHERE id=$1", [entry]))!
        .points,
      73,
    );
    assert.equal(
      (await one(db, "SELECT customer_id FROM reward_redemptions WHERE id=$1", [
        redemption,
      ]))!.customer_id,
      uid,
    );
    assert.equal(
      (await one(db, "SELECT id FROM users WHERE id=$1", [uid]))!.id,
      uid,
    );
    assert.ok(
      await one(
        db,
        "SELECT version FROM schema_migrations WHERE version='046'",
      ),
    );
    assert.ok(
      await one(db, "SELECT to_regclass('reward_referrals') AS table_name"),
    );
    await assert.rejects(
      () =>
        db.query("UPDATE reward_entries SET points=999 WHERE id=$1", [entry]),
      /immutable|append-only/i,
    );
  } finally {
    await db.close?.();
  }
});
