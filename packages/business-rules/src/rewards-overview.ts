export type RewardEntry = {
  id: string;
  kind: string | null;
  points: number | string;
  created_at: string;
  order_id?: string | null;
  order_reference?: string | null;
  booking_id?: string | null;
  booking_reference?: string | null;
};

export type RewardOffer = {
  id: string;
  title: string;
  description: string;
  points: number;
  expiresAt: string;
};

export type RewardsSummary = {
  customerId: string;
  availablePoints?: number | null;
  pendingAwards?: number | null;
  restricted: boolean;
  earningEnabled: boolean;
  redemptionEnabled: boolean;
  referralEnabled?: boolean;
  policy: {
    version: number;
    referralEnabled: boolean;
    minimumPoints: number;
    maximumDiscountBps: number;
    spendPerPointKobo: number;
    eligibleCategories: string[];
  } | null;
  catalogue: RewardOffer[];
  entries: RewardEntry[];
  historyLimit: number;
};

const numbers = new Intl.NumberFormat("en-NG");
export function formatRewardCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? numbers.format(value)
    : "Unavailable";
}

export function rewardEntryTitle(kind: string | null) {
  switch (kind) {
    case "earned":
      return "Points earned";
    case "referral":
      return "Referral points";
    case "redeemed":
      return "Points redeemed";
    case "restored":
      return "Points restored";
    case "reversed":
      return "Points reversed";
    case "adjustment":
      return "Points adjustment";
    default:
      return "Historical transaction";
  }
}

export function rewardDelta(points: RewardEntry["points"]) {
  const value = Number(points);
  if (!Number.isSafeInteger(value)) return "Unavailable";
  return `${value > 0 ? "+" : ""}${numbers.format(value)} points`;
}

export function rewardCapabilities(data: RewardsSummary) {
  const policy = data.policy;
  return {
    earning: !!policy && data.earningEnabled === true,
    redemption: !!policy && data.redemptionEnabled === true && !data.restricted,
    referral:
      !!policy?.referralEnabled &&
      (data.referralEnabled ?? data.earningEnabled) === true,
  };
}

export function canSelectReward(data: RewardsSummary, points: number) {
  return (
    rewardCapabilities(data).redemption &&
    Number.isSafeInteger(data.availablePoints) &&
    Number.isSafeInteger(points) &&
    points >= data.policy!.minimumPoints &&
    data.availablePoints! >= points
  );
}

export function rewardDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-NG", {
        timeZone: "Africa/Lagos",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " WAT";
}
