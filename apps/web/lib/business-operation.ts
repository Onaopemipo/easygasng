import {enforceStaffPrivilege} from "./staff-privileges";
import { sealMessage,openMessage } from "./channel-messaging";
import { deliveryFailureReasons } from "../../../packages/business-rules/src/order-tracking";
import { z } from "zod";
import { type SQL, one } from "./db";
import { type Actor, AppError, digest } from "./auth";
import { audit } from "./governance";
export function canonicalRequest(value: unknown): string {
  if (Array.isArray(value))
    return "[" + value.map(canonicalRequest).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonicalRequest(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value) ?? "null";
}
// This helper runs INSIDE the same dispatch transaction as the existing business operation.
export async function businessOperation(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
  execute: (clean: unknown) => Promise<any>,
) {
  const raw = input as Record<string, unknown>;
  if (!raw?.operationKey) return execute(input); // Legacy clients retain existing natural-reference protections.
  const key = z.string().uuid().parse(raw.operationKey),
    { operationKey: _, ...clean } = raw;
  const hash = digest(canonicalRequest(clean));
  await tx.query(
    "INSERT INTO business_operation_results(operation_key,actor_id,action,request_hash,actor_role,actor_branch) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
    [key, user.id, action, hash, user.role, user.branch_id],
  );
  const prior = await one(
    tx,
    "SELECT * FROM business_operation_results WHERE operation_key=$1 FOR UPDATE",
    [key],
  );
  if (
    !prior ||
    prior.actor_id !== user.id ||
    prior.actor_role !== user.role ||
    prior.actor_branch !== user.branch_id ||
    prior.action !== action ||
    prior.request_hash !== hash
  )
    throw new AppError(
      409,
      "Operation identity conflicts with this request. Refresh and review the current record.",
      "IDEMPOTENCY_CONFLICT",
    );
  if (prior.committed_at) {
    await audit(tx, user, "operation.replayed", key);
    return { ...readOperationResult(prior.result), replayed: true };
  }
  await tx.query("SELECT set_config('easygas.operation_key',$1,true)", [key]);
  const result = await execute(clean);
  if (result === undefined)
    throw new AppError(400, "Unsupported business operation.");
  await tx.query(
    "UPDATE business_operation_results SET result=$1,committed_at=now() WHERE operation_key=$2",
    [JSON.stringify(action==="invoice.request.create"&&result.url?{...result,url:undefined,encryptedPaymentUrl:sealMessage(result.url)}:result), key],
  );
  await audit(tx, user, "operation.committed", key, "success", {
    operation: action,
  });
  return result;
}
export async function operationOutcome(tx: SQL, user: Actor, input: unknown) {
  const d = z.object({ key: z.string().uuid() }).strict().parse(input);
  const result = await one(
    tx,
    "SELECT action,result,committed_at FROM business_operation_results WHERE operation_key=$1 AND actor_id=$2 AND actor_role=$3 AND actor_branch IS NOT DISTINCT FROM $4",
    [d.key, user.id, user.role, user.branch_id],
  );
  if (!result?.committed_at)
    return {
      status: "NOT_FOUND",
      message:
        "No committed result found. Retry the original request with the same operation identity; do not assume a timed-out request failed.",
    };
  enforceStaffPrivilege(user,result.action);
  return { status: "COMMITTED", ...result, result:readOperationResult(result.result) };
}
// Public HTTP mutations must provide an explicit logical identity. Internal mixed
// checkout and legacy trusted callers keep their established natural references.
export function validateServiceOperationRequest(
  action: string,
  input: unknown,
) {
  if (
    action.startsWith("booking.") ||
    action.startsWith("service.material.") ||
    [
      "order.transition",
      "delivery.complete",
      "delivery.pickup",
      "delivery.arrived",
      "delivery.return",
      "delivery.reschedule",
      "delivery.help",
    ].includes(action)
  ) {
    const value = input as Record<string, unknown>;
    if (!value || !z.string().uuid().safeParse(value.operationKey).success)
      throw new AppError(
        400,
        "A stable operationKey is required for this service mutation. Retry using the original key.",
        "OPERATION_KEY_REQUIRED",
      );
    if (
      [
        "order.transition",
        "delivery.complete",
        "delivery.pickup",
        "delivery.arrived",
        "delivery.return",
        "delivery.reschedule",
        "delivery.help",
      ].includes(action) &&
      !z.number().int().nonnegative().safeParse(value.version).success
    )
      throw new AppError(
        400,
        "Refresh the order and include its current tracking version.",
      );
    if (
      action === "order.transition" &&
      value.status === "delivery_failed" &&
      !z.enum(deliveryFailureReasons).safeParse(value.failureReason).success
    )
      throw new AppError(
        400,
        "Choose the actual delivery failure reason and record the next-step details.",
      );
    if (
      ["booking.cancel", "booking.reschedule"].includes(action) &&
      !z.number().int().positive().safeParse(value.version).success
    )
      throw new AppError(
        400,
        "Refresh the booking and include its current version.",
        "BOOKING_VERSION_REQUIRED",
      );
  }
  return input;
}

export async function requiredBusinessOperation(tx:SQL,user:Actor,action:string,input:unknown,execute:(clean:unknown)=>Promise<any>){
 if(!z.string().uuid().safeParse((input as any)?.operationKey).success)throw new AppError(400,"A stable operationKey is required. Retry with the original key.","OPERATION_KEY_REQUIRED");
 return businessOperation(tx,user,action,input,execute);
}

function readOperationResult(result:any){if(result?.encryptedPaymentUrl){const {encryptedPaymentUrl,...rest}=result;return {...rest,url:openMessage(encryptedPaymentUrl)};}return result;}
