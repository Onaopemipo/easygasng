-- Extend the existing independently approved credit requests; no separate wallet.
ALTER TABLE credit_requests DROP CONSTRAINT credit_requests_kind_check;
ALTER TABLE credit_requests ADD CONSTRAINT credit_requests_kind_check CHECK(kind IN ('cash_funding','refund','bank_transfer'));
ALTER TABLE credit_requests ADD COLUMN funding_details jsonb;
