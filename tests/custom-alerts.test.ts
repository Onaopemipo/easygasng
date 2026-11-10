import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDialogQueue } from "../packages/business-rules/src/dialog-queue";
import { friendlyMessage } from "../packages/business-rules/src/friendly-message";
test("ALERT-QUEUE: dialogs remain ordered, cancel safely, ignore stale/double clicks and abort abandoned actions without confirming", async () => {
  const q = createDialogQueue<string, boolean>();
  const a = q.open("first"),
    b = q.open("second");
  assert.equal(q.current()!.options, "first");
  const first = q.current()!.id;
  q.settle(first + 1, true);
  assert.equal(q.current()!.id, first);
  q.settle(first, false);
  assert.equal(await a, false);
  q.settle(first, true);
  assert.equal(q.current()!.options, "second");
  q.settle(q.current()!.id, true);
  assert.equal(await b, true);
  assert.equal(q.current(), null);
  const controller = new AbortController();
  const pending = q.open("abandoned", {
    signal: controller.signal,
    cancelResult: false,
  });
  controller.abort();
  assert.equal(await pending, false);
  assert.equal(q.current(), null);
  assert.equal(
    await q.open("already aborted", {
      signal: controller.signal,
      cancelResult: false,
    }),
    false,
  );
  const x = q.open("one"),
    y = q.open("two");
  q.cancelAll(false);
  assert.deepEqual(await Promise.all([x, y]), [false, false]);
});
test("ALERT-MESSAGE: technical errors become actionable while payment, safety and pending-state explanations remain exact", () => {
  assert.match(friendlyMessage("Invalid ISO datetime"), /valid date and time/);
  assert.match(friendlyMessage("Failed to fetch"), /connection/);
  assert.match(
    friendlyMessage("Too small: expected string to have >=10 characters"),
    /at least 10/,
  );
  assert.match(
    friendlyMessage(
      "duplicate key value violates unique constraint secret_internal_table",
    ),
    /could not complete/,
  );
  assert.doesNotMatch(
    friendlyMessage(
      "duplicate key value violates unique constraint secret_internal_table",
    ),
    /secret_internal_table/,
  );
  for (const text of [
    "Payment verification is required before dispatch.",
    "Your request is awaiting independent approval.",
    "The order is not yet marked delivered.",
    "No verified gas stock is available.",
  ])
    assert.equal(friendlyMessage(text), text);
});
test("ALERT-WIRING: browser/native native-alert calls are replaced; async forms retain their element and required approval reason", async () => {
  const web = ["ui", "workflows", "easyrewards", "admin"];
  for (const name of web) {
    const s = await readFile(`apps/web/components/${name}.tsx`, "utf8");
    assert.doesNotMatch(s, /window\.(alert|confirm|prompt)\s*\(/);
  }
  for (const name of ["App", "DriverWorkspace", "TechnicianWorkspace"]) {
    const s = await readFile(`apps/mobile/${name}.tsx`, "utf8");
    assert.doesNotMatch(s, /(?<!EasyGas)Alert\.alert\(/);
    assert.match(s, /EasyGasAlert/);
  }
  const form = await readFile("apps/web/components/workflows.tsx", "utf8");
  assert.ok(
    form.indexOf("const form = e.currentTarget") <
      form.indexOf("await confirmAction"),
  );
  assert.match(form, /lifecycle.current\?\.signal/);
  const modal = await readFile("apps/web/components/ui.tsx", "utf8");
  assert.match(modal, /Keep editing/);
  assert.match(modal, /appDialogActive/);
  const reward = await readFile("apps/web/components/easyrewards.tsx", "utf8");
  assert.match(reward, /minimumLength: 10/);
  const dialog = await readFile("apps/web/components/app-dialog.tsx", "utf8");
  assert.match(dialog, /role="alertdialog"/);
  assert.match(dialog, /aria-describedby/);
  assert.match(dialog, /stopImmediatePropagation/);
});
