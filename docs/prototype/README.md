# EasyGas complete experience prototype

Private review link: [EasyGas Interactive Experience](https://easygas-complete-experience.philipmuyiwa.chatgpt.site).

Sign in with the owning ChatGPT account. Start at the experience hub, choose a role, or open **Guide & features**. The guide contains five journeys, search, all 86 screen links and a local activity history. Prototype state persists in your browser and can be reset.

The prototype covers public access, Customer, Admin/business owner, Service Manager, Inventory, Driver and Technician. It reuses 160 current interface/style/business-rule sources. The [audit](AUDIT.md), [36-family feature map](feature-coverage.json), [86-route map](route-coverage.json) and [requirements matrix](../traceability/experience-prototype-rtm.md) distinguish design inventory, simulation, inspection and unperformed acceptance.

## What is interactive

Original menus, filters, tabs, dialogs, responsive screens and themes are included. Guided delivery/service/refund journeys maintain shared local records and references across roles; payment failure and expired calibration block affected simulated steps. Owner-governance and stock journeys explain hand-offs and record local activity. Other source-form submissions record local interaction previews. They do not reproduce the full transactional backend.

No real orders, payments, messages, account credentials, safety renewals or GPS data are sent or created. Captured synthetic fixture identities/contacts and sensitive metadata are sanitized. The client demo is unchanged. Commercial NO-GO, actual-import hold, retain-all and existing native/physical/provider limits remain.

## Verification

- Nine executed local-model checks pass, including no network forwarding and denied operations.
- Six artifact/source/route/persona checks pass; 86 static route entries and 36 mapped feature families/300 named features are retained.
- Initial desktop inspection recorded 187 role-route observations across all 86 distinct routes. Actual order details Overview/Items/Payment/History were exercised.
- Final hosted authenticated interactions, phone layouts and complete browser journeys/reset/guide keyboard checks remain **open**. A native reset-confirmation test stalled the preview browser; the reset control was replaced with the existing accessible app dialog. The private hosted sign-in gate was observed, but final authenticated content was not inspected.
- Requirements: 8/8 implemented; 4/8 verified, 4/8 partial; no exclusions. Private deployment success is not represented as full interaction acceptance.

## Rebuild and review evidence

Implementation: `prototypes/easygas-experience/`. Run `node prototypes/easygas-experience/build.mjs`, `node scripts/test-experience-prototype.mjs` and `node scripts/validate-experience-prototype.mjs` from repository root. `source-manifest.json` hashes the original files actually bundled. `evidence/publication.json` retains the exact private release provenance.
