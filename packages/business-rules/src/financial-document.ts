/** Presentation only. The authenticated backend supplies immutable snapshots and verified balances. */
export type FinancialDocument = {
  type: "invoice" | "receipt" | "credit_note" | "debit_note" | "void_note";
  title: string;
  number: string;
  issuedAt: string;
  sourceReference: string;
  paymentReference: string;
  customer: any;
  business: any;
  address: string;
  status: string;
  sandbox: boolean;
  verified: boolean;
  dueDate: string;
  version: number;
  lines: { label: string; amountKobo: number }[];
  totals: { label: string; amountKobo: number | null; emphasis?: boolean }[];
  notices: string[];
};
export function exactKobo(value: unknown): number {
  if (
    typeof value !== "number" &&
    !(typeof value === "string" && /^\d+$/.test(value))
  )
    throw new Error("Invalid financial amount.");
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0 || n > 1_000_000_000_000)
    throw new Error("Invalid financial amount.");
  return n;
}
export function documentMoney(value: number | null): string {
  if (value === null) return "Reconciliation required";
  const n = BigInt(exactKobo(value));
  return (
    "₦" +
    (n / 100n).toLocaleString("en-NG") +
    "." +
    (n % 100n).toString().padStart(2, "0")
  );
}
export function documentDate(value: unknown): string {
  const d = new Date(String(value));
  return Number.isFinite(+d)
    ? d.toLocaleString("en-GB", {
        timeZone: "Africa/Lagos",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }) + " (Lagos)"
    : "Not recorded";
}
export function financialDocument(invoice: any): FinancialDocument {
  const s = invoice.snapshot;
  if (!s || !invoice.invoice_number)
    throw new Error("Issued document snapshot required.");
  const receipt = invoice.documentKind === "sandbox_receipt";
  const note = invoice.documentNote;
  if (
    note &&
    (!note.id ||
      note.state !== "approved" ||
      !["credit", "debit", "void"].includes(note.kind))
  )
    throw new Error("Only an approved invoice note can be printed.");
  if (
    receipt &&
    (!invoice.verifiedPostingId ||
      !invoice.ledgerPostingId ||
      invoice.status !== "verified_test_payment" ||
      invoice.environment !== "test")
  )
    throw new Error("A committed verified sandbox posting is required.");
  const total = exactKobo(invoice.total_kobo),
    paid = exactKobo(invoice.paidKobo ?? 0),
    effective = exactKobo(invoice.effectiveTotalKobo ?? total),
    due =
      invoice.amountDueKobo === null
        ? null
        : exactKobo(invoice.amountDueKobo ?? total);
  let lines: FinancialDocument["lines"] = [];
  const products = s.products ?? [],
    gas = s.gas ?? [];
  if (products.length + gas.length > 1000)
    throw new Error("Document line limit exceeded.");
  if (receipt) {
    const base = exactKobo(invoice.principalKobo),
      fee = exactKobo(invoice.customerFeeKobo),
      gross = exactKobo(invoice.grossKobo);
    if (base + fee !== gross || total !== gross || paid !== gross || due !== 0)
      throw new Error("Receipt does not match verified posting.");
    lines = [
      {
        label:
          invoice.purpose === "wallet"
            ? "Wallet funding principal"
            : invoice.purpose === "service"
              ? "Service payment principal"
              : "Order payment principal",
        amountKobo: base,
      },
      { label: "Payment processing charge", amountKobo: fee },
    ];
  } else if (note) {
    lines = [
      {
        label: `${note.kind} adjustment · ${String(note.reason)}`,
        amountKobo: exactKobo(note.amount_kobo),
      },
    ];
  } else {
    lines = products.map((p: any) => {
      const q = Number(p.quantity);
      if (!Number.isSafeInteger(q) || q <= 0 || q > 1000000)
        throw new Error("Invalid item quantity.");
      return {
        label: `${String(p.name)} · ${q} × ${documentMoney(exactKobo(p.unit_price_kobo))}`,
        amountKobo: exactKobo(q * exactKobo(p.unit_price_kobo)),
      };
    });
    lines.push(
      ...gas.map((g: any) => ({
        label: `Cooking gas · ${Number(g.grams) / 1000} kg · cylinder capacity ${Number(g.capacity_grams) / 1000} kg`,
        amountKobo: exactKobo(g.subtotal_kobo),
      })),
    );
  }
  const notes = (invoice.notes ?? []).filter(
    (n: any) => n.state === "approved",
  );
  const status = note
    ? "Approved adjustment"
    : receipt
      ? "Payment Verified"
      : invoice.status === "voided"
        ? "Voided invoice"
        : due === null
          ? "Reconciliation required"
          : due === 0 && paid > 0
            ? "Paid invoice"
            : paid > 0
              ? "Partially paid invoice"
              : "Unpaid invoice";
  const totals: FinancialDocument["totals"] = receipt
    ? [{ label: "Total Paid", amountKobo: paid, emphasis: true }]
    : note
      ? [
          {
            label: "Adjustment amount",
            amountKobo: exactKobo(note.amount_kobo),
            emphasis: true,
          },
        ]
      : [
          { label: "Subtotal", amountKobo: exactKobo(s.subtotalKobo) },
          { label: "Delivery", amountKobo: exactKobo(s.deliveryKobo ?? 0) },
          { label: "Discount", amountKobo: exactKobo(s.discountKobo ?? 0) },
          ...(s.taxKobo
            ? [{ label: "Recorded tax", amountKobo: exactKobo(s.taxKobo) }]
            : []),
          { label: "Original issued total", amountKobo: total },
          ...notes.map((n: any) => ({
            label: `Approved ${n.kind} note #${n.sequence}`,
            amountKobo: exactKobo(n.amount_kobo),
          })),
          { label: "Effective invoice total", amountKobo: effective },
          { label: "Verified net paid to date", amountKobo: paid },
          { label: "Balance due", amountKobo: due, emphasis: true },
          ...(Number(invoice.overpaidKobo) > 0
            ? [
                {
                  label: "Credit balance",
                  amountKobo: exactKobo(invoice.overpaidKobo),
                },
              ]
            : []),
        ];
  const notices = receipt
    ? [
        "Sandbox transaction only. No live funds.",
        "Verified collection is not confirmation of merchant settlement.",
        ...(invoice.purpose === "wallet"
          ? [
              "Wallet principal is purchase-credit liability, not sales revenue. Processing charge is not wallet credit.",
            ]
          : []),
      ]
    : note
      ? [
          "This adjustment references the original invoice; it is not a payment receipt or refund confirmation.",
          "Original invoice: " + invoice.invoice_number,
        ]
      : [
          "An invoice is a request for payment, not proof of payment.",
          ...(invoice.overdue
            ? ["Payment is overdue against the recorded due date."]
            : []),
          ...(s.taxNote ? [s.taxNote] : []),
          ...(s.customerNote ? [s.customerNote] : []),
        ];
  if (receipt && invoice.policyVersion)
    notices.push(`Fee policy version ${invoice.policyVersion}.`);
  const model: FinancialDocument = {
    type: note
      ? (`${note.kind}_note` as FinancialDocument["type"])
      : receipt
        ? "receipt"
        : "invoice",
    title: note
      ? `${note.kind[0].toUpperCase() + note.kind.slice(1)} Note`
      : receipt
        ? "Payment Receipt"
        : "Invoice",
    number: note
      ? `${invoice.invoice_number} / ${note.kind.toUpperCase()} #${note.sequence}`
      : String(invoice.invoice_number),
    issuedAt: documentDate(note?.decided_at ?? invoice.issued_at),
    sourceReference: String(s.orderReference ?? invoice.reference ?? ""),
    paymentReference: String(s.paymentReference ?? ""),
    customer: s.customer ?? {},
    business: Object.fromEntries(
      [
        "name",
        "address",
        "phone",
        "email",
        "website",
        "registrationNumber",
        "taxId",
      ]
        .filter((k) => s.business?.[k])
        .map((k) => [k, s.business[k]]),
    ),
    address: [s.address?.street, s.address?.zone].filter(Boolean).join(", "),
    status,
    sandbox: receipt,
    verified: receipt,
    dueDate: receipt || note ? "" : String(s.dueDate ?? "Not recorded"),
    version: Number(invoice.correctionVersion ?? 1),
    lines,
    totals,
    notices,
  };
  if (JSON.stringify(model).length > 250000)
    throw new Error("Document content limit exceeded.");
  return model;
}
