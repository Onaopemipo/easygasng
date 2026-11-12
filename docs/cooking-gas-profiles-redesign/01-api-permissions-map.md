# API and permissions

| Action | Authoritative source | Access and behaviour |
| --- | --- | --- |
| `refill.profiles` | `consumption_profiles`, product size, verified delivered orders, refill history and supply reports | Signed-in customer or commercial account. Reads by session customer ID. Existing estimate and reminder rules apply. Capacity and the latest report identifier are returned as additive fields. |
| `refill.profile.create` | Refill products and consumption profiles | Signed-in customer or commercial account. Validates the refill product, profile name, people served and cooking days. Serialises duplicate checks per customer and writes the existing audit event. |
| `refill.feedback` | Supply reports for the owned active profile | Row lock, existing one-hour throttle and optional expected-report ID. A stale save receives 409. A profile belonging to another customer receives 404. Success returns the inserted report. Older clients can omit the ID and keep the original throttled behaviour. |
| `catalogue` | Existing gas refill products | Same catalogue route and availability policy. |
| `rewards.smart-offers` | Approved branch rewards policy, current offer lifecycle, verified history and communication preferences | Eligibility and offer redemption follow the existing server rules. |
| `schedules` and `schedule.authorisations` | The customer’s refill schedules and recurring authorisations | Count unique schedules where both the schedule and its authorisation are active. |

The existing HTTP dispatcher applies origin and JSON body checks to writes. Native uses the existing bearer session and web uses the existing session cookie. No new route or schema migration is required.
