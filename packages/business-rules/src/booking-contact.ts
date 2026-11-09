import { normaliseCustomerPhone } from "./customer-identity";

export const bookingPhoneMessage = "Enter a valid Nigerian mobile number, such as 08012345678 or +2348012345678.";
/** Preserve already valid representations for existing idempotent request hashes. */
export function bookingPhone(value: string): string | null {
  if (/^(?:\+234|0)[789][01]\d{8}$/.test(value)) return value;
  return normaliseCustomerPhone(value);
}
