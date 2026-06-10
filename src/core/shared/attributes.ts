export function getAttr(el: Element, name: string, fallback = ""): string {
  return el.getAttribute(name) ?? fallback;
}

export function setAttr(el: Element, name: string, value: string | null): void {
  if (value === null) el.removeAttribute(name);
  else el.setAttribute(name, value);
}

export function getBoolAttr(el: Element, name: string): boolean {
  return el.getAttribute(name) === "true";
}

export function setBoolAttr(el: Element, name: string, value: boolean): void {
  setAttr(el, name, value ? "true" : null);
}

export function setPresenceAttr(el: Element, name: string, value: boolean): void {
  if (value) el.setAttribute(name, "");
  else el.removeAttribute(name);
}
