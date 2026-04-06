type DeferredCommitArgs<T> = {
  delayMs: number;
  commit: (value: T) => Promise<void> | void;
};

export function createDeferredCommit<T>({ delayMs, commit }: DeferredCommitArgs<T>) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingValue: T | null = null;

  async function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    if (pendingValue === null) {
      return;
    }

    const value = pendingValue;
    pendingValue = null;
    await commit(value);
  }

  function schedule(value: T) {
    pendingValue = value;

    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      void flush();
    }, delayMs);
  }

  function dispose() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pendingValue = null;
  }

  return {
    schedule,
    flush,
    dispose
  };
}
