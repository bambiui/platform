const counters = new Map<string, number>();

export function createId(prefix: string): string {
  const next = (counters.get(prefix) ?? 0) + 1;
  counters.set(prefix, next);
  return `${prefix}-${next}`;
}

export function ensureId(el: HTMLElement, prefix: string): string {
  if (!el.id) el.id = createId(prefix);
  return el.id;
}

export function safeIdPart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || "item";
}
