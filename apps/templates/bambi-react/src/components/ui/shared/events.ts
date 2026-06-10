export type EventDetailType =
  | "object"
  | "string"
  | "boolean"
  | "number"
  | "void";

export interface EventDef {
  name: string;
  detail?: EventDetailType;
  description?: string;
}

export function event(
  name: string,
  options: Omit<EventDef, "name"> = {},
): EventDef {
  return { name, ...options };
}

export function dispatchBambiEvent<Detail>(
  element: Element,
  name: string,
  detail: Detail,
): void {
  element.dispatchEvent(
    new CustomEvent<Detail>(name, {
      bubbles: true,
      cancelable: false,
      composed: false,
      detail,
    }),
  );
}

export function eventCallbackName(eventName: string): string {
  return `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
}
