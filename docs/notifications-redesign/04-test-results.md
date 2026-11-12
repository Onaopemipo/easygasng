# Test results

- Final PostgreSQL-enabled full regression passed 676 tests with zero failures or skips. See [full regression](evidence/full-regression.txt).
- After wiring driver and technician inboxes, 20 focused tests passed, including the updated preservation check. Native and web TypeScript checks passed. See [focused tests](tests.txt).
- Local Chromium verified system-dark mode at 320px, offline stale state, reconnect retry, pagination, single read, Escape and focus restoration, page bulk selection, mark all and the filtered empty state. See [browser checks](evidence/browser.txt), [desktop](evidence/desktop.png) and [mobile web](evidence/mobile-web.png).
- Unexecuted acceptance cases remain listed in the scenario matrix. No physical device or hosted acceptance is claimed.
