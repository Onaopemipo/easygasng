import { one, type SQL } from "./db";
import { AppError, digest, type Actor } from "./auth";
/** Shared per-order/per-driver attempt budget; dispatch records invalid attempts outside the rolled-back business transaction. */
export async function verifyDeliveryCode(
  tx: SQL,
  user: Actor,
  order: any,
  code: string,
) {
  const key = digest(`delivery:${order.id}:${user.id}`),
    attempts = await one(tx, "SELECT * FROM auth_attempts WHERE key=$1", [key]);
  if (
    attempts &&
    new Date(attempts.reset_at).getTime() > Date.now() &&
    Number(attempts.attempts) >= 5
  )
    throw new AppError(
      429,
      "Too many incorrect delivery codes. Contact dispatch or try again in 15 minutes.",
    );
  if (
    !order.delivery_code_expires_at ||
    new Date(order.delivery_code_expires_at).getTime() <= Date.now()
  )
    throw new AppError(
      409,
      "This delivery code has expired. Ask dispatch to arrange a fresh confirmation.",
    );
  if (digest(code) !== order.delivery_code_hash)
    throw new AppError(
      400,
      "The delivery confirmation code is incorrect.",
      "DELIVERY_CODE_INVALID",
    );
}
