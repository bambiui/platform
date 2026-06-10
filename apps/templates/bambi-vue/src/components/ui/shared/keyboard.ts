export function isActivationKey(key: string): boolean {
  return key === "Enter" || key === " ";
}

export function wrapIndex(index: number, length: number): number {
  if (length <= 0) return -1;
  if (index < 0) return length - 1;
  if (index >= length) return 0;
  return index;
}

export function nextIndex(
  currentIndex: number,
  length: number,
  direction: "next" | "previous" | "first" | "last",
): number {
  if (direction === "first") return length > 0 ? 0 : -1;
  if (direction === "last") return length > 0 ? length - 1 : -1;
  return wrapIndex(currentIndex + (direction === "next" ? 1 : -1), length);
}

export function directionFromKey(
  key: string,
  orientation: "horizontal" | "vertical",
): "next" | "previous" | "first" | "last" | null {
  const previousKey = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
  const nextKey = orientation === "vertical" ? "ArrowDown" : "ArrowRight";

  if (key === previousKey) return "previous";
  if (key === nextKey) return "next";
  if (key === "Home") return "first";
  if (key === "End") return "last";
  return null;
}
