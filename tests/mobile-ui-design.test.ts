import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { adminNavigation } from "../packages/business-rules/src/admin-navigation";
import { customerNavigation } from "../packages/business-rules/src/customer-navigation";
const base = "docs/design/mobile-ui/";
async function studio() {
  const elements = new Map<string, any>();
  const node = (id: string) => {
    if (!elements.has(id))
      elements.set(id, {
        value: "",
        innerHTML: "",
        textContent: "",
        style: {},
        dataset: {},
        classList: { toggle() {}, add() {}, remove() {} },
        querySelector() {
          return null;
        },
        scrollTop: 0,
      });
    return elements.get(id);
  };
  const context: any = {
    console,
    URLSearchParams,
    URL,
    Blob,
    setTimeout,
    clearTimeout,
    location: { hash: "", search: "" },
    history: { replaceState() {} },
    document: {
      getElementById: node,
      addEventListener() {},
      body: { classList: { add() {} } },
    },
    window: { addEventListener() {} },
  };
  vm.createContext(context);
  vm.runInContext(await readFile(base + "manifest.js", "utf8"), context);
  vm.runInContext(await readFile(base + "app.js", "utf8"), context);
  return context;
}
test("MUI-01: all 99 screens map the existing customer routes and every administration navigation entry", async () => {
  const d = JSON.parse(await readFile(base + "screen-manifest.json", "utf8"));
  assert.equal(d.screens.length, 99);
  assert.equal(new Set(d.screens.map((s: any) => s.id)).size, 99);
  assert.equal(new Set(d.screens.map((s: any) => s.requirementId)).size, 99);
  for (const r of customerNavigation)
    assert.ok(
      d.screens.some((s: any) => s.webRoute === r.href),
      r.href,
    );
  for (const r of adminNavigation.flatMap((g) => g.items))
    assert.ok(
      d.screens.some(
        (s: any) =>
          s.persona === "business" &&
          s.webRoute === r.href &&
          s.api === r.readAction,
      ),
      r.href,
    );
});
test("MUI-02: every screen renders populated and five alternate states without missing navigation targets", async () => {
  const c = await studio();
  const result = vm.runInContext(
    `(()=>{const failures=[];const ids=new Set(model.screens.map(x=>x.id));for(const screen of model.screens){state.persona=screen.persona;state.screen=screen.id;state.role='owner';if(screen.id.startsWith('b-')&&!['b-detail','b-edit','b-review','b-import','b-verify'].includes(screen.id))state.context=screen.id.slice(2);for(const view of ['ready','empty','loading','error','offline','restricted']){state.view=view;const html=renderScreen();if(!html||html.includes('Screen unavailable'))failures.push(screen.id+':'+view);for(const m of html.matchAll(/data-go="([^"]+)"/g))if(!ids.has(m[1]))failures.push('Unknown target '+m[1]);}}return failures;})()`,
    c,
  );
  assert.deepEqual(Array.from(result), []);
});
test("MUI-03: field roles retain dedicated navigation through shared account screens and business visibility cannot grant excluded routes", async () => {
  const c = await studio();
  for (const [persona, id] of [
    ["driver", "d-account"],
    ["technician", "t-account"],
  ]) {
    vm.runInContext(
      `state.persona='${persona}';navigate('${id}');navigate('c-security');`,
      c,
    );
    assert.equal(vm.runInContext("state.persona", c), persona);
    assert.equal(vm.runInContext('tabs().includes("Shop")', c), false);
  }
  for (const role of [
    "owner",
    "manager",
    "finance",
    "inventory",
    "sales",
    "dispatcher",
    "administrator",
    "service_manager",
    "safety_officer",
  ]) {
    vm.runInContext(`state.role='${role}'`, c);
    for (const item of adminNavigation.flatMap((g) => g.items))
      assert.equal(
        vm.runInContext(`allowed('b-${item.id}')`, c),
        item.roles.includes(role),
        role + ":" + item.id,
      );
  }
});
test("MUI-04: prototype never calls live APIs and preserves unavailable payment/GPS and physical safety boundaries", async () => {
  const c = await studio();
  const source = await readFile(base + "app.js", "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|sendBeacon\s*\(/);
  assert.match(
    vm.runInContext("customerScreen('c-checkout')", c),
    /Online card payments are currently unavailable/,
  );
  assert.match(
    vm.runInContext("customerScreen('c-track')", c),
    /arrival estimates are unavailable/,
  );
  assert.match(
    vm.runInContext("driverScreen('d-proof')", c),
    /No partial handover or proof override/,
  );
  assert.match(
    vm.runInContext("technicianScreen('t-report')", c),
    /customer acknowledges/,
  );
  assert.match(
    vm.runInContext("businessReview()", c),
    /requester cannot approve/,
  );
});
test("MUI-05: design type stays at least 15px and declares compact layouts, reduced motion and keyboard focus", async () => {
  const css = await readFile(base + "design.css", "utf8");
  for (const m of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g))
    assert.ok(Number(m[1]) >= 15);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /focus-visible/);
  assert.match(css, /max-width:740px/);
  assert.match(css, /min-height:44px/);
});
