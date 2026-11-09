import test from "node:test";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
test("VDEMO-HTTP01: hosted demo origin, auth, private admin and catalogue remain isolated", async () => {
  const m = JSON.parse(
      await readFile(
        process.env.EASYGAS_DEMO_CREDENTIAL_FILE ??
          "/tmp/easygas-vercel-demo-credentials.json",
        "utf8",
      ),
    ),
    base = "https://easygas-client-demo.vercel.app",
    tokens = {};
  const call = async (role, action, data) => {
    const r = await fetch(base + "/api/" + action, {
      method: data === undefined ? "GET" : "POST",
      headers: {
        "content-type": "application/json",
        "x-easygas-client": "native",
        origin: base,
        ...(tokens[role] ? { authorization: "Bearer " + tokens[role] } : {}),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    return { status: r.status, headers: r.headers, body: await r.json() };
  };
  try {
    const home = await fetch(base);
    assert.equal(home.status, 200);
    const html = await home.text();
    assert.match(html, /Client demo/);
    assert.match(html, /noindex/);
    console.log(
      "PASS hosted homepage, synthetic-data notice and no-index metadata",
    );
    assert.equal((await call("", "me")).status, 401);
    for (const role of ["owner", "customer"]) {
      const a = m.accounts.find((a) => a.role === role),
        login = await call(role, "login", {
          email: a.email,
          password: a.password,
        });
      assert.equal(login.status, 200, JSON.stringify(login.body));
      assert.equal(login.body.role, role);
      tokens[role] = login.body.token;
      const me = await call(role, "me");
      assert.equal(me.status, 200);
      assert.equal(me.body.user.email, a.email);
      console.log("PASS hosted " + role + " sign-in and persistent identity");
    }
    const dashboard = await call(
      "owner",
      "admin.dashboard?from=2026-11-01&to=2026-11-30",
      undefined,
    );
    assert.equal(dashboard.status, 200, JSON.stringify(dashboard.body));
    assert.equal(
      (await call("customer", "admin.dashboard?from=2026-11-01&to=2026-11-30"))
        .status,
      403,
    );
    console.log("PASS owner dashboard and customer privilege rejection");
    const publicProducts = await call("", "catalogue");
    assert.equal(publicProducts.status, 200);
    assert.ok(publicProducts.body.products.length >= 8);
    console.log("PASS hosted canonical product catalogue");
    const robots = await fetch(base + "/robots.txt");
    assert.match(await robots.text(), /Disallow: \/\s/);
    console.log("PASS demo robots excludes indexing");
  } finally {
    for (const role of Object.keys(tokens)) await call(role, "logout", {});
  }
});
