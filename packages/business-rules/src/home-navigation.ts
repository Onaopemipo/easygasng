import { analyticsPageAllowed } from "./analytics";
export function retainedPublicHomeNavigation(
  currentUrl: string,
  destination: string,
) {
  try {
    const from = new URL(currentUrl),
      to = new URL(destination, from);
    return (
      !from.username &&
      !from.password &&
      !to.username &&
      !to.password &&
      from.origin === to.origin &&
      to.pathname === "/" &&
      analyticsPageAllowed(from) &&
      analyticsPageAllowed(to)
    );
  } catch {
    return false;
  }
}
