# Product UI consolidation — 10 November 2026

The source audit indexes every registered web route, all web TSX components and the four native shell entry points in [the audit](audit.md). The [requirements matrix](../traceability/product-ui-rtm.json) retains all 83 scope rows. Source review is not full visual acceptance.

Legacy operational screens now share readable workspace headings, card boundaries, responsive forms, full-width notes, inline checkboxes, theme-aware empty states and keyboard focus. Support has a search/status toolbar and a conversation list/detail layout. Notifications show an unread summary; campaigns separate optional creation/rewards tools from history. Operations, POS, credit, account, bundle, recommendation, policy, reconciliation and launch-readiness surfaces use the shared product treatment. Existing dedicated dashboard/inventory/dispatch/staff/technician/customer designs and grouped administration navigation are retained.

Approval row and owner-action buttons now read **Approve**, with **Approving…** while saving. The existing `approval.owner_apply` endpoint, `can_owner_apply`, identity verification, independent/qualified review rules and activation checks are unchanged. Existing demo requests were not approved during testing; current old requests do not expose an owner-approve action, so that conditional wording is covered by rendering/source and existing backend regression evidence rather than a fabricated live request.

## Executed verification

- Full regression at the main implementation point: 655 tests, 632 passed, 23 environment-dependent skips, zero failures. Skips remain unverified.
- Final focused regressions:15 passed,0 failed. Traceability validation:2 passed,0 failed. Web typecheck and production build passed.
- Local authenticated preview: support empty state/search/status, operations purchasing forms, campaign disclosure/history, bundles and credits initial states; approval listing checked read-only.
- 390×844 checks: support and operations remain within viewport (document width375 versus viewport390); operations forms collapse to one column.
- Dark-mode support check identified and corrected the old white empty-state background. Native binary builds were not performed.

## Limits and retained gates

The demo has no support tickets or bundles in this scope. Populated conversations, bundle configurations and all alternative role/modal states have not been visually accepted in this phase. Individual per-route visual acceptance stays open in the matrix; no 100% whole-app verification claim is made. Existing refresh warnings were observed when remote demo database responses exceeded the navigation timeout; count freshness warnings are preserved, not hidden.

No database/schema, financial value, stock, map provider, business request, permission or payment configuration was changed. No push/deployment is implied. Production **NO-GO**, retain-all policy, import hold and native-build deferral remain in effect.

User-authorised rollout: source5470003 is deployed to the existing client demo; [release evidence](../releases/20261110-ui-loader/report.md). Individual acceptance gaps above remain in scope.
