import { DoorstepProductActions } from "./doorstep-product-actions";
import { DoorstepCylinderForm } from "./doorstep-cylinder-form";
import { money } from "./ui";
export function DoorstepActions({
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
  if (m.proposal.items?.length)
    return (
      <DoorstepProductActions
        Form={Form}
        orderId={orderId}
        amendment={m}
        user={user}
        onDone={onDone}
      />
    );
  const e = m.execution,
    context = [
      { name: "orderId", label: "Order ID", value: orderId },
      { name: "amendmentId", label: "Amendment ID", value: m.id },
    ],
    why = { name: "reason", label: "Evidence and reason" };
  const finance = ["owner", "finance"].includes(user?.role),
    inspector = ["owner", "finance"].includes(user?.role),
    driver = user?.role === "driver";
  return (
    <>
      {m.state === "consented" && !e && inspector && (
        <DoorstepCylinderForm orderId={orderId} amendment={m} onDone={onDone} />
      )}
      {e?.state === "reserved" && (
        <>
          <p>
            Reserved: {Number(e.grams) / 1000} kg · Supplementary obligation:{" "}
            {money(Number(e.amount_kobo))} · Expires{" "}
            {new Date(e.expires_at).toLocaleString()}. Original invoice and
            delivery fee remain unchanged.
          </p>
          {finance && e.note_state === "pending" && (
            <Form
              title="Independently review supplementary debit"
              action="invoice.correction.decide"
              onDone={onDone}
              fields={[
                { name: "orderId", label: "Order ID", value: orderId },
                {
                  name: "noteId",
                  label: "Protected debit note ID",
                  value: e.note_id,
                },
                {
                  name: "approve",
                  label: "Approve (uncheck to reject)",
                  type: "checkbox",
                },
              ]}
            />
          )}
          {driver && e.note_state === "approved" && !e.cash_reported_at && (
            <Form
              title="Report supplementary cash actually collected"
              action="doorstep.collection.report"
              onDone={onDone}
              fields={[
                ...context,
                {
                  name: "amountKobo",
                  label: "Exact cash actually collected (kobo)",
                  type: "number",
                  value: Number(e.amount_kobo),
                },
                why,
              ]}
            />
          )}
          {finance && e.cash_reported_at && !e.cash_verified_at && (
            <Form
              title="Independently verify supplementary cash"
              action="doorstep.collection.verify"
              onDone={onDone}
              fields={[...context, why]}
            />
          )}
          {e.cylinder_lines?.map((line: any) => (
            <p key={line.id}>
              Cylinder {line.position}: {Number(line.grams) / 1000} kg ·{" "}
              {line.state}
            </p>
          ))}
          {driver &&
            (!e.cylinder_lines?.length
              ? [null]
              : e.cylinder_lines.filter((l: any) => l.state === "reserved")
            ).map((line: any) => (
              <Form
                key={`${e.load_version}:${line?.id ?? "legacy"}`}
                title={
                  line
                    ? `Record cylinder ${line.position} metered dispensing`
                    : "Record supplementary metered dispensing"
                }
                action="doorstep.dispense"
                onDone={onDone}
                fields={[
                  ...context,
                  ...(line
                    ? [
                        {
                          name: "lineId",
                          label: "Cylinder line ID",
                          value: line.id,
                        },
                      ]
                    : []),
                  {
                    name: "loadVersion",
                    label: "Current load version",
                    type: "number",
                    value: Number(e.load_version),
                  },
                  {
                    name: "meterReadingGrams",
                    label: "Observed cumulative meter reading (grams)",
                    type: "number",
                  },
                  why,
                ]}
              />
            ))}
          {finance && (
            <Form
              title="Cancel undispensed addition after invoice review"
              action="doorstep.cancel"
              onDone={onDone}
              fields={[
                ...context,
                {
                  name: "creditNoteId",
                  label:
                    "Exact approved credit note ID (required if debit approved)",
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
