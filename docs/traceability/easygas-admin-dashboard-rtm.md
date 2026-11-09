# Admin dashboard requirements traceability

Production **NO-GO unchanged**.20 stable requirements/20 gates retained;5 bounded gates verified,15 partial.29/29 owner routes render; this does not certify29 business workflows.56 scenarios retained,2 genuinely inapplicable (multi-role switch and new schema migration). See machine-readable easygas-admin-dashboard-rtm.json for actual files, sources, security controls, named tests, executed evidence and remaining work; see ../testing/easygas-admin-dashboard-verification.md for scenario scope.

| Requirement / gate | Requirement | Status | Gate |
|---|---|---|---|
| ADM-01 / AD-01 | Repository preflight, baseline and source mapping | VERIFIED_COMPLETE | PASS |
| ADM-02 / AD-02 | Shared sign-in and post-auth permissions | VERIFIED_COMPLETE | PASS |
| ADM-03 / AD-03 | Server role/branch/data isolation | VERIFIED_COMPLETE | PASS |
| ADM-04 / AD-04 | All grouped routes mapped and navigable | VERIFIED_COMPLETE | PASS |
| ADM-05 / AD-05 | Approved visual shell and responsive layouts | PARTIAL | PARTIAL |
| ADM-06 / AD-06 | Light/dark/system and accessibility | PARTIAL | PARTIAL |
| ADM-07 / AD-07 | Canonical scoped dashboard KPIs | PARTIAL | PARTIAL |
| ADM-08 / AD-08 | Trend/status/operations/recent orders | PARTIAL | PARTIAL |
| ADM-09 / AD-09 | Search, notifications and quick actions | PARTIAL | PARTIAL |
| ADM-10 / AD-10 | Orders/POS/customer/support regressions | PARTIAL | PARTIAL |
| ADM-11 / AD-11 | Products/stock/cylinder/bundle regressions | PARTIAL | PARTIAL |
| ADM-12 / AD-12 | Delivery/technician/booking/quote regressions | PARTIAL | PARTIAL |
| ADM-13 / AD-13 | Finance/payment/reconciliation/refund regressions | PARTIAL | PARTIAL |
| ADM-14 / AD-14 | Growth/testimonial regressions | PARTIAL | PARTIAL |
| ADM-15 / AD-15 | Governance/staff/approval/settings regressions | PARTIAL | PARTIAL |
| ADM-16 / AD-16 | Existing P0 safety restrictions | PARTIAL | PARTIAL |
| ADM-17 / AD-17 | Migration compatibility and rollback | PARTIAL | PARTIAL |
| ADM-18 / AD-18 | Performance/resilience/accessibility/security | PARTIAL | PARTIAL |
| ADM-19 / AD-19 | Cross-client compatibility | PARTIAL | PARTIAL |
| ADM-20 / AD-20 | Documentation and honest release decision | VERIFIED_COMPLETE | PASS |

Scope change: user correction removes pictured role selection. Actual registry preserves29 routes including existing testimonials, rather than deleting routes to match the illustrated count. Effective role remains canonical; no arbitrary role switch. Revenue is explicitly verified net receipts; no fake growth percentages. Supporting modules and field/customer experiences retained. No new migration, imported data or release decision.
