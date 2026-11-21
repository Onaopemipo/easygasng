/** Recover only an explicit server rejection, never an uncertain network outcome. */
export async function sensitiveActionRequest<T>(options: {
  send: () => Promise<T>;
  identity: (rejection?: unknown) => Promise<string>;
  verify: () => Promise<boolean>;
  current: () => boolean;
}): Promise<T> {
  try {
    return await options.send();
  } catch (error: any) {
    if (error?.status !== 403 || error?.code !== "REAUTH_REQUIRED") throw error;
    const identity = await options.identity(error);
    if (!options.current() || !(await options.verify()))
      throw Object.assign(
        new Error(
          "Verification cancelled. Your entries are unchanged; review them before trying again.",
        ),
        { status: 403, code: "VERIFICATION_CANCELLED" },
      );
    const latestIdentity = await options.identity();
    if (!options.current() || latestIdentity !== identity)
      throw Object.assign(
        new Error(
          "Your account or page changed. Refresh and review this action before continuing.",
        ),
        { status: 409, code: "VERIFICATION_CONTEXT_CHANGED" },
      );
    // One explicit Verify and continue retries the exact original request once.
    // A second expiry, permission error or uncertain outcome goes back to the caller.
    return options.send();
  }
}
