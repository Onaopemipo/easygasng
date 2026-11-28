/** Only the existing anonymous public catalogue, never account/cart/form/session state. */
export function createPublicHomeCache() {
  let current: any = null;
  const seen = new WeakSet<object>();
  const listeners = new Set<() => void>();
  const keys = [
    "preview",
    "products",
    "website",
    "homeServices",
    "categories",
    "gas",
    "walletEnabled",
    "deliveryFee",
    "zones",
    "windows",
    "orderingEnabled",
    "codEnabled",
    "hours",
    "testimonials",
  ];
  function remember(value: any) {
    if (
      value === current ||
      (value && typeof value === "object" && seen.has(value))
    )
      return current;
    if (
      !value ||
      !Array.isArray(value.products) ||
      !Array.isArray(value.gas?.locations) ||
      !Array.isArray(value.windows)
    )
      return current;
    const next = Object.fromEntries(
      keys.filter((k) => k in value).map((k) => [k, value[k]]),
    );
    seen.add(value);
    seen.add(next);
    current = next;
    listeners.forEach((listener) => listener());
    return current;
  }
  return {
    read: () => current,
    remember,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
