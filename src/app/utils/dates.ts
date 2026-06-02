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
