# Security and financial integrity

The UI sends the selected location and gas lines to the existing quote action. Confirmation uses server price, fee and policy versions and the existing idempotency key. Input changes invalidate the visible quote and delayed responses for superseded inputs are discarded. The synchronous web request lock stops duplicate clicks from submitting twice.

Browser testing used a disposable database and a synthetic COD order. The pending area was blocked before quotation, and two immediate confirmation clicks issued one checkout request. PostgreSQL regression included branch and coverage denial, stale prices, stock reservation, concurrent retries, custody, payment verification and independent approvals.
