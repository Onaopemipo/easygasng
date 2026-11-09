# Refill predictions and reminders

Estimates use owned refill-size profiles and independently verified delivered single-cylinder purchases. The corrected source date is `orders.delivered_at`, falling back to the earliest persisted delivered event. Payment verification time is no longer treated as physical refill time. Existing immutable history rows are interpreted using the proven order fulfilment date; history without proven fulfilment is excluded rather than assigned a fictional date.

The shared weighted-interval estimator reports insufficient data honestly and does not claim a sensor measurement. Customer feedback is persisted. Existing maintenance recomputes eligible histories and applies consent, Africa/Lagos quiet hours and deduplication to in-app reminders. Explicit recurring COD authorisation is separate from a reminder and remains bounded by customer quantity/address/window/maximum total and revocation.

Still incomplete: exact physical-cylinder attribution, multi-quantity/POS/external-refill ingestion, feedback-adaptive model updates, model/version history, measured calibration/confidence, stale-notification cancellation, conversion attribution and branch demand forecasting. A profile named after a cylinder is not a QR cylinder passport. No demand, remaining-gas percentage or commercial value has been invented to populate the UI.
