# Dashboard metric visibility

| Requirement | Acceptance | Status |
| --- | --- | --- |
| ADM-METRIC-ACCESS-01 | Finance sees permitted data. Active customers, its definition and restricted delivery rows are hidden. An authorised owner sees the actual count and the Customers link. | Verified locally |
| ADM-METRIC-ACCESS-02 | A confirmed zero displays as zero. A failed read shows a compact state and points to Refresh. A successful refresh restores the count. | Verified locally |

Executed against an isolated synthetic database on 16 November 2026. TypeScript and nine dashboard regressions passed, including server-side Finance scope, legitimate zero and isolated widget failures. Signed-in Chromium checks covered Finance at 1440px and 390px, plus Business Owner data and refresh. The browser used a controlled response for the empty and failed-read UI cases and the original API for the initial count and successful retry.

Local implementation and verification cover both requirements and gates on `/admin`. Hosted verification follows deployment. [Machine-readable mapping](admin-dashboard-metric-access-rtm.json).
