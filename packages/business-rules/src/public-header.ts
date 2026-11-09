export const publicHeaderLinks = [
  { href: "/", label: "Home", icon: "House" },
  { href: "/gas-order", label: "Order Gas", icon: "Flame" },
  { href: "/products", label: "Products", icon: "Package" },
  { href: "/services", label: "Book a Service", icon: "Wrench" },
  { href: "/#how-it-works", label: "How It Works", icon: "BookOpen" },
  { href: "/about", label: "About Us", icon: "UsersRound" },
  { href: "/help", label: "Help", icon: "CircleHelp" },
] as const;
export function publicHeaderActive(href: string, path: string, hash = "") {
  if (href.includes("#")) return path === "/" && hash === "#how-it-works";
  if (href === "/") return path === "/" && hash !== "#how-it-works";
  return path === href || path.startsWith(href + "/");
}
export function publicSearchResults(
  query: string,
  products: any[],
  services: any[],
  includePreview = false,
) {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [];
  return [
    ...products
      .filter((p) => p.published === true || includePreview)
      .map((p) => ({
        label: p.name,
        type: p.published === true ? "Product" : "Preview product",
        href: `/products/${encodeURIComponent(p.id)}`,
      })),
    ...services.map((s) => ({
      label: s.name,
      type: "Service",
      href: `/services/${encodeURIComponent(s.id)}`,
    })),
    ...[
      { label: "Help, support and safety tips", href: "/help" },
      { label: "Delivery coverage and locations", href: "/delivery" },
      { label: "Contact EasyGas", href: "/contact" },
      { label: "Track your order", href: "/track" },
    ].map((p) => ({ ...p, type: "Help" })),
  ].filter((p) => p.label.toLocaleLowerCase().includes(q));
}
