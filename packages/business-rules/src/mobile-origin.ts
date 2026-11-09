export function assertMobileApiOrigin(
  origin: string,
  development: boolean,
  localDemo: boolean,
) {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new Error("Configure a valid EasyGas backend origin.");
  }
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "The EasyGas backend address must be an origin without credentials, path or query.",
    );
  const loopback = ["localhost", "127.0.0.1", "[::1]", "10.0.2.2"].includes(
    url.hostname,
  );
  if (url.protocol === "https:" && !loopback) return;
  if ((development || localDemo) && loopback && url.protocol === "http:")
    return;
  throw new Error(
    "The released app requires its approved HTTPS API address. Local HTTP is available only in a development or explicitly labelled local demo build.",
  );
}
