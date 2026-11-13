# Public website 1440px traceability

Scope is the seven exact public URLs plus the Home How It Works anchor. Eight of eight layouts were implemented and measured. Five of eight requirements have complete bounded evidence, with three partial because the fixture lacked active stock, gas ordering policy or bookable services. Sixteen of twenty acceptance gates passed and four are partial. All requirements and gates remain in the denominators. Both source isolation gates passed, with representative browser checks for shared excluded routes. The existing production NO-GO remains.

See the [machine-readable mapping](public-width-1440-rtm.json), [source and scoping details](../public-width-1440/01-implementation.md) and [test and screenshot evidence](../public-width-1440/02-qa-results.md).

| ID | Destination | Status | Remaining scope |
| --- | --- | --- | --- |
| PUB-01 | Home `/` | VERIFIED_COMPLETE | None for scoped layout. |
| PUB-02 | Order Gas `/gas-order` | PARTIAL | Replay positive quote/checkout with configured test stock, coverage and payment. |
| PUB-03 | Products `/products` | PARTIAL | Replay positive add-to-cart with saleable test stock. |
| PUB-04 | Book a Service `/services` | PARTIAL | Replay a bookable fixture in-browser. |
| PUB-05 | How It Works `/#how-it-works` | VERIFIED_COMPLETE | None for scoped layout. |
| PUB-06 | About Us `/about` | VERIFIED_COMPLETE | None for scoped layout. |
| PUB-07 | Help `/help` | VERIFIED_COMPLETE | None for scoped layout. |
| PUB-08 | Business Supply `/business` | VERIFIED_COMPLETE | Live enquiry submission is outside the frontend width phase. |

| Gate | Criteria | Outcome |
| --- | --- | --- |
| A01 | Map eight public destinations | PASS |
| A02 | Audit width rules and shared consumers | PASS |
| A03 | Maximum outer width is 1440px including padding | PASS |
| A04 | Centre containers and use responsive gutters | PASS |
| A05 | Retain full-bleed bands | PASS |
| A06 | Keep Home and How It Works intact and reachable | PASS |
| A07 | Gas order layout, prices and complete interaction | PARTIAL |
| A08 | Catalogue layout and complete cart interaction | PARTIAL |
| A09 | Service catalogue and complete booking interaction | PARTIAL |
| A10 | About, Help and Business Supply flows | PASS |
| A11 | Public header, footer and navigation alignment | PASS |
| A12 | Light, dark and system appearance | PASS |
| A13 | No narrow viewport overflow, usable tablet layout | PASS |
| A14 | Accessibility, keyboard and focus | PARTIAL |
| A15 | Scope isolation for customer, staff and native | PASS |
| A16 | Frontend-only safety diff | PASS |
| A17 | Run frontend typecheck, tests and build | PASS |
| A18 | Before and after browser screenshots | PASS |
| A19 | Source-only rollback | PASS |
| A20 | Changes, results and release decision reported | PASS |

A14 has basic Chrome keyboard, focus and visual evidence. Cross-browser and screen-reader checks remain open. A15 compares customer, owner and excluded guest route widths and checks selector isolation in source. Driver, technician and native runtime testing was outside this frontend phase.

## Sign-in and registration

PUB-09 and gate A21 extend the same centred 1440px shell to both authentication pages, including the header and footer. Chrome verified widths of 1920, 1440, 768, 390 and 320px with no horizontal overflow. Hosted verification is pending. [Browser evidence](../public-width-1440/evidence/auth-browser.txt)
