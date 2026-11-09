// Regression coverage for previously reproduced production defects.
import test from "node:test";
import assert from "node:assert/strict";
import { parse } from "pg-connection-string";
import {
  databaseTlsConfigured,
  verifiedDatabaseConfig,
} from "../apps/web/lib/database-tls";
import { environmentChecks } from "../apps/web/lib/release-checks";
import { fixture } from "./helpers/order-tracking-fixture";
import { queueMessage } from "../apps/web/lib/accounts";
import { deliverTransactionalMail } from "../apps/web/lib/transactional-mail";
import { id } from "../apps/web/lib/auth";
import { one } from "../apps/web/lib/db";
test("AUD-01: release preflight and runtime reject weakened TLS and enforce certificate/hostname verification", () => {
  const database =
    "postgresql://runtime:fixture@example.test/easygas?sslmode=require&uselibpqcompat=true";
  const checks = environmentChecks({
    APP_URL: "https://easygasng.com",
    DATABASE_URL: database,
    PGSSLMODE: "verify-full",
    EASYGAS_BACKGROUND_JOBS: "false",
    EASYGAS_RELEASE_SHA: "a".repeat(40),
    EASYGAS_EMAIL_ENABLED: "true",
    SMTP_HOST: "smtp.example.test",
    SMTP_PORT: "587",
    SMTP_FROM: "sender@example.test",
    SMTP_USER: "fixture",
    SMTP_PASSWORD: "fixture-only",
  } as any);
  assert.equal(checks.find((c) => c.id === "database-tls")!.ok, false);
  assert.throws(
    () =>
      verifiedDatabaseConfig({
        DATABASE_URL: database,
        PGSSLMODE: "verify-full",
      }),
    /TLS/,
  );
  const secure =
    "postgresql://runtime:fixture@example.test/easygas?sslmode=verify-full";
  const config = verifiedDatabaseConfig({ DATABASE_URL: secure });
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.equal(typeof config.ssl.checkServerIdentity, "function");
  assert.ok(
    config.ssl.checkServerIdentity("wrong.example.test", {
      subjectaltname: "DNS:example.test",
    } as any),
  );
  for (const query of [
    "sslmode=disable",
    "sslmode=no-verify",
    "ssl=false",
    "sslmode=verify-full&sslmode=disable",
    "sslmode=verify-full&SSL=false",
    "sslmode=verify-full&uselibpqcompat=true",
    "sslmode=verify-full&host=elsewhere.test",
  ]) {
    assert.equal(
      databaseTlsConfigured({
        DATABASE_URL:
          "postgresql://runtime:fixture@example.test/easygas?" + query,
        PGSSLMODE: "verify-full",
      }),
      false,
      query,
    );
  }
  assert.equal((parse(database).ssl as any).rejectUnauthorized, false);
  // This parser result is precisely the insecure configuration the preflight rejects.
});
test("AUD-02: owner retry and competing workers cannot duplicate an in-flight SMTP message", async () => {
  const f = await fixture();
  let release!: () => void, entered!: () => void;
  const pending = new Promise<void>((resolve) => {
      release = resolve;
    }),
    started = new Promise<void>((resolve) => {
      entered = resolve;
    });
  let first: Promise<any> | undefined;
  try {
    await queueMessage(
      f.db,
      f.actors.customer.id,
      "fixture@example.test",
      "Audit fixture",
      "Synthetic body only",
      id(),
    );
    const sends: string[] = [];
    first = deliverTransactionalMail(
      f.db,
      {
        async send(m) {
          sends.push(m.id);
          entered();
          await pending;
        },
      },
      1,
    );
    await started;
    const row = await one(
      f.db,
      "SELECT id,status FROM message_outbox WHERE channel='email'",
    );
    assert.equal(row!.status, "failed");
    await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
    await assert.rejects(
      () =>
        f.call("owner", "mail.retry", {
          id: row!.id,
          reason: "Reviewing a message currently shown as failed",
          acknowledgePossibleDuplicate: true,
        }),
      /in flight|reconcile/i,
    );
    await deliverTransactionalMail(
      f.db,
      {
        async send(m) {
          sends.push(m.id);
        },
      },
      1,
    );
    assert.deepEqual(sends, [row!.id]);
    release();
    await first;
    assert.equal(
      (await one(f.db, "SELECT status FROM message_outbox WHERE id=$1", [
        row!.id,
      ]))!.status,
      "sent",
    );
  } finally {
    release();
    await first?.catch(() => {});
    await f.db.close?.();
  }
});

