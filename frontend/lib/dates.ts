/**
 * Date helpers used across the app.
 */
export function isRecent(iso: string, hours = 48): boolean {
  if (!iso) return false;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < hours * 60 * 60 * 1000;
}

export function relativeTime(iso: string): string {
  if (!iso) return '';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const diff = Date.now() - ts;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return 'adesso';
  if (diff < hour) return `${Math.floor(diff / minute)} min fa`;
  if (diff < day) return `${Math.floor(diff / hour)} h fa`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} g fa`;
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}
