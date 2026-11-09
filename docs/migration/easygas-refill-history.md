# Refill history and dormant customer eligibility

Existing consumption_profiles, refill_history, refills.ts and forecast.ts require linked, verified fulfilment history per cylinder. Source I×J establishes intended purchased mass only, not cylinder capacity, serial ownership, actual fulfilment date or actual gas consumption. The new two/three-refill preliminary low-confidence logic remains unchanged and receives no imported observations.

KeyInputs P uses18/30-day assumptions from B2/C2; Q uses10/14 from B3/C3. Source R tests `end user`, while the category is `End Users`;206 source rows encounter that mismatch. R275 contains#REF!, and R276 refers to A275 rather than A276. Source cached refill predictions are not verified dates or customer-declared frequencies. No source formula is repaired or executed, and these estimates are excluded from model training.

All282 source rows remain refillTrainingEligible=false. No real customer/cylinder matches are approved;0 profile/history rows are proposed for execution,0 reminders and0 loyalty awards. Multiple cylinders/same-day/partial fills/outliers/external refills require confirmed capacity and fulfilment linking before eligibility. Source feedback or marketing consent is absent.

Dormant state is UNKNOWN_DATA for every held row.74 name groups are not74 verified customers. No confident active/at-risk/dormant segmentation, win-back list or automatic campaign is produced from ambiguous matches and dates. Future segmentation must use actual verified customer events, configured thresholds, uncertainty and real contact consent.
