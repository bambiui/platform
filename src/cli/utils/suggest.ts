function editDistance(left: string, right: string): number {
  const distances = Array.from({ length: left.length + 1 }, (_, index) => [
    index,
  ]);

  for (let column = 1; column <= right.length; column += 1) {
    distances[0][column] = column;
  }

  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      distances[row][column] = Math.min(
        distances[row - 1][column] + 1,
        distances[row][column - 1] + 1,
        distances[row - 1][column - 1] + cost,
      );
    }
  }

  return distances[left.length][right.length];
}

export function suggestClosest(
  value: string,
  options: readonly string[],
): string | undefined {
  const normalized = value.toLowerCase();
  const matches = options
    .map((option) => ({
      distance: editDistance(normalized, option.toLowerCase()),
      option,
    }))
    .sort((left, right) => left.distance - right.distance);
  const best = matches[0];

  if (!best || best.distance > Math.max(2, Math.floor(value.length / 2))) {
    return undefined;
  }

  return best.option;
}

export function didYouMean(
  value: string,
  options: readonly string[],
): string {
  const suggestion = suggestClosest(value, options);
  return suggestion ? ` Did you mean "${suggestion}"?` : "";
}
