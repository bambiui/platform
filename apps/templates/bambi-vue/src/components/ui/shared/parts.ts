export interface PartDef {
  tag: keyof HTMLElementTagNameMap;
  attr: string;
  role?: string;
  description?: string;
}

export function part(
  tag: keyof HTMLElementTagNameMap,
  attr: string,
  options: Omit<PartDef, "tag" | "attr"> = {},
): PartDef {
  return { tag, attr, ...options };
}
