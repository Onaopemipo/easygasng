# Intelligent refill prediction audit

**Status: PARTIALLY IMPLEMENTED, with confirmed ingestion defect F05.** This is an adaptive interval estimate, not a sensor reading, not a calibrated demand forecast and not a complete physical-cylinder model.

## Data and algorithm trace

`lib/refills.ts:13` loads owned consumption_profiles, lazily ingests eligible purchases, loads immutable refill_history and calls shared `packages/business-rules/src/forecast.ts:7`. Maintenance repeats ingestion and forecasting (`refills.ts:305`). Only delivered + verified payments and quantity-one matching product qualify. Profiles group customer+product; active duplicate size is rejected (`:64`). Different sizes may coexist; two same-size physical cylinders cannot be represented. Household size/cooking days are stored but do not influence the mathematical forecast. Feedback is stored/throttled, returned to UI, but not used to reset or fit the forecast.

Algorithm filters to verified matching cylinderId, positive kg, dates <= now; requires three records; calculates intervals, accepts only 3–180 days, uses median-window filtering (0.4–2× median), computes increasingly weighted recent intervals, derives nextDate/remaining percent and a variability-based confidence label. High confidence needs >=5 accepted intervals and variability<0.2; otherwise available estimates are labelled medium. No fitted error model or accuracy calibration exists. With two intervals [20,75] the upper-middle median is 75, so the 20-day interval can be discarded and a 75-day estimate returned with medium confidence; see irregular audit case. This demonstrates a confidence/robustness limitation, not a measured accuracy benchmark.

The kg field is checked positive but quantities are not normalized; recorded size does not rescale intervals. UI says estimate/not measurement. No historical forecast snapshot table, model version, error observation, reminder-to-order attribution or cohort accuracy report was found. refill_history stores source events, not historical predictions.

## Mandatory cases

| Case | Executed evidence / actual result | Missing work |
|---|---|---|
| No history | Audit probe none; unavailable/low; no invented percentage | Maintain honest empty state |
| One purchase | Audit probe one; unavailable/low | Optional explicit rough estimate must remain separate and justified |
| Regular purchases | Audit probe [60,40,20] days before 29 Oct; due that day, 0%, medium | Calibrate against actual outcomes |
| Irregular purchases | Audit probe [100,80,5]; 93%, 70 days left, medium despite sparse/irregular sample | Robust confidence/sample sufficiency/outlier validation |
| Multiple cylinders | Utility excludes other cylinder IDs in probe; live API rejects second active same-size profile | Physical IDs, attribution and multi-quantity orders |
| Earlier than forecast | Added 1-day-ago record; estimate changes to 19 days left, 95% | Full delivered early-refill reminder lifecycle acceptance |
| Refills elsewhere | Not representable as verified refill input; feedback only still_available/low/empty | Attested external event policy and obsolete-reminder reset |
| Disables reminders | Preferences stored in `accounts.ts`; `refills.ts:283` skips disabled user. Ownership preference test passed; no dedicated reminder-disable E2E executed | Add exact due-reminder off/on regression |
| Obsolete scheduled reminder | No cancellation/replacement of already-issued notifications; schedule dedupe key binds schedule/date | Link notifications to qualifying history and invalidate stale reminders |
| Unusually long interval | Audit probe intervals 200 days; unavailable/low | Category-specific validated thresholds instead of silent fixed cutoff |

Seven deterministic utility cases ran in the audit probe. The remaining cases are explicitly source-inspected gaps, not passed tests. `platform.test.ts:652` and `workflows.test.ts:350` passed for existing boundary/ownership cases. F05 additionally proves payment timestamps are ingested as refill dates; fix this before claiming refill timing accuracy.

## Automation and customer retention

`refills.ts:257–340` uses Lagos hour/day, default reminders enabled and quiet window 21–08; job_deliveries keys dedupe planned dates and one forecast notification per profile/day. Once overdue, a forecast can notify on every subsequent eligible day; there is no configurable frequency cap/escalation or conversion-aware cessation. A fresh qualifying refill changes live estimates but does not cancel existing notifications. An opted-out user is skipped, but external channel unsubscribe/delivery is not implemented. All notifications here are **in-app inserts**.

Reminder scheduling uses CURRENT_DATE in some SQL and Lagos dates elsewhere. Hosting/database timezone is unspecified; validate midnight boundaries and reconcile scheduled dates under deployed settings. User-selected schedules do not become purchases unless separately authorised; recurring COD has a consent/ceiling mechanism in scheduling.ts. That is separate from prediction.

## Acceptance required

Use fulfilment time with immutable provenance and replay-safe backfill; support physical cylinder/external refill attribution; store forecast version/history/confidence reasons; add all ten lifecycle cases; add stale-reminder cancellation/quiet/opt-out/frequency tests; then compare forecast error and reminder conversion on consented observed outcomes. Forecasts must not drive autonomous stock purchases until calibrated; humans should review any demand recommendation. Owner: forecasting/product lead with operations validation. No claims of retention gains, predictive accuracy or sensor-level measurement are supported.
