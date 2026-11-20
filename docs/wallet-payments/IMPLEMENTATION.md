# Wallet & Payments editor implementation

The supplied screenshots show the old generic request form. The previously deployed settings shell already provided tabs and fixed actions. This continuation refines the payment content inside that shell.

- Checkout has a short sandbox status, compact payment methods, a wrapped merchant reference and optional quote timing.
- Fees uses exact naira/percentage entry, readable fee payer choices, optional advanced rules and an illustrative quote from the existing shared fee algorithm.
- Wallet groups top-up limits and switches. Review shows actual differences in human units, including the distinction between no cap and a zero cap.
- Repeated approval prose, raw current-policy dumps and technical kobo/basis-point labels are absent from the editor. The fixed shared footer remains the sole draft/review/confirmation control.

Amounts accept at most two decimal places and convert through integer arithmetic. Invalid text stays editable and blocks review; it is not rounded or coerced to zero. Changing tabs preserves the draft. Invalid collapsed fields reveal their section before focus. Fee examples are not issued quotes and do not call a payment provider.

The server policy schema, payment quote algorithm, permission/approval/activation handlers and hosted business values were not changed. Protected payment changes still need the existing independent approvals. This work does not convert a sandbox policy into a live policy or approve new commercial rates.

Local evidence includes 45 focused tests (including six-role real service dispatch and negative policies), web typecheck/build, real browser interaction, and exact API readback of a synthetic saved draft. Hosted release evidence and screenshots are in `evidence/release/`; hosted checks only create/remove their dedicated sessions. No hosted proposals, balance changes, seeds, role changes or activations are made.

The updated manual is `docs/user-manual/wallet-payments-update.md`. Original PDF/Word and prototype artifacts remain historical. The source-fidelity test now binds this explicitly reviewed continuation to the prior settings hashes without replacing any previous baseline.

Production NO-GO, actual-import hold, retain-all and unrelated provider/native/operational gates remain unchanged. No mobile build/export/install was run; original artifact hashes, sizes and modification times are retained.

Deployed web source: `e6996fc5e70db9dbd3febd37f1ae9f29158b307d`. Ready deployment: `dpl_7vUspXs9hxLDy8vwp89Yo3Y19d8m`, promoted to `https://easygas-client-demo.vercel.app`. All 429 uploaded files were checked byte-for-byte against the source commit. Candidate and stable each passed 25 authenticated checks; the stable checks were repeated after browser preview edits had been discarded. Three release-evidence tests passed. The six scoped requirements/gates are verified; existing production and unrelated acceptance work remains open.
