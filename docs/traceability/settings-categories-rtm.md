# Payment settings category consolidation

Coverage: implementation 4/4; verified requirements 4/4; critical 1/1; route 1/1; gates 4/4. None excluded.

| ID | Requirement | Status | Gate |
| --- | --- | --- | --- |
| SCAT-01 | One payment settings category with purpose-based sections | VERIFIED_COMPLETE | SCAT-G01 · PASS |
| SCAT-02 | Accurate labels and distinctions for card versus cash/bank wallet controls | VERIFIED_COMPLETE | SCAT-G02 · PASS |
| SCAT-03 | No setting, authority, version, history or hidden-role coverage lost | VERIFIED_COMPLETE | SCAT-G03 · PASS |
| SCAT-04 | Verified demo rollout, discoverability and documentation | VERIFIED_COMPLETE | SCAT-G04 · PASS |

One Payments & Wallet category, with Online payments, Customer wallet, Cash & settlement and collapsed Advanced controls. All six settings remain, with old names searchable. Stored categories, keys, permissions, approval controls, values and versions are unchanged.

[Audit and mapping](../settings-categories/AUDIT.md) · [Current user guide](../user-manual/payment-settings-organisation.md) · [Release report](../settings-categories/README.md) · [Machine-readable matrix](settings-categories-rtm.json).

Evidence: [41 focused tests](../settings-categories/evidence/focused-tests.txt), [release tests](../settings-categories/evidence/release-tests.txt), [local UI](../settings-categories/evidence/local-browser.json), [hosted UI](../settings-categories/evidence/release/stable-browser.json), [candidate API](../settings-categories/evidence/release/candidate-hosted.json), [stable API](../settings-categories/evidence/release/stable-hosted.json).

Deployed source `8cc248dca9a5fcd1e61411f341f18a9e6c153f62`, Ready `dpl_FnuCqMVBEnTaLfqsQBw7YB7dfEVf`. All 431 uploaded web/shared files verified against source. Candidate and stable each passed 28 hosted checks; original business-state snapshots and four native artifacts retained. No mobile binary builds.

No outstanding work in this scoped web UI consolidation. Production NO-GO, actual-import hold, retain-all and unrelated provider/native/physical-operation gates remain unchanged. The focused manual addendum is current; historical PDF/Word manuals remain historical.
