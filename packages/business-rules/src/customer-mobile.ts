export function notificationTarget(n: {
  title?: string;
  related_id?: string | null;
}): { screen: string; id?: string } | null {
  const title = n.title?.toLowerCase() ?? "";
  if (
    /order|delivery|payment/.test(title) &&
    n.related_id &&
    /^[a-f0-9-]{36}$/i.test(n.related_id)
  )
    return { screen: "orders", id: n.related_id };
  if (/service|appointment/.test(title)) return { screen: "bookings" };
  if (/refill/.test(title)) return { screen: "plans" };
  if (/reward/.test(title)) return { screen: "rewards" };
  if (/support/.test(title)) return { screen: "conversations" };
  return null;
}
export function lagosDay(value: string | number | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString("en-NG", {
        timeZone: "Africa/Lagos",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}
export function customerMobileLink(
  value: string,
): { screen: string; id?: string } | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "easygas:" ||
      url.username ||
      url.password ||
      url.hash ||
      url.port
    )
      return null;
    const routes: Record<string, string> = {
      home: "home",
      orders: "orders",
      payment: "payment",
      services: "services",
      wallet: "wallet",
      account: "more",
      cylinders: "cylinders",
      refill: "plans",
      invoices: "invoices",
      notifications: "notifications",
      rewards: "rewards",
      support: "conversations",
      profile: "profile",
      cart: "cart",
      checkout: "checkout",
    };
    const screen = routes[url.hostname];
    if (!screen || (url.pathname && url.pathname !== "/")) return null;
    for (const key of url.searchParams.keys())
      if (
        !(
          (key === "orderId" && screen === "orders") ||
          (key === "intentId" && screen === "payment")
        )
      )
        return null;
    const id = url.searchParams.get(
      screen === "payment" ? "intentId" : "orderId",
    );
    if (screen === "payment" && (!id || url.searchParams.getAll("intentId").length !== 1)) return null;
    if (id && !/^[a-f0-9-]{36}$/i.test(id)) return null;
    return { screen, ...(id ? { id } : {}) };
  } catch {
    return null;
  }
}
export function customerReadAction(
  action: string,
  input?: Record<string, string>,
): string {
  const query = new URLSearchParams(input ?? {}).toString();
  return action + (query ? "?" + query : "");
}
