import {
  request,
  state,
  save,
  user,
  reset,
  subscribe,
  baseline,
} from "../easygas-mobile/model";
import {
  workflowExecute,
  workflowSnapshot,
  featureSections,
} from "../easygas-mobile/workflow";
import {
  workflowFeatures,
  commands,
  familyRoles,
} from "../easygas-mobile/workflow-catalogue";
export {
  request,
  state,
  save,
  user,
  reset,
  subscribe,
  baseline,
  workflowExecute,
  workflowSnapshot,
  featureSections,
  workflowFeatures,
  commands,
  familyRoles,
};
export const personaRole = (role: string) =>
  role === "commercial" ? "customer" : role;
export const families = (role: string) =>
  workflowFeatures.filter((f: any) =>
    familyRoles[f.id.slice(-2)]?.includes(personaRole(role)),
  );
export function execute(action: string, data: any = {}, key?: string) {
  const r = workflowExecute(action, data, key);
  if (r?.__status) throw Object.assign(Error(r.error), { status: r.__status });
  return r;
}
export const money = (k: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(k || 0) / 100);
export const nextDay = () =>
  new Date(Date.now() + 86400000).toISOString().slice(0, 10);
export type Draft = {
  lines: { kg: number; capacityKg: number }[];
  name: string;
  phone: string;
  street: string;
  zone: string;
  locationId: string;
  date: string;
  window: string;
  method: string;
  key: string;
  instructions: string;
};
export function freshDraft(): Draft {
  return {
    lines: [{ kg: 6, capacityKg: 12.5 }],
    name: "Sample customer",
    phone: "08000000000",
    street: "12 Prototype Avenue",
    zone: "Victoria Island",
    locationId: "victoria-island",
    date: nextDay(),
    window: "09:00–12:00",
    method: "card",
    key: crypto.randomUUID(),
    instructions: "",
  };
}
export function draftTotal(d: Draft) {
  return d.lines.reduce((s, l) => s + l.kg * 180000, 500000);
}
export function validateDraft(d: Draft) {
  if (d.lines.some((l) => l.kg < 0.5 || l.kg > l.capacityKg || (l.kg * 2) % 1))
    throw Error("Choose gas in 0.5 kg steps within each cylinder’s capacity.");
  if (
    d.street.trim().length < 8 ||
    d.name.trim().length < 2 ||
    !/^0[789][01]\d{8}$/.test(d.phone)
  )
    throw Error(
      "Check the recipient name, Nigerian mobile number and street address.",
    );
  if (!d.date || d.date < new Date().toISOString().slice(0, 10))
    throw Error("Choose today or a future delivery date.");
}
export function placeDraft(d: Draft) {
  validateDraft(d);
  return execute(
    "checkout",
    {
      gasLines: d.lines,
      address: {
        name: d.name,
        phone: d.phone,
        street: d.street,
        zone: d.zone,
        locationId: d.locationId,
        directions: d.instructions,
      },
      date: d.date,
      window: d.window,
      paymentMethod: d.method,
      idempotencyKey: d.key,
    },
    d.key,
  );
}
export function startPayment(order: any, key: string) {
  return execute(
    "payments/paystack/initialize",
    {
      orderId: order.id,
      amountKobo: Number(order.total_kobo),
      idempotencyKey: key,
    },
    key,
  );
}
export function verifyPayment(reference: string, outcome = "paid") {
  if (state.scenario === "pending-payment" || state.scenario === "offline")
    return { status: "pending" };
  if (state.scenario === "expired-session")
    throw Error(
      "Your session expired. Your order is saved; restore the session to check this payment.",
    );
  return execute("payments/paystack/verify", {
    reference,
    synthetic: true,
    outcome,
  });
}
export function actionFields(command: any) {
  const snap = workflowSnapshot();
  const sources: any = {
    ...snap,
    drivers: snap.staff?.filter((x: any) => x.role === "driver"),
    technicians: snap.staff?.filter((x: any) => x.role === "technician"),
    fieldStaff: snap.staff?.filter((x: any) =>
      ["driver", "technician"].includes(x.role),
    ),
    materials: snap.bookings?.flatMap((b: any) => b.materials || []),
    shifts: ["owner", "manager", "finance"].includes(state.role)
      ? request("pos").shifts
      : [],
  };
  return command.fields.map((f: any) => ({
    ...f,
    options: f.source
      ? (sources[f.source] || []).map((r: any) => ({
          value: r.id || r.reference,
          label: r.reference || r.name || r.serial || r.subject || r.id,
        }))
      : f.options?.map((o: any) =>
          typeof o === "string"
            ? { value: o, label: o.replaceAll("_", " ") }
            : o,
        ),
  }));
}

export function nairaInputToKobo(value: unknown): number {
  const raw = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw))
    throw Error("Enter a naira amount with at most two decimal places.");
  const [whole, fraction = ""] = raw.split(".");
  const result = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (result > BigInt(Number.MAX_SAFE_INTEGER))
    throw Error("Amount is too large.");
  return Number(result);
}
