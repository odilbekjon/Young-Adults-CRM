const pad = (n: number) => String(n).padStart(2, "0");

// "DD.MM.YYYY HH:MM[:SS]" in the viewer's local time — for backend ISO
// timestamps. Returns null for a missing/date-only/unparseable value (a bare
// "YYYY-MM-DD" carries no time of day, so showing 00:00 would be a lie).
export const formatDateTime = (iso?: string | null, withSeconds = false): string | null => {
  if (!iso || iso.length <= 10) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const base = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return withSeconds ? `${base}:${pad(d.getSeconds())}` : base;
};

export const formatUzs = (n: number | null | undefined): string | null =>
  n === null || n === undefined ? null : `${n.toLocaleString("ru-RU")} UZS`;
