-- Keep measured custody recovery distinct from generic stock adjustments.
-- No opening quantities, balances, measurements or approvals are created.
ALTER TABLE inventory_operations DROP CONSTRAINT inventory_operations_kind_check;
ALTER TABLE inventory_operations ADD CONSTRAINT inventory_operations_kind_check
 CHECK(kind IN ('adjustment','stocktake','quarantine','return_release','threshold','purchase','transfer','expense','expense_reversal','hold_disposition','bulk_return_recovery'));
