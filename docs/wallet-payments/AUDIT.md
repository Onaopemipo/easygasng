# Wallet & Payments editor audit

The attachments show the earlier generic dialog: a full raw policy dump before the editable fields, duplicated sandbox/approval explanations, kobo and basis-point inputs, a large channel fieldset, a fee fieldset containing everything, scheduling/draft controls in the main stack and a second password action near the bottom.

The deployed settings-shell phase already replaced that wrapper with a specific title, Checkout / Fees / Wallet / Review, fixed actions, one scroll region, optional scheduling and conditional verification. This phase refines the payment-specific content: compact channel and switch rows; concise sandbox status; wrapped approval reference; exact naira/percentage inputs; core fees separated from advanced limits/rounding/quote duration; wallet limits grouped clearly; readable review of actual differences and a non-binding calculation example using the existing quote algorithm.

All stored kobo, basis-point, enum, null-cap and version values must round-trip unchanged until explicitly edited. Hidden advanced inputs must still validate and reveal their tab/disclosure on errors. No duplicate field instances or submission from entering Review. Keep sandbox-only schema, current approval and identity rules, private server secrets and provider activation controls. Do not modify balances, live/sandbox flags or approved rates on the hosted demo during verification.

Local browser writes use an isolated synthetic database. Hosted verification is read-only aside from dedicated session login/logout. Deployment follows the ongoing client-demo authorisation. Production NO-GO, actual-import hold, retain-all and all unrelated native/provider/operational gates remain. No mobile build/export/install.
