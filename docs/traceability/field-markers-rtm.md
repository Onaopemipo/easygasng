# Required and optional field labels

Source: user request to mark compulsory and optional fields throughout EasyGas, especially during approvals and configuration. This is a presentation change. Existing validation, approval authority, and business records are still the source of truth. The commercial production NO-GO is unchanged.

| Requirement | Scope and authoritative rule | Verification | Status |
| --- | --- | --- | --- |
| FIELD-MARK-01 | Admin settings and approval review: required value and reason where applicable, optional scheduling and drafts, and decision-specific comments; existing setting schemas and governance decisions | Authenticated Chromium at 1440px and 390px. Blank proposal reason remained invalid; date and draft displayed “(optional)”; draft checkbox stayed before its label. In dark mode, blank rejection was refused and the review explained when a reason was needed. Settings and governance regression checks passed. | Verified complete for the tested flows; rarer settings and approval states are included in FIELD-MARK-02. |
| FIELD-MARK-02 | Other web forms: shared workflow form definitions and field-specific rules for customer, catalogue, service, inventory, finance and operations forms | Browser sign-in succeeded with the updated labels. Web type check, local preview build and focused rendering/checkout/authorization regressions passed. | Partial verification: data-dependent dialogs and conditional fields across all roles were not opened individually. |
| FIELD-MARK-03 | Native forms: shared workflows and direct fields follow existing API contracts on the customer, driver, technician and staff screens | Mobile type check and existing form-contrast checks passed. | Implemented, unverified in installed apps. |
| FIELD-MARK-04 | Accessible and responsive labels: retain the control association, include required status in the accessible label, and preserve checkbox placement | Confirmed the label text and control association in Chromium, and no horizontal overflow in a 390px settings dialog. Checked dark approval review. | Partial verification: assistive technology and installed-device checks remain open. |

Implementation coverage: 4/4 requirement groups have source changes. Verification coverage: 1/4 groups fully verified in their stated scope, 2/4 partially verified, 1/4 without runtime verification. Critical approval/authorization regression gate: 1/1 passed. Route and workspace coverage: source was checked across web form components and native input call sites. Direct browser checks covered the three named routes (sign-in, settings and approvals); no installed native workspace or full route sweep was executed. Gate coverage: 1/4 passed, 2/4 partial, 1/4 pending. All four requirements and gates remain in scope.

Verification: 34 focused automated tests passed across settings dates and money, settings cleanup, sign-in, checkout, form contrast, approval pagination, governed approvals, gas-order controls, and shared operational form rendering. Web and mobile type checks and the web preview build passed. Browser fixtures used a separate local database; the negative approval test made no decision.

Change log: Added visual and accessible markers to shared and standalone forms. Added contextual help where checkout or a review action has additional prerequisites. Search, filter and read-only controls retain their existing labels. No migration, package upgrade, native build or deployment was made in this phase.

[Machine-readable matrix](field-markers-rtm.json)
