# Mobile experience audit and redesign — 23 November 2026

[Open the private mobile prototype](https://easygas-mobile-next.philipmuyiwa.chatgpt.site). Use **Review controls → Customer** for checkout, or choose another review persona. This is a new design review, separate from the existing prototype and signed store builds.

The audit covered all 58 existing top-level native TSX modules (plus the new transition component reviewed during implementation) and the canonical 36 feature families / 300 named features. It reviewed the eight supplied phone screenshots, native navigation/loading/form patterns, payment initialization/callback/session handling and the existing isolated workflow model. This is a whole-source audit with bounded runtime verification; it does not certify every native workflow or all 300 individual controls.

## Findings and disposition

| Finding | Evidence / cause | Correction | Remaining acceptance |
| --- | --- | --- | --- |
| Repeated, scattered loaders | 36 loader call sites; default inline placement and two optional dashboard widgets each rendered a loader | Default native indicator centres its own content; optional home widgets stop displaying separate loaders; shared remote reads reuse session-scoped data, revalidate in place and show a delayed compact skeleton | Installed-device loading checks across every native role |
| Long, stacked checkout | Configuration, quote, recipient form and payment controls remained on one page | New prototype uses Refill → Delivery → Review, one primary action per step, saved address, optional instructions and a fixed total/action area. Native source hides configuration during review and collapses optional delivery fields | Port the complete three-step visual design into native and test signed builds |
| False browser sign-in after payment | Native uses bearer authentication; external browser has no native session cookie. Native callback was nevertheless attempting browser verification | Browser native callback presents one return-to-app link. Native verifies the opaque intent with its own session on entry/foreground, guards overlapping checks and keeps the saved payment | Client-demo callback deployed/visually verified; actual device/provider return acceptance remains |
| Navigation churn and outdated-session responses | Screens remount and reads re-fetch; a delayed response from a previous session could clear the current session | Cache scope changes with account/session, stale data cannot cross scope, old-session responses cannot clear a newer session; short reduced-motion-aware native fade | Physical iOS/Android transition, screen reader and large text checks |
| Dense role workspaces | Numerous related controls exposed together | All 36 families retained behind role-specific home/navigation and Overview / Actions / Activity tabs; actions open focused sheets; finance amounts shown in naira | Individual task usability and operational acceptance for the full 300-feature denominator |
| Prototype guest balance | Found during phone walkthrough | Guest home, wallet and order list hide signed-in records; guest account uses an entry state | Passed bounded browser checks; no production authentication changes |
| Prototype landscape footer | 858px fixed preview frame hid tabs at 1024×768 | Preview frame is bounded by viewport height | Fixed and verified locally and hosted |
| Finance priority opened support | Found in role navigation review | Finance priority now opens Finance workspace | Verified on hosted prototype |

## Design and interaction rules

Forest green and lime retain EasyGas branding; transparent logo, quieter surfaces, consistent type hierarchy and a stable tab bar replace large repeated panels. Normal navigation has no artificial loading pause. Slow-network review uses a content skeleton; offline states preserve context and offer recovery. Native transitions honour the OS reduced-motion preference; prototype CSS honours `prefers-reduced-motion`.

Customer checkout retains quantity, capacity guidance, multiple cylinders, delivery area/address/contact/date/window, optional directions, payment choice and exact order total. The prototype's card fee is visibly labelled **sample**, not a merchant rate. Payment confirmation follows verification; returning without payment remains pending. Existing server authority over pricing, eligibility, stock, payment posting, branch/role ownership, sensitive actions and physical safety is unchanged.

Review personas: visitor, customer, business customer, business owner, service manager, inventory & finance, driver and technician. Business customer uses the existing customer authority; it does not invent an eighth production role. Every family and original item remains in [coverage](feature-coverage.json), with individual acceptance explicitly open. Historic 117 screen entries and original prototype manifests/bundles remain intact.

## Executed evidence

- [Static native inventory](evidence/native-inventory.json), [focused component/model/regression tests](evidence/focused-tests.txt), [retained web prototype checks](evidence/retained-web-prototype.txt), native/web typechecks and web build.
- [Browser observations](evidence/browser-checks.json): eight personas on 390×844; customer refill/address/review/payment/success; pending/cancelled payment; expired-session restoration; offline recovery; guest boundaries; driver trip save; technician no-eligible-work; exact finance naira entry. Layout checks include 360×780, 414×896, 768×1024 and 1024×768, light/dark appearance. The first landscape failure remains in evidence alongside passing fixed checks.
- [Private publication](evidence/private-deployment.json): source `42c4911e1ebe7f5783e00bb7d3ad0584c88434e7`, owner-only audience, successful deployment and actual hosted customer/role/finance walkthroughs. No live API/provider or external data connection is used by the prototype.
- Initial full regression run: 1,197 tests, 1,163 pass, five fail, 29 environmental PostgreSQL skips. All five failures were outdated source-continuation/immediate-loader assertions, corrected without dropping historical hashes or test scope; the 82-test focused rerun and six retained-prototype checks passed. Skipped database tests remain unverified here.

## Scope and next implementation

The new prototype is interactive using isolated synthetic workflows, not a deployed native app. Targeted native source corrections accompany the design; installed TestFlight/Play internal build 0.1.0(2) has not changed. No EAS, Xcode, Gradle, native export, install or mobile distribution was run in this phase. The next native phase must adopt the new component/navigation language across customer and staff screens, then perform signed-device/provider/accessibility acceptance. Existing production **NO-GO**, actual-import hold and unrelated acceptance gates remain unchanged.

See the [manual](../user-manual/mobile-experience-redesign.md) and [requirements matrix](../traceability/mobile-ux-20261123-rtm.md).

## Client-demo callback deployment

Only `apps/web/components/hosted-payment.tsx` changed in the web upload from this phase baseline. All 438 upload files match committed source `80194c1aa6ed13fcfe08a79bf54abcb91e0e0d3d` and the Vercel dry-run hashes. The isolated upload excludes native, private, test, documentation and prototype files. Candidate `dpl_7MERX1577yLJJLDM9JJNTMfH8Htd` built successfully, health returned `ok`, and the stable alias now resolves to that Ready candidate. The previous Ready deployment is retained in [rollback identity](evidence/web-before.json).

Actual [browser checks](evidence/web-browser-checks.json) used a synthetic nonexistent intent: native return displays one opaque deep link and no sign-in prompt; an ordinary unauthenticated web return still requires sign-in and provides no receipt/paid state. No provider transaction or app launch was performed. This verifies the callback distinction, not a real card settlement. [Source](evidence/web-source-integrity.json), [candidate](evidence/web-candidate.json), [stable](evidence/web-stable.json), [promotion](evidence/web-promotion.txt).

## Final regression disposition

The [full rerun](evidence/regression-final.txt) executed 1,201 tests: 1,171 passed, one traceability-reference failure, and 29 environmental skips. No application test failed. The new matrix initially omitted the existing traceability evidence file from two verified rows; that reference was added, then all four global/phase traceability checks passed. The focused component/source/history suites passed 82/82 and retained web-prototype validation passed 6/6. [Structured disposition](evidence/regression-summary.json) retains the raw failure and its successful repair rather than relabelling the full run as zero failures. The 29 independent-database scenarios remain unverified.

Historical generated PDFs/model evidence were restored byte-for-byte after test generation. New evidence is stored in this phase directory. The only product web change is the native payment callback; native source changes and the new prototype remain separate from installed store binaries.
