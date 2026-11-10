/** One visible request at a time. Only an explicit settle can confirm an action. */
export function createDialogQueue<T, R>() {
  let next = 0;
  const queue: {
    id: number;
    options: T;
    resolve: (result: R) => void;
    cleanup?: () => void;
  }[] = [];
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((fn) => fn());
  const finish = (index: number, result: R) => {
    const item = queue.splice(index, 1)[0];
    if (!item) return;
    item.cleanup?.();
    emit();
    item.resolve(result);
  };
  return {
    current: () => queue[0] ?? null,
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    open: (options: T, control?: { signal: AbortSignal; cancelResult: R }) =>
      new Promise<R>((resolve) => {
        if (control?.signal.aborted) {
          resolve(control.cancelResult);
          return;
        }
        const item = {
          id: ++next,
          options,
          resolve,
          cleanup: undefined as (() => void) | undefined,
        };
        queue.push(item);
        if (control) {
          const cancel = () => {
            const index = queue.indexOf(item);
            if (index >= 0) finish(index, control.cancelResult);
          };
          control.signal.addEventListener("abort", cancel, { once: true });
          item.cleanup = () =>
            control.signal.removeEventListener("abort", cancel);
        }
        emit();
      }),
    settle: (id: number, result: R) => {
      if (queue[0]?.id === id) finish(0, result);
    },
    cancelAll: (result: R) => {
      while (queue.length) finish(0, result);
    },
  };
}
