# Inventory workflows and controls

The new InventoryWorkspace orchestrates existing Stock, Receipts, Adjustments, Returns, Transfers, Purchases and History. Stock/history use bounded server reads. Other tabs mount existing BusinessCentre forms with their original actions; legacy headers/KPIs/tabs are visually hidden to avoid duplicate shell content. No mutation engine replacement. User branchId normalization fixes its prior snake-case-only default; branch remains an explicit backend-checked field.

Receipts/Add Stock → inventory.receipt: actual source/supplier/purchase, receiving checks, integer units/decimal-safe gas, acquisition evidence and unique reference. Existing partial purchase receipt validates current independent authorization and remaining quantity. Replay same reference+payload returns original; changed payload conflicts. Pending purchase never becomes stock. Cylinder unit receipt does not manufacture eligible serials.

Adjustments → inventory.adjust/stocktake/quarantine/threshold; current before/reserved snapshot, reason/evidence and independent existing approval. Stocktake create/count-sheet/submit retains snapshot and rejects intervening changes. No direct overwrite or self-approval.

Returns → existing inventory.return holds physical goods unsaleably, inventory.release requires qualified review/independent approval, inventory.disposition supports supplier return/write-off with evidence. Generic cylinder release is blocked in favor of serialized inspection/custody. Original service/order/vehicle reconciliation remains separate; no automatic refund or payment reversal.

Transfers → transfer request/approval reserves source, dispatch removes source into transit, destination actual good/damaged counts with independent receiving; partial/discrepancy remains visible. Duplicate dispatch/receive rejected/replayed under existing engine. Generic serialized-cylinder transfer is deliberately disabled: use existing approved serial custody procedure, never a generic unit shortcut. Vehicle/doorstep paths remain in their existing applications and prior P0 acceptance is not closed here.

Purchases → supplier profiles, purchase.create and independent approvals; received quantities/cost/payment evidence remain distinct. Cost fields are existing permission-restricted. Existing supplier disposition is not rebuilt.

History → new paginated union of the two immutable movement authorities, with q/name/SKU/reference, branch, date and kind. Timestamp Lagos, signed quantity/unit, actor, source reference and reason. No invented before/after, approver, serial or import-batch linkage when those columns are absent; richer origin/evidence drilldowns remain incomplete. Corrections use governed compensating operations, never edit/delete committed movement rows.

Form input/error/verification and stable user-supplied reference behavior are retained. API committed events trigger snapshot refresh; retry after ambiguous outcome uses existing original reference, never a new logical stock receipt. Real operational mutation browser acceptance remains separate from rendering a form.
