export type PublicGasSnapshot = {
  branchId: string;
  fetchedAt: number;
  priceVersion: number;
  feeVersion: number;
  policyVersion: number;
  priceKobo: number;
  deliveryKobo: number;
  [key: string]: any;
};
export function createPublicGasCache(now = () => Date.now(), ttlMs = 60000) {
  const values = new Map<string, PublicGasSnapshot>(),
    pending = new Map<string, Promise<PublicGasSnapshot>>();
  function seed(value: any): PublicGasSnapshot | undefined {
    if (
      !value ||
      typeof value.branchId !== "string" ||
      !value.branchId ||
      !Number.isFinite(value.fetchedAt) ||
      ![
        "priceVersion",
        "feeVersion",
        "policyVersion",
        "priceKobo",
        "deliveryKobo",
      ].every((k) => Number.isSafeInteger(value[k]) && value[k] >= 0)
    )
      return;
    const previous = values.get(value.branchId);
    if (
      previous &&
      (["priceVersion", "feeVersion", "policyVersion"].some(
        (k) => value[k] < previous[k],
      ) ||
        (value.fetchedAt < previous.fetchedAt &&
          ["priceVersion", "feeVersion", "policyVersion"].every(
            (k) => value[k] === previous[k],
          )))
    )
      return previous;
    const snapshot = Object.fromEntries(
      [
        "branchId",
        "priceVersion",
        "feeVersion",
        "policyVersion",
        "priceKobo",
        "deliveryKobo",
        "policy",
        "locations",
        "deliveryOnly",
      ].map((k) => [k, value[k]]),
    ) as PublicGasSnapshot;
    snapshot.fetchedAt = Math.min(now(), value.fetchedAt);
    values.set(snapshot.branchId, snapshot);
    return snapshot;
  }
  function read(branch: string) {
    const value = values.get(branch);
    return value ? { value, fresh: now() - value.fetchedAt < ttlMs } : null;
  }
  function load(
    branch: string,
    fetcher: () => Promise<any>,
    force = false,
  ): Promise<PublicGasSnapshot> {
    const current = read(branch);
    if (!force && current?.fresh) return Promise.resolve(current.value);
    const flight = pending.get(branch);
    if (flight) return flight;
    const request = Promise.resolve()
      .then(fetcher)
      .then((value) => {
        if (value?.branchId !== branch)
          throw Error(
            "The returned prices do not match the selected delivery branch.",
          );
        const result = seed(value);
        if (!result)
          throw Error("Current prices are unavailable. Please retry.");
        return result;
      })
      .finally(() => {
        if (pending.get(branch) === request) pending.delete(branch);
      });
    pending.set(branch, request);
    return request;
  }
  return { seed, read, load };
}
