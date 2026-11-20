import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDatabase } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";

test("MORD-API: real dispatcher preserves customer ownership and staff review while denying foreign refund reads/writes", async () => {
  const db = await createDatabase("memory://");
  try {
    await db.exec(await readFile("database/bootstrap.sql", "utf8"));
    await db.exec("SET search_path TO easygas_private,pg_catalog");
    const ids: Record<string, string> = {},
      tokens: Record<string, string> = {};
    for (const role of [
      "owner",
      "manager",
      "finance",
      "driver",
      "technician",
      "customer",
      "commercial",
    ]) {
      ids[role] = id();
      await db.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$2,'lagos')",
        [
          ids[role],
          role,
          ids[role] + "@native-refund.example.test",
          hashPassword("Synthetic-local-refund-123!"),
        ],
      );
      tokens[role] = await issueSession(db, ids[role]);
    }
    await db.exec(
      "UPDATE inventory SET quantity=10,price_kobo=10000,published=true WHERE product_id='hose'; UPDATE settings SET value='true' WHERE key IN ('delivery.enabled','wallet.enabled'); UPDATE delivery_locations SET coverage='Synthetic refund authority fixture';",
    );
    const call = (role: string, action: string, input?: any) =>
      dispatch(action, tokens[role], input ?? {}, db);
    const orders: any[] = [];
    for (const role of ["customer", "commercial"]) {
      await db.query(
        "INSERT INTO wallet_entries(id,customer_id,amount_kobo,kind,reference) VALUES($1,$2,5000000,'cash_funding',$1)",
        [id(), ids[role]],
      );
      const order: any = await call(role, "checkout", {
        items: [{ productId: "hose", quantity: 2 }],
        address: {
          name: "Synthetic customer",
          phone: "08012345678",
          street: "12 Synthetic Street",
          zone: "Lekki",
        },
        date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
        window: "14:00–18:00",
        paymentMethod: "wallet",
        idempotencyKey: id(),
      });
      await db.query("UPDATE orders SET status='delivered' WHERE id=$1", [
        order.id,
      ]);
      orders.push({ ...order, role });
    }
    await db.exec(
      "SET search_path TO easygas_private,pg_catalog; SET ROLE easygas_server",
    );
    for (const order of orders) {
      const available: any = await call(order.role, "refund.lines", {
        orderId: order.id,
      });
      assert.equal(available[0].source, "product:hose");
      assert.equal(available[0].remaining, 2);
      for (const role of Object.keys(tokens).filter((r) => r !== order.role)) {
        await assert.rejects(
          () => call(role, "refund.lines", { orderId: order.id }),
          /Order not found|not permitted|not authorised|permission|access/i,
        );
        await assert.rejects(
          () =>
            call(role, "refund.request", {
              orderId: order.id,
              reason: "Synthetic unauthorized request",
              acceptWalletCredit: true,
              lines: [{ source: "product:hose", quantity: 1 }],
              idempotencyKey: id(),
            }),
          /Order not found|not permitted|not authorised|permission|access/i,
        );
      }
      for (const quantity of [0, -1, 0.5, 3])
        await assert.rejects(() =>
          call(order.role, "refund.request", {
            orderId: order.id,
            reason: "Synthetic invalid quantity request",
            acceptWalletCredit: true,
            lines: [{ source: "product:hose", quantity }],
            idempotencyKey: id(),
          }),
        );
      const before: any = await call(order.role, "wallet");
      const payload = {
        orderId: order.id,
        reason: "Synthetic pending native refund",
        acceptWalletCredit: true,
        lines: [{ source: "product:hose", quantity: 1 }],
        idempotencyKey: id(),
      };
      const result: any = await call(order.role, "refund.request", payload);
      assert.equal(
        (await call(order.role, "refund.request", payload)).id,
        result.id,
      );
      assert.equal(
        (await call(order.role, "wallet")).balanceKobo,
        before.balanceKobo,
      );
      for (const reviewer of ["owner", "finance"]) {
        const rows: any = await call(reviewer, "credits");
        const row = rows.find((r: any) => r.id === result.id);
        assert.equal(row.status, "pending");
        assert.equal(row.customer_id, ids[order.role]);
      }
    }
  } finally {
    await db.close?.();
  }
});
