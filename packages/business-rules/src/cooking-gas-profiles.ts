export const supplyOptions = [
  { value: "still_available", label: "Still have gas" },
  { value: "low", label: "Almost empty" },
  { value: "empty", label: "Gas finished" },
  { value: "already_refilled", label: "Already refilled (self-report)" },
  { value: "remind_later", label: "Remind me later (pause for 24 hours)" },
] as const;

export type SupplyState = (typeof supplyOptions)[number]["value"];
export type SupplyReport = {
  id: string;
  state: SupplyState;
  created_at: string;
};
export type RefillOffer = {
  id: string;
  title: string;
  points: number;
  expiresAt: string;
};
export type RefillProduct = { id: string; name: string; category: string };
export type RefillProfile = {
  id: string;
  label: string;
  active: boolean;
  product_name: string;
  capacityKg: number | null;
  created_at: string;
  feedback: SupplyReport[];
  history: { orderId: string; date: string; kg: number }[];
  lastVerifiedRefill: { date: string; kg: number } | null;
  typicalIntervalDays: number | null;
  reminderState?: { reason?: string; until?: string };
  forecast:
    | { available: false; reason: string }
    | {
        available: true;
        reason?: string;
        daysLeft: number;
        estimatedPercent: number;
        confidence: string;
        nextDate: string;
      };
};

export const noSmartRefillOffers =
  "No approved offer currently matches your verified refill profile and communication preferences.";

export const smartRefillExplanation =
  "Smart Refill estimates use verified single-cylinder deliveries. A refill bought elsewhere can be reported, and a new verified refill is needed before the estimate resumes.";

export function refillProfileActivity(profile: RefillProfile) {
  return [
    {
      id: `profile:${profile.id}`,
      date: profile.created_at,
      label: "Profile added",
    },
    ...profile.history.map((entry) => ({
      id: `order:${entry.orderId}`,
      date: entry.date,
      label: `Verified refill · ${entry.kg} kg`,
      orderId: entry.orderId,
    })),
    ...profile.feedback.map((entry) => ({
      id: `report:${entry.id}`,
      date: entry.created_at,
      label:
        supplyOptions.find(({ value }) => value === entry.state)?.label ??
        "Supply report",
    })),
  ].sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
}

export function lagosRefillDate(date: string, withTime = false) {
  return new Date(date).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime
      ? { hour: "2-digit", minute: "2-digit", timeZoneName: "short" }
      : {}),
  });
}

export function countRecurringRefills(
  plans: { id: string; status: string }[],
  authorisations: { schedule_id: string; active: boolean }[],
) {
  const activePlans = new Set(
    plans.filter((plan) => plan.status === "active").map((plan) => plan.id),
  );
  return new Set(
    authorisations
      .filter(
        (authorisation) =>
          authorisation.active && activePlans.has(authorisation.schedule_id),
      )
      .map((authorisation) => authorisation.schedule_id),
  ).size;
}

export async function loadCookingGasProfiles(
  api: (action: string) => Promise<any>,
  { includeRecurring = true } = {},
) {
  const profiles: RefillProfile[] = await api("refill.profiles");
  const [catalogue, offers, recurring] = await Promise.allSettled([
    api("catalogue").then((data: { products: RefillProduct[] }) =>
      data.products.filter((product) => product.category === "Gas refills"),
    ),
    api("rewards.smart-offers") as Promise<RefillOffer[]>,
    includeRecurring
      ? Promise.all([api("schedules"), api("schedule.authorisations")]).then(
          ([plans, authorisations]) =>
            countRecurringRefills(plans, authorisations),
        )
      : Promise.resolve(null),
  ]);
  for (const result of [catalogue, offers, recurring]) {
    if (
      result.status === "rejected" &&
      [401, 403].includes(result.reason?.status)
    )
      throw result.reason;
  }
  return {
    profiles,
    products: catalogue.status === "fulfilled" ? catalogue.value : null,
    offers: offers.status === "fulfilled" ? offers.value : null,
    recurringCount: recurring.status === "fulfilled" ? recurring.value : null,
    refreshedAt: new Date().toISOString(),
  };
}
export type CookingGasProfilesData = Awaited<
  ReturnType<typeof loadCookingGasProfiles>
>;

export function refillSaveError(error: unknown) {
  const failure = error as { status?: number; message?: string };
  if (failure.status === 404)
    return "This profile is no longer available. Refresh to see your current profiles.";
  if (failure.status === 409)
    return "The saved supply has changed. Review the latest report before saving.";
  if (failure.status === 429)
    return "You can update your supply again one hour after your last report.";
  if (!failure.status)
    return "We couldn’t confirm your update. Refresh to check your latest report before trying again.";
  return failure.message || "We couldn’t save your supply. Please try again.";
}
