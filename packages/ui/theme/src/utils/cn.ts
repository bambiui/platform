type ClassDictionary = Record<string, unknown>;

function toClassList(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string" || typeof value === "number") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap(toClassList);
  }

  if (typeof value === "object") {
    return Object.entries(value as ClassDictionary)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([className]) => className);
  }

  return [];
}

export function cn(...inputs: unknown[]) {
  return inputs.flatMap(toClassList).join(" ");
}
