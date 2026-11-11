# Credits & Refunds traceability

| ID | Requirement | Source and implementation | Controls and evidence | Status |
| --- | --- | --- | --- | --- |
| CR-R01 | Customer lookup and credit intake | Existing credit.customers and credit.request in commerce.ts, customer selector and shared modal in workflows.tsx | Branch-scoped active customer selection, existing identity verification and receipt reference checks | Implemented on web. Browser and native acceptance open. |
| CR-R02 | Scoped summary and request history | credits workspace view in commerce.ts and CreditManagement in workflows.tsx | Server branch and role scope, stable request pagination, exact minor-unit totals, approved wallet credits separate from pending requests. Commerce pagination and role regression. | Implemented on web. Date filtering and export open. |
| CR-R03 | Independent review and once-only wallet posting | Existing credit.decide and wallet_entries in commerce.ts | Maker excluded from decision UI. Existing server lock, identity verification, maker/checker and replay checks remain authoritative. Commerce regressions. | Existing workflow retained. Hosted acceptance open. |
| CR-R04 | Provider refund initiation, settlement and reconciliation | Existing provider guard in commerce.ts and payment infrastructure | Provider-funded requests cannot use the purchase-credit approval path. Existing orders, Paystack, POS, invoices and inventory retain their current contracts. | Provider implementation and sandbox reconciliation open. |
| CR-R05 | Native and release verification | Existing customer credits API remains an array. Staff-only workspace view is additive. | Production NO-GO remains. No schema changes. Web rollback is an application revert. | Native screens, browser screenshots, accessibility and restore evidence open. |

All acceptance gates in the supplied specification remain in scope. This phase delivers the web workspace and preserves the existing financial mutation contracts.

Web typecheck passed. All 11 commerce tests passed, including scoped pagination, maker separation and existing wallet replay checks. [Regression results](regression.txt).
