// "Strings 1-2-3 (high E side)" / "Strings 6-4-3-2 (skips string 5)".
export function describeStringGroup(strings: readonly number[]): string {
  const name = `Strings ${strings.join("-")}`;
  const sorted = [...strings].sort((a, b) => a - b);
  const skipped: number[] = [];
  for (let n = sorted[0]; n <= sorted[sorted.length - 1]; n++) {
    if (!sorted.includes(n)) skipped.push(n);
  }
  if (skipped.length > 0) {
    return `${name} (skips string${skipped.length > 1 ? "s" : ""} ${skipped.join(", ")})`;
  }
  if (sorted[0] === 1) return `${name} (high E side)`;
  if (sorted[sorted.length - 1] === 6) return `${name} (low E side)`;
  return `${name} (middle strings)`;
}
