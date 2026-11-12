export type ServiceSlot = { id: string; starts_at: string; ends_at: string };
export type ServiceAvailability = {
  status:
    | "available"
    | "unconfigured"
    | "outside_coverage"
    | "no_qualified_technician"
    | "no_slots";
  serviceVersion: number | null;
  slots: ServiceSlot[];
};

export function serviceMoney(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? "₦" + (value / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })
    : null;
}

export function servicePrice(config: {
  priceKobo?: unknown;
  pricingModel?: string;
}) {
  const price = serviceMoney(config.priceKobo);
  if (config.pricingModel === "quote") return "Quotation required";
  if (!price)
    return config.pricingModel === "fixed"
      ? "Price unavailable"
      : "Quotation required";
  return config.pricingModel === "starting" ? "From " + price : price;
}

export function serviceDetailText(value: unknown) {
  if (typeof value !== "string") return "";
  const text = value.trim();
  return /^(business configuration required|no warranty terms configured|not configured)\.?$/i.test(
    text,
  )
    ? ""
    : text;
}

export const serviceAvailabilityMessage: Record<
  Exclude<ServiceAvailability["status"], "available">,
  string
> = {
  unconfigured: "Online booking is unavailable for this service.",
  outside_coverage: "This area is outside the service coverage.",
  no_qualified_technician:
    "No qualified technicians are currently available for this service.",
  no_slots: "No appointment times are currently available for this service.",
};

export function serviceSlotsQuery(
  service: { id: string; branch_id: string },
  zone = "",
) {
  return (
    "services.slots?" +
    new URLSearchParams({
      serviceId: service.id,
      branchId: service.branch_id,
      view: "detail",
      ...(zone ? { zone } : {}),
    })
  );
}

const lagos = { timeZone: "Africa/Lagos" } as const;
const dayFormat = new Intl.DateTimeFormat("en-NG", {
  ...lagos,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("en-NG", {
  ...lagos,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
export function serviceSlotDay(slot: ServiceSlot) {
  return dayFormat.format(new Date(slot.starts_at));
}
export function serviceSlotTime(slot: ServiceSlot) {
  return (
    timeFormat.format(new Date(slot.starts_at)) +
    "–" +
    timeFormat.format(new Date(slot.ends_at))
  );
}

export function activeServiceSlots(slots: ServiceSlot[], now = Date.now()) {
  return slots.filter(
    (slot) =>
      Date.parse(slot.starts_at) > now &&
      Date.parse(slot.ends_at) > Date.parse(slot.starts_at),
  );
}

export function assertServiceSelection(
  availability: ServiceAvailability,
  version: number,
  slotId: string,
) {
  if (Number(availability.serviceVersion) !== Number(version))
    throw new Error(
      "Service details or pricing changed. Refresh the service and review the current terms.",
    );
  if (
    availability.status !== "available" ||
    !activeServiceSlots(availability.slots).some((slot) => slot.id === slotId)
  )
    throw new Error(
      "That appointment is no longer available. Choose another time.",
    );
}
