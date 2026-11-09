export const customerGroups = [
  { id: "overview", label: "Your EasyGas" },
  { id: "gas", label: "Gas & Services" },
  { id: "orders", label: "Orders & Payments" },
  { id: "plans", label: "Rewards & Plans" },
  { id: "support", label: "Support" },
] as const;
export const customerNavigation = [
  { href: "/account", label: "Overview", group: "overview", icon: "House" },
  {
    href: "/notifications",
    label: "Notifications",
    group: "overview",
    icon: "Bell",
    counter: "notifications",
  },
  {
    href: "/account-settings",
    label: "Account & Privacy",
    group: "overview",
    icon: "UserRound",
  },
  {
    href: "/services",
    label: "Professional Services",
    group: "gas",
    icon: "Wrench",
  },
  {
    href: "/bookings",
    label: "Service Appointments",
    group: "gas",
    icon: "CalendarDays",
    counter: "bookings",
  },
  {
    href: "/consumption",
    label: "Cooking Gas Profiles",
    group: "gas",
    icon: "ChartColumn",
  },
  {
    href: "/orders",
    label: "My Orders",
    group: "orders",
    icon: "ShoppingCart",
    counter: "orders",
  },
  { href: "/wallet", label: "My Wallet", group: "orders", icon: "Wallet" },
  {
    href: "/purchase-credit",
    label: "Credit & Redemption",
    group: "orders",
    icon: "CreditCard",
  },
  { href: "/rewards", label: "EasyRewards", group: "plans", icon: "Gift" },
  {
    href: "/schedules",
    label: "Refill Plans",
    group: "plans",
    icon: "CalendarDays",
  },
  {
    href: "/recurring",
    label: "Recurring Orders",
    group: "plans",
    icon: "RefreshCw",
  },
  {
    href: "/refill",
    label: "Smart Refill",
    group: "plans",
    icon: "CircleGauge",
  },
  {
    href: "/help",
    label: "Help & Support",
    group: "support",
    icon: "Headphones",
  },
  {
    href: "/support",
    label: "Support Conversations",
    group: "support",
    icon: "MessagesSquare",
    counter: "support",
  },
] as const;
export function customerRoute(path: string) {
  if (path === "/track")
    return customerNavigation.find((i) => i.href === "/orders");
  return customerNavigation.find(
    (i) =>
      path === i.href ||
      (i.href === "/services" && path.startsWith("/services/")),
  );
}
export const protectedCustomerRoutes = customerNavigation
  .map((i) => i.href)
  .filter((p) => p !== "/services" && p !== "/help");
export function safeCustomerReturn(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n\u0000]/.test(value)
  )
    return "/account";
  try {
    const url = new URL(value, "https://easygas.invalid");
    if (
      url.origin !== "https://easygas.invalid" ||
      url.hash ||
      (![
        ...customerNavigation.map((i) => i.href),
        "/gas-order",
        "/checkout",
        "/combined-checkout",
        "/cart",
        "/track",
      ].some((p) => p === url.pathname) &&
        !/^\/services\/[a-z0-9-]{1,80}$/.test(url.pathname))
    )
      return "/account";
    // Preserve only the explicitly supported order reference parameter.
    const ref = url.searchParams.get("ref");
    return (
      url.pathname +
      (ref && /^[a-zA-Z0-9-]{1,80}$/.test(ref)
        ? "?ref=" + encodeURIComponent(ref)
        : "")
    );
  } catch {
    return "/account";
  }
}
export function parseShoppingCart(value: string | null) {
  try {
    const rows = JSON.parse(value ?? "[]");
    if (!Array.isArray(rows)) return [];
    const seen = new Set<string>();
    return rows
      .filter(
        (x) =>
          x &&
          typeof x.productId === "string" &&
          x.productId.length <= 100 &&
          Number.isInteger(x.quantity) &&
          x.quantity > 0 &&
          x.quantity <= 20 &&
          !seen.has(x.productId) &&
          !!seen.add(x.productId),
      )
      .slice(0, 30)
      .map((x) => ({ productId: x.productId, quantity: x.quantity }));
  } catch {
    return [];
  }
}

/** Keep auth switches inside the existing customer flow, including guest checkout. */
export function customerAuthHref(register: boolean, returnTo: string | null) {
  return `${register ? "/register" : "/login"}?returnTo=${encodeURIComponent(safeCustomerReturn(returnTo))}`;
}
