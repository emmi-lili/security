/** True if `isoTimestamp` is on the same calendar day as `ref` in the device timezone. */
export function isSameLocalDay(isoTimestamp: string, ref: Date = new Date()): boolean {
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

/**
 * True if `isoTimestamp` falls within the inclusive date range [from, to],
 * where `from`/`to` are `YYYY-MM-DD` strings (as produced by `<input type="date">`)
 * interpreted in the device timezone. Empty bounds are treated as open-ended,
 * so an empty range matches everything.
 */
export function isWithinLocalRange(
  isoTimestamp: string,
  from: string,
  to: string
): boolean {
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return false;

  if (from) {
    const [y, m, day] = from.split('-').map(Number);
    const start = new Date(y, m - 1, day, 0, 0, 0, 0);
    if (d < start) return false;
  }
  if (to) {
    const [y, m, day] = to.split('-').map(Number);
    const end = new Date(y, m - 1, day, 23, 59, 59, 999);
    if (d > end) return false;
  }
  return true;
}
