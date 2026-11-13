import { money } from "./ui";
export function DoorstepProductActions({
  Form,
  orderId,
  amendment: m,
  user,
  onDone,
}: {
  Form: any;
  orderId: string;
  amendment: any;
  user: any;
  onDone: () => void;
}) {
  const e = m.product_execution,
    context = [
      { name: "orderId", label: "Order ID", value: orderId },
      { name: "amendmentId", label: "Amendment ID", value: m.id },
    ],
    why = { name: "reason", label: "Evidence and reason" },
    finance = ["owner", "finance"].includes(user.role);
  return (
    <>
      {!e &&
        m.state === "consented" &&
        ["owner", "finance"].includes(user.role) && (
          <Form
            title="Reserve exact manifested products"
            action="doorstep.products.prepare"
            onDone={onDone}
            fields={[
              ...context,
              ...m.proposal.items.flatMap((item: any, i: number) => [
                {
                  name: `manifest${i}`,
                  label: `${item.productId} × ${item.quantity}: acknowledged manifest ID`,
                },
                {
                  name: `serials${i}`,
                  label:
                    "Exact cylinder IDs, comma separated (empty for accessories)",
                  type: "csv",
                  optional: true,
                },
              ]),
              why,
            ]}
            mapRequest={(d: any) => ({
              orderId,
              amendmentId: m.id,
              reason: d.reason,
              allocations: m.proposal.items.map((item: any, i: number) => ({
                productId: item.productId,
                manifestId: d[`manifest${i}`],
                serialIds: d[`serials${i}`] ?? [],
              })),
            })}
          />
        )}
      {e && (
        <p>
          Product execution: {e.state} · {money(e.amount_kobo)} · debit{" "}
          {e.note_state}. Original delivery fee stays unchanged.
        </p>
      )}
      {e?.state === "reserved" && (
        <>
          {finance && e.note_state === "pending" && (
            <Form
              title="Independently review product debit"
              action="invoice.correction.decide"
              onDone={onDone}
              fields={[
                { name: "orderId", label: "Order ID", value: orderId },
                { name: "noteId", label: "Note ID", value: e.note_id },
                {
                  name: "approve",
                  label: "Approve (uncheck to reject)",
                  type: "checkbox",
                },
              ]}
            />
          )}
          {user.role === "driver" &&
            e.note_state === "approved" &&
            !e.cash_reported_at && (
              <Form
                title="Report product cash actually collected"
                action="doorstep.products.collection.report"
                onDone={onDone}
                fields={[
                  ...context,
                  {
                    name: "amountKobo",
                    label: "Actual exact cash collected (kobo)",
                    value: Number(e.amount_kobo),
                    type: "number",
                  },
                  why,
                ]}
              />
            )}
          {finance && e.cash_reported_at && !e.cash_verified_at && (
            <Form
              title="Independently verify product cash"
              action="doorstep.products.collection.verify"
              onDone={onDone}
              fields={[...context, why]}
            />
          )}
          {user.role === "driver" && (
            <Form
              title="Record full product handover"
              action="doorstep.products.handover"
              onDone={onDone}
              fields={[
                ...context,
                {
                  name: "code",
                  label: "Customer's original visit confirmation code",
                },
                {
                  name: "handover",
                  label:
                    "I actually handed over every reserved product and exact serial",
                  type: "checkbox",
                },
                why,
              ]}
            />
          )}
          {finance && (
            <Form
              title="Cancel unhanded products after invoice review"
              action="doorstep.products.cancel"
              onDone={onDone}
              fields={[
                ...context,
                {
                  name: "creditNoteId",
                  label:
                    "Exact approved later credit note ID (if debit approved)",
                  optional: true,
                },
                why,
              ]}
            />
          )}
        </>
      )}
    </>
  );
}
