import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSidebarScroll,
  sidebarScrollTop,
} from "../apps/web/lib/sidebar-scroll";

test("NAVFOCUS-BOUNDS: visible links retain position and clipped links move only the menu by the required distance", () => {
  const viewport = {
    current: 600,
    viewportTop: 80,
    viewportHeight: 400,
    scrollHeight: 1800,
  };
  assert.equal(
    sidebarScrollTop({ ...viewport, itemTop: 160, itemBottom: 204 }),
    600,
  );
  assert.equal(
    sidebarScrollTop({ ...viewport, itemTop: 65, itemBottom: 109 }),
    577,
  );
  assert.equal(
    sidebarScrollTop({ ...viewport, itemTop: 460, itemBottom: 504 }),
    632,
  );
  assert.equal(
    sidebarScrollTop({ ...viewport, current: 0, itemTop: 80, itemBottom: 124 }),
    0,
  );
  assert.equal(
    sidebarScrollTop({
      ...viewport,
      current: 1400,
      itemTop: 440,
      itemBottom: 484,
    }),
    1400,
  );
  assert.equal(
    sidebarScrollTop({
      ...viewport,
      scrollHeight: 300,
      itemTop: 80,
      itemBottom: 124,
    }),
    0,
  );
  assert.equal(
    sidebarScrollTop({
      ...viewport,
      viewportHeight: 44,
      itemTop: 80,
      itemBottom: 124,
    }),
    600,
  );
});

test("NAVFOCUS-STORAGE: missing, corrupt, negative or nonfinite offsets cannot restore an invalid position", () => {
  for (const value of [
    null,
    "",
    " ",
    "bad",
    "NaN",
    "Infinity",
    "-20",
    '{"scroll":40}',
  ])
    assert.equal(parseSidebarScroll(value), 0);
  assert.equal(parseSidebarScroll("528.5"), 528.5);
  assert.equal(parseSidebarScroll("0"), 0);
});
