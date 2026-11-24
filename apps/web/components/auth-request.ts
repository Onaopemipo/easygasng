import { withAuthDeadline } from "../../../packages/business-rules/src/auth-request";
import { api } from "./ui";
export const authRequest = (
  action: string,
  data?: any,
  options?: { signal?: AbortSignal },
) =>
  withAuthDeadline((signal) => api(action, data, { signal }), options?.signal);
