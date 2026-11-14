/** Presentation copy shared by the storefront and the native customer shell. */
export const nativeIntroductionKey = "easygas.onboarding.v1";
export const webIntroductionKey = "easygas.customer.introduction.v1";

export const introductionScenes = [
  {
    id: "ONB-001",
    title: "Cooking Gas Delivered to",
    emphasis: "Your Home",
    body: "Order the amount of cooking gas you need for home delivery in supported areas.",
  },
  {
    id: "ONB-002",
    title: "Fast & Reliable",
    emphasis: "Delivery",
    body: "Follow recorded updates from order confirmation to your doorstep. Rider location appears only when available.",
  },
  {
    id: "ONB-003",
    title: "More Than",
    emphasis: "Just Gas",
    body: "Care for your kitchen, explore rewards and plan your next refill with EasyGas.",
  },
] as const;

export const introductionBenefits = [
  {
    title: "Professional Services",
    detail:
      "Booking depends on qualified technicians and available appointments.",
  },
  {
    title: "EasyRewards & Benefits",
    detail: "Earning and redemption depend on the current rewards policy.",
  },
  {
    title: "Smart Refill Plans",
    detail:
      "Estimates use verified delivery history. They are not sensor readings.",
  },
] as const;

export function introductionIndex(current: number, direction: -1 | 1) {
  return Math.max(
    0,
    Math.min(introductionScenes.length - 1, current + direction),
  );
}

export function introductionAudience(role: unknown) {
  if (role === "customer" || role === "commercial") return "customer";
  return role == null ? "guest" : "excluded";
}

export function canAutoShowIntroduction(input: {
  role: unknown;
  initialLinkResolved: boolean;
  home: boolean;
  dedicatedStaffShell: boolean;
}) {
  return (
    !input.dedicatedStaffShell &&
    input.home &&
    input.initialLinkResolved &&
    introductionAudience(input.role) === "customer"
  );
}

export function shouldShowFirstIntroduction(
  seen: string | null,
  understood: boolean,
) {
  return understood && !seen;
}
