# Google Analytics via Google Tag Manager

Configured public IDs: **GTM-KLJ8FM96** → **G-8Y34NXQMMK**. The published Google container already contains that GA4 destination and page-view/enhanced-measurement configuration. The application loads the container once; it does not install a second Google tag or emit duplicate manual page views. [Published-container inspection](evidence/published-container.json).

## Client demo release

[Stable demo](https://easygas-client-demo.vercel.app) runs source `2eb4e17402b3be8a27e2416fd02ab32159710b01`, Ready deployment `dpl_3FENKwC96aryhXzA76q45pAv4heM`.450 uploaded files exactly match archived Git source; no environment files, local data or build artifacts were uploaded. A CLI log-stream fetch failure was resolved by authoritative API readback of the same Ready candidate before promotion; no duplicate deployment was made. [Source integrity](evidence/source-integrity.json), [Ready identity](evidence/stable-identity.json), [recovery record](evidence/candidate-recovery.json).

Fallback baseline before this phase: source `8e0e5843e6989792f16a38971b02e22ee702ac0e`, deployment `dpl_Bj5pEYpjY4wToJ9sNFo7a5x7MyE2`. No git push, native build or commercial production launch performed.

## Behaviour

- Optional analytics loads only after **Allow analytics**. **Essential only** loads no Google script. Preferences persist locally and can be changed with **Cookie settings** at the bottom of an eligible public page.
- Server-side session-cookie detection excludes signed-in sessions. A fixed public route allowlist excludes account, administration, login, checkout, ordering, support and tracking workflows. URLs with any query string or fragment are excluded, including search, payment, invitation and recovery parameters.
- After a document enters an excluded surface, it stays untracked until a fresh server request rechecks the session. While the Google container is active, shared links and public programmatic navigation load a new document; Google listeners therefore cannot remain active in private workspaces. Untracked workspaces retain existing client navigation.
- Withdrawal disables the GA4 stream, removes this integration's analytics cookies and reloads the document to discard listeners. Cross-tab preference/authentication changes and restored cached documents recheck the tracking boundary.
- `analytics_storage` is granted only following explicit permission. `ad_storage`, `ad_user_data` and `ad_personalization` remain denied; Google Signals, enhanced conversions and advertising personalisation are disabled in the site's Google settings. `user_data` is an empty object. No application user IDs, orders, contact details, wallet values or purchase events are pushed.
- Page location contains only the eligible public origin/path. Referrers and URL query/fragment values are omitted. This bounded integration does not implement campaign attribution, ecommerce conversion events or signed-in product analytics.
- The remote container currently enables automatic history/form/contact features. Its ownership/settings remain in the user's Google account. Consent, the empty user-data setting and document isolation apply site-side; this phase does not claim to have edited or independently audited every remote collection feature. Review remote settings before expanding the allowed scope.

No unconditional noscript iframe is installed: it would bypass the visitor's analytics choice. Users without JavaScript retain essential services without tracking.

## Configuration and rollback

`EASYGAS_ANALYTICS_ENABLED=false` disables the integration, including its preference controls, on the next build/deployment. Production defaults on; development and Vercel preview default off. Explicit `true` enables local/preview verification. IDs are public constants in `packages/business-rules/src/analytics.ts`; there are no analytics secrets or database migrations.

The client demo is the deployment target for this phase. Existing commercial production **NO-GO**, import hold, data retention, consent for messaging/delivery proof and financial/security controls remain unchanged. Analytics permission is independent of marketing messages and customer/service permissions.

## Verification and reporting boundary

Local analytics/navigation/order-modal/customer-order regression:27 passed,0 failed/skipped. Hosted browser evidence validation:1/1 passed; normal product business preservation:1/1 passed, with all13 orders, ledger, inventory, gas and QA wallet unchanged. The initial mobile Cookie settings overlap was corrected and actual390px grant/withdrawal retested successfully. Production web build and TypeScript pass. Actual browser checks cover essential-only, grant, private navigation and hosted withdrawal/query/session exclusion; detailed observations accompany the matrix.

The initial implementation phase verified tag execution but left receiver/reporting evidence open. The19November2026 continuation used the existing authenticated Google Analytics account UI to confirm receiver receipt, preserving that earlier checkpoint in the matrix change log.

**Realtime receipt confirmed:** account `416957612` (Easygas Nigeria), property `565150618` (EasyGasNg), stream `16373512765`, measurement `G-8Y34NXQMMK`. After a fresh signed-out demo consent grant at10:59:04 UTC and actual `/privacy` navigation, Realtime page views increased8→10. The received `page_view` → `page_location` table explicitly lists `https://easygas-client-demo.vercel.app/privacy` with1event; Realtime pages shows `/privacy` with1view and5active users overall. Stream identity was independently read from the same property. The old setup/48-hour warning was still stale; acceptance uses actual Realtime receipt.

The matrix now retains4/4 implemented and verified requirements,2/2critical verified,4/4gates passed and0exclusions. The browser test preference was restored to Essential only and0GTM scripts. No injected events, measurement-protocol replay, tag/filter/stream/code change, deployment or business mutation was needed. Processed longer-period reports, ecommerce, advertising and wider production acceptance remain outside this bounded gate.

[Realtime verification report](REALTIME-VERIFICATION.md) · [Receiver evidence](evidence/ga4-realtime-confirmation.json) · [Receiver validation](evidence/ga4-realtime-validation.txt) · [Regression log](evidence/regression.txt) · [Browser observations](evidence/browser-checks.json) · [Business readback](evidence/hosted-business.txt).

## Sources

Implementation follows Google's [basic consent mode](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic), [configuration parameters](https://developers.google.com/analytics/devguides/collection/ga4/reference/config), [page-view behaviour](https://developers.google.com/analytics/devguides/collection/ga4/views?technology=websites), and [user-provided data configuration](https://storage.googleapis.com/support-kms-prod/7FSlqLOEVPtGnVj0Li8vy69ElGeKAL5dEI4l). Installed Next.js documentation for Script, Link/onNavigate and async cookies was read before implementation.

[Traceability matrix](../traceability/google-analytics-rtm.md) · [Machine matrix](../traceability/google-analytics-rtm.json).
