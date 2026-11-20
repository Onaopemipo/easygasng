# Payment settings consolidation release

The three similar Admin Settings categories now appear once as **Payments & Wallet**, organised by purpose. All six controls remain. The legacy integration flag moves from Integrations into collapsed Advanced controls. The operational Finance workspace remains separate.

See [audit and before/after mapping](AUDIT.md) and the [current user guide](../user-manual/payment-settings-organisation.md). The old labels and category aliases remain searchable, including the old gateway title. Editor/history titles use the new names while requests retain canonical keys/scopes/versions and server permission metadata.

This is display-only consolidation: no definition migrations, value changes, removed controls, new authority or financial policy activation. Stored categories are deliberately retained because existing delegation guards reference them. Managers retain their two viewable controls; owner/finance controls remain restricted.

Source `8cc248dca9a5fcd1e61411f341f18a9e6c153f62` deployed as Ready `dpl_FnuCqMVBEnTaLfqsQBw7YB7dfEVf`, promoted to the existing client demo. All 431 uploaded web/shared files were verified against committed source. Local acceptance: 41 focused tests, web typecheck/build, old-name search, purpose grouping, advanced discovery, history/edit and legacy gateway handoffs, plus settled phone layout. Hosted checks use six existing labelled accounts and read-only business actions; login/logout are session-only.

[Release evidence](evidence/release/), [local browser acceptance](evidence/local-browser.json), [focused tests](evidence/focused-tests.txt), [traceability](../traceability/settings-categories-rtm.md). Hosted before/after settings, approval requests, staff, orders, stock, ledger, policies and readiness snapshots remain bound to the original baseline. Native artifact hashes, sizes and modification times are preserved; no mobile binaries built.

There is no outstanding work in this scoped category consolidation. Existing production NO-GO, actual-import hold, retain-all, provider/native/physical-operation and unrelated acceptance gates retain their previous status. Historical PDF/Word manuals are not reissued; the current Markdown guide is linked above.
