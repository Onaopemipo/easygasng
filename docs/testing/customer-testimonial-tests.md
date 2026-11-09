# Customer testimonial verification

Run `node --import tsx --test tests/testimonials.test.ts tests/request-origin.test.ts`. Executed evidence: `easygas-testimonials-20261030.txt` in this directory. Tests cover eligible/ineligible and duplicate submissions, ownership, unauthorized moderation/export, explicit consent, genuine one-star publication, material edits, withdrawal, immutable history, stale revisions, transactional notification failures, trusted-server permissions, independent settings approvals, unsafe editor content, bounded homepage reads, server pagination/search and CSV filters.

`TM-MEDIA-HTTP` calls the actual multipart upload and image GET handlers using an isolated in-memory database. It checks separate photo consent, disallowed file-format policy, private-before-public behavior, optimized WebP response, no-store and revoked anonymous access after withdrawal. Existing media tests continue to cover image validation and metadata handling.

Browser evidence: `easygas-homepage-browser-evidence.json`, `easygas-testimonial-carousel-browser.json`, `easygas-testimonial-management-browser.json` and the two testimonial screenshots. A real local UI cycle submitted a completed service, approved and separately published its one-star synthetic feedback, then withdrew it and verified that the public quote disappeared. A separate copied QA dataset tested four explicitly synthetic reviews (3+1 carousel pages), next/previous, theme-state preservation, owner search/filtering and a six-line CSV download. All four carousel fixtures were subsequently withdrawn; no synthetic testimonial was inserted in the normal local database.

The production PostgreSQL multi-connection gate remains BLOCKED. Actual email/SMS providers and public commercial deployment were not invoked.

The existing identity-verified personal-data export now includes only owned testimonial versions and consent/events. Completed purchase/service entry links prioritize the owned transaction (including an older transaction) without trusting client ownership. First-name/initial preferences do not require an irrelevant custom-name field. The embedded account section shows 100 recent submissions; the full version/consent history is available through the existing verified data export. `TM-ENTRY` and `TM-EXPORT` cover ownership and identity checks.

JSON and multipart endpoints share the existing request-origin policy: same-port loopback aliases are accepted only in development; production requires its configured exact origin. `ORIGIN-01`, `ORIGIN-02` and the actual upload handler checks verify the rule.

Prepared real concurrency suite: `tests/testimonial-postgres.test.ts` (`TM-PG`). It refuses non-loopback/non-easygas_test targets or an active DATABASE_URL and requires explicit local-test enablement. Its environment skip is evidence of an open gate, not a pass.

Final full suite: 206 tests, 203 passed, zero failed, 3 PostgreSQL environment skips. The phase-specific combined suite contains 16 successful local checks (testimonial and origin tests), and the theme/dependency/rollback suite contains eight. These subset totals overlap the full suite and are not added to it.
