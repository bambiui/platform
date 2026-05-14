export interface BambiEventInit<T> {
  detail: T;
  bubbles?: boolean;
  cancelable?: boolean;
  composed?: boolean;
}

export function dispatchBambiEvent<T>(
  element: Element,
  eventName: string,
  init: BambiEventInit<T>,
): boolean {
  const event = new CustomEvent<T>(eventName, {
    bubbles: init.bubbles ?? true,
    cancelable: init.cancelable ?? false,
    composed: init.composed ?? false,
    detail: init.detail,
  });
  return element.dispatchEvent(event);
}
