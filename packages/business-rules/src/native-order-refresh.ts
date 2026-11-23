/** Keep a slow tracking read authoritative until it settles. Polls reuse it. */
export function singleFlightRefresh<T>(read: (initial: boolean) => Promise<T>) {
  let pending: Promise<T> | null = null;
  return (initial = false): Promise<T> => {
    if (pending) return pending;
    pending = read(initial).finally(() => {
      pending = null;
    });
    return pending;
  };
}
