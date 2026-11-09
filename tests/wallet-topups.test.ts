import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";

test("WALLET-BANK: pending transfer, scoped independent approval, rejection and exactly-once ledger", async () => {
  const db = await createDatabase("memory://");
  await migrate(db);
  const password = "Wallet-only-test123!",
    tokens: Record<string, string> = {},
    ids: Record<string, string> = {};
  const old = process.env.EASYGAS_WALLET_BANK_ACCOUNTS;
  process.env.EASYGAS_WALLET_BANK_ACCOUNTS = JSON.stringify({
    lagos: {
      bankName: "Synthetic test bank",
      accountName: "Synthetic EasyGas",
      accountNumber: "0000000000",
    },
  });
  try {
    for (const role of [
      "owner",
      "finance",
      "customer",
      "commercial",
      "driver",
    ]) {
      ids[role] = id();
      await db.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$2,'lagos')",
        [ids[role], role, role + "@wallet.test", hashPassword(password)],
      );
      tokens[role] = await issueSession(db, ids[role]);
    }
    const call = (role: string, action: string, d: any = {}) =>
      dispatch(action, tokens[role], d, db);
    await db.query(
      "UPDATE settings SET value='true' WHERE key='wallet.enabled' AND scope='lagos'",
    );
    await call("owner", "reauth", { password });
    await call("finance", "reauth", { password });
    const input = {
      amountKobo: 100000,
      receiptReference: "Test-Transfer-0001",
      senderName: "Synthetic customer",
      transferDate: new Date().toISOString().slice(0, 10),
    };
    const r = await call("customer", "wallet.transfer.request", input);
    assert.equal(r.status, "pending");
    assert.equal((await call("customer", "wallet")).balanceKobo, 0);
    assert.equal(
      (await call("customer", "wallet.transfer.request", input)).id,
      r.id,
    );
    await assert.rejects(
      () => call("commercial", "wallet.transfer.request", input),
      /reference already/,
    );
    await assert.rejects(
      () =>
        call("customer", "wallet.transfer.request", {
          ...input,
          amountKobo: 1,
        }),
      /reference already/,
    );
    await assert.rejects(() =>
      call("driver", "wallet.transfer.request", input),
    );
    await assert.rejects(() =>
      call("customer", "wallet.transfer.request", {
        ...input,
        customerId: ids.owner,
      }),
    );
    await assert.rejects(() =>
      call("customer", "credit.decide", {
        id: r.id,
        decision: "approved",
        reason: "Customer cannot approve their own money",
      }),
    );
    // Use an existing second active branch for a genuine cross-branch negative.
    await db.query(
      "INSERT INTO branches(id,name) VALUES('wallet-other','Synthetic other branch')",
    );
    await db.query("UPDATE users SET branch_id='wallet-other' WHERE id=$1", [
      ids.finance,
    ]);
    await assert.rejects(
      () =>
        call("finance", "credit.decide", {
          id: r.id,
          decision: "approved",
          reason: "Wrong branch finance must not approve",
        }),
      /another branch/,
    );
    await db.query("UPDATE users SET branch_id='lagos' WHERE id=$1", [
      ids.finance,
    ]);
    await call("finance", "credit.decide", {
      id: r.id,
      decision: "approved",
      reason: "Synthetic statement independently reconciled",
    });
    await call("finance", "credit.decide", {
      id: r.id,
      decision: "approved",
      reason: "Same decision retry cannot double credit",
    });
    assert.equal((await call("customer", "wallet")).balanceKobo, 100000);
    assert.equal(
      Number(
        (await one(
          db,
          "SELECT count(*) n FROM wallet_entries WHERE customer_id=$1",
          [ids.customer],
        ))!.n,
      ),
      1,
    );
    assert.equal(
      (await call("commercial", "wallet.funding")).requests.length,
      0,
    );
    const reject = await call("customer", "wallet.transfer.request", {
      ...input,
      receiptReference: "Test-Rejected-0002",
    });
    await call("owner", "credit.decide", {
      id: reject.id,
      decision: "rejected",
      reason: "Statement has no matching receipt record",
    });
    await assert.rejects(
      () =>
        call("owner", "credit.decide", {
          id: reject.id,
          decision: "approved",
          reason: "Cannot approve a previously rejected transfer",
        }),
      /already been decided/,
    );
    assert.equal((await call("customer", "wallet")).balanceKobo, 100000);
    const limit = await call("customer", "wallet.transfer.request", {
      ...input,
      receiptReference: "Test-Limit-0003",
      amountKobo: 10000,
    });
    await db.query(
      "UPDATE settings SET value='100000' WHERE key='wallet.maximum' AND scope='lagos'",
    );
    await assert.rejects(
      () =>
        call("owner", "credit.decide", {
          id: limit.id,
          decision: "approved",
          reason: "Balance limit cannot be exceeded by approval",
        }),
      /balance limit/,
    );
    assert.equal(
      (await call("customer", "wallet.funding")).requests.find(
        (x: any) => x.id === limit.id,
      ).status,
      "pending",
    );
    delete process.env.EASYGAS_WALLET_BANK_ACCOUNTS;
    await assert.rejects(
      () =>
        call("customer", "wallet.transfer.request", {
          ...input,
          receiptReference: "Test-Unconfigured-0004",
        }),
      /not configured/,
    );
    assert.equal((await call("customer", "wallet.funding")).bank, null);
  } finally {
    if (old === undefined) delete process.env.EASYGAS_WALLET_BANK_ACCOUNTS;
    else process.env.EASYGAS_WALLET_BANK_ACCOUNTS = old;
    await db.close();
  }
});
