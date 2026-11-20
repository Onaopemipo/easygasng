# Admin Settings: current navigation and configuration guide

Open **Admin → Settings**. The nine categories below replace the previous 17 displayed categories. Your role may see fewer categories or controls. The audit covered all 77 settings visible to the Admin, including the six payment settings consolidated earlier. Every setting is retained; old names and keys remain searchable.

| Category | What belongs here | Key distinction |
| --- | --- | --- |
| Business & Website | Branch opening hours, invoice/receipt business details, homepage/public contacts and review publication rules | Financial document identity is separate from public website contacts. Existing issued documents keep their snapshots. |
| Policies & Terms | Delivery, refunds, cancellations, service booking/warranty, rewards/wallet terms, privacy and general terms | Publishing policy wording does not configure operational fees, availability or approval safeguards. |
| Gas & Products | Current per-kg gas price and quantity/cylinder rules; refill visibility; equipment prices and storefront visibility | A selling price and visibility are separate controls. Old fixed refill prices are in a collapsed legacy section. |
| Delivery & Dispatch | Accepting orders, coverage locations, delivery windows/capacity, customer delivery fees, internal dispatch estimates and recurring COD orders | Customer delivery charges are separate from internal route-cost estimates. Named coverage still requires actual-address checks. |
| Services & Safety | Service offerings and qualified safety checklists | Offering description/price/availability is separate from required inspection steps. Qualified activation checks remain. |
| Payments & Wallet | Online payments/fees, wallet access, cash/bank funding limits, COD and settlement details | Card top-up limits are separate from cash/bank-transfer wallet limits. [Detailed payment guide](payment-settings-organisation.md). |
| Rewards & Retention | EasyRewards programme, evidenced points adjustments, referral reviews and retention/win-back campaign rules | Current points economics live in EasyRewards programme. Old reward fields are historical controls. Message consent and technical sending/issuance flags remain separate. |
| Stock & Valuation | Stock valuation method | This configures valuation of existing movements; it does not alter stock counts or selling prices. Missing costs remain unavailable. |
| Staff & Security | Existing staff role/branch assignment and locked approval safeguards | Permission changes stay protected. Approval safeguards is read-only in this release. |

## Finding a control

Choose a category to browse its purpose sections. Search accepts the current name, the previous name/category or the stable setting key. For example, **Gas Pricing** finds the consolidated gas/product controls, **Delivery windows** finds **Bookable delivery windows**, and **EasyRewards policy** finds **EasyRewards programme**. Search results include the category and purpose section. Choose a category again to clear a search.

**Legacy coverage list**, **Legacy refill prices**, **Legacy rewards controls** and the payment **Advanced controls** start collapsed. A matching search opens them. They remain available for compatibility and history; they do not replace the current programme, gas or coverage controls.

## Common configuration tasks

1. **Change new gas pricing:** Gas & Products → Gas pricing & quantities → Gas selling price per kg. Use the current price control, and configure permitted quantities/cylinder sizes separately. Legacy fixed refill prices remain historical.
2. **Change delivery availability:** Delivery & Dispatch → Order availability. Check location boundaries, actual address coverage, stock, prices, delivery windows and capacity before requesting activation. Flat customer delivery fee is under Customer delivery charges; dispatch estimates have their own section.
3. **Configure rewards:** Rewards & Retention → EasyRewards programme. Its Points / Services / Offers editor retains the current rules. Earning/redemption/referrals still require an activated approved policy and applicable technical flags. Legacy earning/rate fields do not enable the current engine; a historical conversion rate does not authorise points-to-wallet transfers.
4. **Update service offerings or safety steps:** Services & Safety → Service offerings or Safety checklists. Keep commercial configuration and qualified inspection steps separate. Owner approval does not substitute for required qualified safety activation.
5. **Update public or document details:** Business & Website → Public website or Business identity. Homepage/public contacts and invoice/receipt identity have distinct uses. Only new financial documents use a newly approved identity; issued documents retain their original details. The existing unapproved-identity fallback remains.
6. **Change staff access:** Staff & Security → Staff roles & branch access. Select an existing eligible account and branch using the protected editor. Self-promotion is prohibited; existing role, identity and approval checks apply.

## Reviewing changes

Each card keeps its active value, version, history and existing role-based actions. **Edit Setting** or **Propose Change** opens the same typed editor under the clearer title. Add a reason, review the values/timing, and use the separate final action to confirm. Optional scheduling uses Lagos time. **Save draft** requires its own review and final confirmation; a draft remains inactive. Identity confirmation appears when requested by the server. See the [editor guide](settings-change-update.md).

A control without an edit action may be view-only for your role or locked by policy. Renaming/grouping grants no new authority. A version conflict requires refreshing and reviewing the current configuration before retrying. Closing an edited form protects unsaved changes.

To test navigation safely, browse/search, open the editor and history, then close without submitting. Use disposable synthetic data for saving or approval acceptance tests. No financial, safety, policy or messaging setting was activated by this navigation release.

[Complete audit and 77-setting mapping](../admin-settings-audit/AUDIT.md) · [Traceability](../traceability/admin-settings-audit-rtm.md). This current guide supersedes earlier category names in historical screenshots and PDF/Word editions; those editions have not been regenerated. Production NO-GO and unrelated acceptance gates remain unchanged.