test("AUD-03: interrupted SMTP requires expired lease, stopped-worker attestation and audited provider reconciliation", async () => {
  const f = await fixture();
  try {
    await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
    await queueMessage(
      f.db,
      f.actors.customer.id,
      "fixture@example.test",
      "Interrupted fixture",
      "Synthetic content",
      id(),
    );
    const row = await one(
      f.db,
      "SELECT id FROM message_outbox WHERE channel='email'",
    );
    await f.db.query(
      "UPDATE message_outbox SET status='failed',attempts=1,delivery_status='sending',lease_until=now()+interval '1 minute' WHERE id=$1",
      [row!.id],
    );
    const request = {
      id: row!.id,
      reason: "Provider investigation fixture reference 123",
      workerStopped: true,
      providerOutcome: "accepted",
    };
    await assert.rejects(
      () => f.call("customer", "mail.reconcile", request),
      /permission|authoris|access/i,
    );
    await assert.rejects(
      () => f.call("owner", "mail.reconcile", request),
      /lease.*active/i,
    );
    await f.db.query(
      "UPDATE message_outbox SET lease_until=now()-interval '1 minute' WHERE id=$1",
      [row!.id],
    );
    await assert.rejects(() =>
      f.call("owner", "mail.reconcile", { ...request, workerStopped: false }),
    );
    await f.call("owner", "mail.reconcile", request);
    const final = await one(
      f.db,
      "SELECT status,lease_until FROM message_outbox WHERE id=$1",
      [row!.id],
    );
    assert.equal(final!.status, "sent");
    assert.equal(final!.lease_until, null);
    let sends = 0;
    await deliverTransactionalMail(f.db, {
      async send() {
        sends++;
      },
    });
    assert.equal(sends, 0);
    await assert.rejects(
      () => f.call("owner", "mail.reconcile", request),
      /interrupted/i,
    );
  } finally {
    await f.db.close?.();
  }
});

test("AUD-04: verified TLS accepts a trusted matching certificate and rejects untrusted/wrong-host peers", async () => {
  const { mkdtemp, readFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const { execFileSync } = await import("node:child_process");
  const tls = await import("node:tls");
  const dir = await mkdtemp(path.join(tmpdir(), "easygas-tls-"));
  let server: ReturnType<typeof tls.createServer> | undefined;
  try {
    const key = path.join(dir, "key.pem"),
      cert = path.join(dir, "cert.pem");
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-keyout",
        key,
        "-out",
        cert,
        "-days",
        "1",
        "-subj",
        "/CN=localhost",
        "-addext",
        "subjectAltName=DNS:localhost",
      ],
      { stdio: "ignore" },
    );
    server = tls.createServer(
      { key: await readFile(key), cert: await readFile(cert) },
      (socket) => socket.end(),
    );
    server.on("tlsClientError", () => {});
    await new Promise<void>((resolve) =>
      server!.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as any).port;
    const config = verifiedDatabaseConfig({
      DATABASE_URL: `postgresql://fixture@localhost:${port}/fixture?sslmode=verify-full&sslrootcert=${encodeURIComponent(cert)}`,
    });
    const connect = (options: any) =>
      new Promise<void>((resolve, reject) => {
        const socket = tls.connect(
          { host: "127.0.0.1", port, servername: "localhost", ...options },
          () => {
            socket.end();
            resolve();
          },
        );
        socket.on("error", reject);
      });
    await connect(config.ssl);
    await assert.rejects(
      () => connect({ ...config.ssl, servername: "wrong.example.test" }),
      /hostname|altnames|certificate/i,
    );
    await assert.rejects(
      () => connect({ ...config.ssl, ca: undefined }),
      /self.signed|certificate/i,
    );
  } finally {
    if (server)
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    await rm(dir, { recursive: true, force: true });
  }
});
