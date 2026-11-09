# Role permissions

| Role | Allowed | Denied |
|---|---|---|
| Customer/commercial | Own issued invoice, eligible approved service quote, own approved wallet funding; own status/receipt | Other customers, fee policy changes, ledger writes, cashout/transfer |
| Owner | Existing independent fee approval/proposal; global finance report; receipts | Self-approval; secret retrieval through browser; marking provider success from screenshot |
| Finance | Existing branch fee proposal/approval, branch reports/receipts | Other branch unless existing authority; bypassing approval; manual refund of provider-funded payment |
| Manager/sales/support | Existing scoped ordering/customer support | New Paystack finance/receipt privilege or impersonation |
| Driver | Existing assigned delivery and amendment request scope | Customer payment APIs; setting prices; unverified extra fulfilment |
| Technician | Existing assigned service/assessment scope | Customer payment APIs; bypassing backend quotation/payment work authority |
| Worker | Durable inbox + provider verification + atomic authorised posting | Creating another charge on timeout; pretending refund/settlement succeeded |
| Anonymous | Nonsecret configuration; authenticated raw provider webhook only | Payment/receipt/customer/finance records |

Existing role-specific mobile navigation and shared sign-in preserved. No role-selection step introduced. Negative tests cover own-customer/driver/signature; whole role/branch permission matrix acceptance remains incomplete.
