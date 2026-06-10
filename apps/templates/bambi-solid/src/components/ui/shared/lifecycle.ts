export interface AbortScope {
  readonly signal: AbortSignal;
  reset(): AbortSignal;
  destroy(): void;
}

export function createAbortScope(): AbortScope {
  let controller = new AbortController();

  return {
    get signal() {
      return controller.signal;
    },
    reset() {
      controller.abort();
      controller = new AbortController();
      return controller.signal;
    },
    destroy() {
      controller.abort();
    },
  };
}
