# Migrations and compatibility

No schema migration or hosted data import in this continuation. Existing canonical records, IDs, invoice/payment history, stock ledgers, staff identities and routes remain. Qualification verification/revocation retains existing audit history.

Intentional safety change: disabled assignment availability now prevents NEW service reservation/slot creation, consistently with the approved specification. Existing slot and booking history remains; active work gates remain separate. Fixture technicians explicitly opt into availability in isolated test setup. The historic overlapping-slot regression seeds legacy overlapping rows directly and still tests that competing customers cannot reserve both; new creation now rejects overlap earlier.

`NEXT_PUBLIC_EASYGAS_TECHNICIANS_UI=legacy` selects the retained old workspace on rebuild as a presentation rollback. It does not disable server safety checks. No original route/navigation baseline was rewritten. Native signed builds and server hosting remain deferred by user instruction.
