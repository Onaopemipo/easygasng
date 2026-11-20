export type NativeEntry = {
  kind: "reset" | "verify" | "invitation" | "phone";
  token: string | null;
};
/** Account tokens stay in component memory; only the configured origin or the app scheme is accepted. */
export function nativeEntryLink(
  value: string,
  origin: string,
): NativeEntry | null {
  try {
    const url = new URL(value),
      approved = new URL(origin);
    if (url.username || url.password || /[\u0000-\u0020\\]/.test(value))
      return null;
    const native = url.protocol === "easygas:";
    if (
      !native &&
      ((url.protocol !== "https:" &&
        !(
          approved.protocol === "http:" &&
          ["127.0.0.1", "localhost", "10.0.2.2", "[::1]"].includes(
            approved.hostname,
          )
        )) ||
        url.origin !== approved.origin)
    )
      return null;
    if (native && url.port) return null;
    const route = native
      ? url.hostname
        ? "/" + url.hostname + url.pathname
        : url.pathname
      : url.pathname;
    const kind = (
      {
        "/reset-password": "reset",
        "/verify-email": "verify",
        "/accept-invitation": "invitation",
        "/activate": "phone",
      } as const
    )[route.replace(/\/$/, "") as "/activate"];
    if (!kind) return null;
    const fragment = url.hash.slice(1),
      fragmentToken = fragment.startsWith("token=")
        ? new URLSearchParams(fragment).get("token")
        : fragment,
      token = fragmentToken || url.searchParams.get("token");
    return {
      kind,
      token: token && /^[a-f0-9]{64}$/.test(token) ? token : null,
    };
  } catch {
    return null;
  }
}
