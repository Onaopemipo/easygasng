# Active sidebar visibility

The shared staff sidebar now remembers its scroll offset within the current browser tab, separately for expanded, compact and mobile menus. After navigation, reload, drawer opening or a viewport-height change, it moves only far enough to reveal the active item. The page itself and keyboard focus are left alone. The current route's group opens after saved preferences load, avoiding a hydration race that could leave it closed. Users can still scroll elsewhere or collapse groups manually.

Implementation: `apps/web/components/admin-navigation.tsx`, `apps/web/lib/sidebar-scroll.ts` and two scoped menu-scroll CSS properties in `apps/web/app/globals.css`. Only numeric viewport offsets are saved, keyed by user and menu mode, in sessionStorage. Storage failures fall back to revealing the active item. The existing `access.allowed` list, route guards, aria-current, mobile dialog/focus trap, counters and page scroll handling remain authoritative.

## Executed acceptance

- 15/15 regression checks: nearest-edge/clamping/corrupt-offset behavior plus existing route/role/privilege/counter tests, no failures or skips. [Log](evidence/regression.txt).
- 1/1 saved browser-evidence validation. [Log](evidence/browser-validation.txt). This checks recorded observations; actual interaction was performed separately through the browser.
- Web production build and TypeScript pass: [build](evidence/build.txt), [types](evidence/types.txt).
- Actual local browser checks at 1440×800 and 390×844: lower links, native visible-link click, reload, compact navigation, saved closed group, direct entry, browser Back, mobile close/reopen and Escape. [Measurements](evidence/browser-checks.json), [desktop](evidence/desktop.jpg), [mobile](evidence/mobile.jpg). Every final active row fits inside its menu viewport and page scroll remains zero. A native visible-link click and subsequent reload retained exactly 974.5px. Expanded/compact switching keeps the collapse button focused; mobile Escape restores the menu toggle and clears main-content inertness.

One immediate reload observation preceded layout and is explicitly superseded by the settled observation. A rapid keyboard-test sequence navigated to home and an extra close lookup found no drawer; the final mobile check used settled state and native Escape and passed. No business forms or sends were submitted. Temporary viewport overrides were reset.

This is a local implementation; the client demo has not been updated by this follow-up. Physical Firefox/Safari and formal accessibility acceptance are unperformed. Existing order-modal changes, earlier demo release, production NO-GO, actual-import hold and retain-all instruction remain preserved. [Requirements matrix](../traceability/sidebar-focus-rtm.md).
