# Customer mobile dependency and blocker register

| ID | Severity | Affected capability | Cause / restriction | Owner / next step | Independent work |
|---|---|---|---|---|---|
| CUI-B01 | P1 | Checkout | Business quantity policy, stock/cylinder confirmations not approved in demo; no ordering bypass | Business owner: configure through existing governed workflow | UI/isolated validation continues |
| CUI-B02 | P1 | Paystack/provider receipts | No approved merchant credentials/verified sandbox; provider stays disabled | Merchant owner/integration: approved sandbox then webhook/amount/environment acceptance | Invoice reads/private PDFs and other customer flows continue |
| CUI-B03 | P1 | SMS/official WhatsApp/push | Live provider configuration/consent/template certification absent | Provider owner: configure and certify delivery paths | In-app notifications/preferences remain functional |
| CUI-B04 | P2 | Native acceptance | Populated qualified fixtures, full iOS/Android physical-device/accessibility/system/lifecycle cases not executed | Engineering/QA: execute retained T01–T54; pending work, not an external blocker | Existing automated/isolated tests passed |
| CUI-B05 | P2 | Cylinder-specific history/plan | Canonical consumption/refill plans are product-linked; no safe same-size physical-cylinder attribution in current model | Business/domain design: approve canonical linkage before extension; no duplicate profiles or inferred serial history | Owned physical list and current reminders work |
| CUI-B06 | P0 inherited | Doorstep/vehicle stock/finance completion | Earlier operations matrices retain unfinished authoritative commitment/reconciliation; no cosmetic closure | Existing operations owners: close original requirements/tests | Unrelated safe customer views continue |
| CUI-B07 | P1 | Commercial release | Existing hosting, signed release and independent launch gates remain NO-GO | Release owner: separate approval/certification | Local-only work permitted |

Exact visual fidelity across all twelve populated screens, native private PDF handover and complete semantic theme/device review remain engineering/QA tasks. They are not reclassified as credential blockers. No requirements dropped; no actual import approved.
