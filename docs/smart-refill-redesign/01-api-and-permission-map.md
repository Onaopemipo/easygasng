# Smart Refill API and permissions

| Action | Records | Controls |
| --- | --- | --- |
| `refill.profiles` | Consumption profiles, verified deliveries, supply reports, current forecast and reminder state | Session customer ID selects rows. Customer or commercial role required. Supply history includes the latest ten reports. |
| `refill.profile.create` | Existing gas refill product and consumption profile | Validated label, product, household size and cooking days. Active same-size duplicate is rejected. Creation is audited. |
| `refill.feedback` | Owned active profile and prior supply reports | Strict supply enum, optional expected report ID, locked active profile, one-hour cooldown and audit. Snoozing and reporting an external refill can acknowledge related reminders. |
| `rewards.smart-offers` | Approved branch policy, active offer, current profile forecast, consent, claim history and budget | Existing read checks and separate checkout validation. |
| `catalogue` | Published catalogue source and refill product definitions | Existing catalogue access and product validation. |
| `orders?id=…` | Existing order detail for verified refill | The order destination rechecks session ownership. |

The client has no new endpoint or schema. Profile activity projects existing dated records. The forecast displayed on the profile is the current algorithmic result, and there is no history of calculated estimates.
