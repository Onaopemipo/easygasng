import type { NextRequest } from "next/server";
import { AppError } from "./auth";
// The JSON and multipart endpoints share the same origin policy.
export function assertRequestOrigin(
  req: NextRequest,
  options = {
    production: process.env.NODE_ENV === "production",
    appUrl: process.env.APP_URL,
  },
) {
  const origin = req.headers.get("origin");
  let originUrl: URL | null = null;
  if (origin) {
    try {
      originUrl = new URL(origin);
    } catch {
      throw new AppError(403, "Request origin is not permitted.");
    }
  }
  if (options.production && !options.appUrl)
    throw new AppError(503, "The application origin has not been configured.");
  const expected = options.appUrl ?? req.nextUrl.origin;
  const localAlias =
    origin &&
    !options.production &&
    ["localhost", "127.0.0.1", "[::1]"].includes(originUrl!.hostname) &&
    ["localhost", "127.0.0.1", "[::1]"].includes(req.nextUrl.hostname) &&
    originUrl!.port === req.nextUrl.port;
  if (origin && origin !== new URL(expected).origin && !localAlias)
    throw new AppError(403, "Request origin is not permitted.");
}

export function appOrigin(){const u=new URL(process.env.APP_URL??'http://127.0.0.1:3003');if(!['http:','https:'].includes(u.protocol)||u.username||u.password||(process.env.NODE_ENV==='production'&&(u.protocol!=='https:'||['localhost','127.0.0.1','[::1]'].includes(u.hostname))))throw new AppError(503,'Configure the approved secure application URL.');return u.origin;}
