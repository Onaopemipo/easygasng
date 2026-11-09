# CI repair — 9 November2026

Original run42577799260:533web tests,530pass/3fail. Native types passed; moderate dependency audit failed. Both requirements remain in denominator.

| ID | Requirement | Implementation/security | Executed evidence | Gate/status |
|---|---|---|---|---|
| CI-01 | Restore Linux regression validation | Review the approved invoice-snapshot hash explicitly without replacing historical baseline; select PostgreSQL tools from PATH; install mobile dependencies needed by crypto regression. Financial and security assertions retained. | Focused2/2 and real PostgreSQL restore/security2/2 pass; see JSON files/evidence mapping. | PARTIAL: hosted rerun pending |
| CI-02 | Fix mobile dependency audit | Lock glob14.0.4/minimatch11.0.5 overrides; keep Expo58 and all audit thresholds. | Audit0 vulnerabilities; mobile types and Expo public configuration pass. No build/export. | PARTIAL: hosted rerun pending |

Sources: downloaded GitHub artifact13655459158 (original-failures.txt); npm audit report; official Expo issue https://github.com/expo/expo/issues/52735 and advisories GHSA-3g3m-2fjr-6pw4 / GHSA-g3hv-75wg-m249. Overrides cross transitive major versions, so config/typechecks and hosted CI are required; native/device acceptance remains deferred. No Expo downgrade or audit suppression. Existing production NO-GO and broader acceptance gates remain.
