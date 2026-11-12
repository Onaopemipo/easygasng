export const driverOutcomes = {
  delivered: "Delivered",
  failed: "Delivery failed",
  returned: "Returned",
  declined: "Declined",
  cancelled: "Cancelled",
} as const;

export type DriverHistoryRow = {
  id: string;
  order_id: string;
  reference: string;
  outcome: keyof typeof driverOutcomes;
  closed_at: string;
  has_proof: boolean;
};

export type DriverHistory = {
  rows: DriverHistoryRow[];
  total: number;
  delivered: number;
  page: number;
  pageSize: number;
};

export function driverDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function assignmentLabel(status: string, attempt?: string, response?: string) {
  if (attempt === "arrived") return "At destination";
  if (status === "out_for_delivery") return "In progress";
  if (attempt === "picked_up") return "Picked up";
  if (response === "acknowledged") return "Awaiting pickup";
  return "Assigned";
}

export function driverOrderAddress(address?: { street?: string; zone?: string; city?: string }) {
  return [address?.street, address?.zone, address?.city].filter(Boolean).join(", ");
}

export function driverNavigation(destination?: { latitude: unknown; longitude: unknown } | null) {
  if (destination?.latitude == null || destination.longitude == null) return null;
  const latitude = Number(destination.latitude);
  const longitude = Number(destination.longitude);
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;
  return "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(`${latitude},${longitude}`);
}

export function driverHistoryAction(filters: { from?: string; to?: string; outcome?: string; page: number }) {
  const params = new URLSearchParams({ page: String(filters.page) });
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.outcome) params.set("outcome", filters.outcome);
  return "driver.history?" + params.toString();
}
