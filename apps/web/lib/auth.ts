import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
  randomUUID,
} from "node:crypto";
import { one, type SQL } from "./db";
export const id = () => randomUUID();
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function passwordMatches(password: string, hash: string) {
  try {
    const [salt, stored] = hash.split(":");
    const expected = Buffer.from(stored, "hex");
    const actual = scryptSync(password, salt, 64);
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "INVALID_REQUEST",
  ) {
    super(message);
  }
}
export type Actor = {
  id: string;
  name: string;
  email: string;
  role: string;
  branch_id: string | null;
  verified_at: Date | string | null;
  session_id: string;
  driver_delivery_only?: boolean;
  technician_service_only?: boolean;
  privilege_overrides?: Record<string, "grant" | "deny">;
  operation_grant_role?: string;
};
export async function actor(tx: SQL, token: string | null): Promise<Actor> {
  if (!token)
    throw new AppError(401, "Please sign in to continue.", "UNAUTHENTICATED");
  const user = await one<Actor>(
    tx,
    "SELECT u.id,u.name,u.email,u.role,u.branch_id,s.verified_at,s.id AS session_id,s.driver_delivery_only,s.technician_service_only FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=$1 AND s.expires_at>now() AND s.revoked_at IS NULL AND u.active=true",
    [digest(token)],
  );
  if (!user)
    throw new AppError(
      401,
      "Your session has expired. Please sign in.",
      "UNAUTHENTICATED",
    );
  // Production field authority is a role boundary, never a client-selected login mode.
  // Existing identities/sessions remain intact; old app tokens cannot opt out of scope.
  if (process.env.NODE_ENV === "production") {
    if (user.role === "driver") user.driver_delivery_only = true;
    if (user.role === "technician") user.technician_service_only = true;
  }
  user.privilege_overrides = Object.fromEntries((await tx.query("SELECT privilege,effect FROM staff_privilege_overrides WHERE user_id=$1 AND (effect='deny' OR (invalidated_at IS NULL AND role_at_change=$2 AND branch_at_change IS NOT DISTINCT FROM $3))",[user.id,user.role,user.branch_id])).rows.map(r=>[r.privilege,r.effect]));
  return user;
}
export function allow(user: Actor, roles: string[], scope?: string) {
  if (!roles.includes(user.role) && !(user.operation_grant_role && roles.includes(user.operation_grant_role) && roles.some(r=>r!=="owner")))
    throw new AppError(
      403,
      "Your account does not have permission for this action.",
      "FORBIDDEN",
    );
  if (scope && user.role !== "owner" && user.branch_id !== scope)
    throw new AppError(
      403,
      "This record belongs to another branch.",
      "BRANCH_FORBIDDEN",
    );
}
export function recentVerification(user: Actor) {
  if (
    !user.verified_at ||
    Date.now() - new Date(user.verified_at).getTime() > 5 * 60 * 1000
  )
    throw new AppError(
      403,
      "Verify your password again before this sensitive action.",
      "REAUTH_REQUIRED",
    );
}
export async function issueSession(tx: SQL, userId: string) {
  const token = randomBytes(32).toString("hex");
  await tx.query(
    "INSERT INTO sessions(id,user_id,expires_at) VALUES ($1,$2,now()+interval '12 hours')",
    [digest(token), userId],
  );
  return token;
}
