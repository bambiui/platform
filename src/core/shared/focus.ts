export function focusElement(el: HTMLElement | null | undefined): void {
  el?.focus();
}

export function getEnabledItems<T extends HTMLElement>(items: T[]): T[] {
  return items.filter(
    (item) =>
      !item.hasAttribute("disabled") &&
      item.getAttribute("aria-disabled") !== "true" &&
      item.getAttribute("data-disabled") !== "true",
  );
}
