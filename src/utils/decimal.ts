// The backend serializes Prisma Decimal columns (course price, discount value,
// ...) either as a plain number/string or as a decimal.js object
// `{ s, e, d }` — sign, base-10 exponent of the first digit, and the digits
// packed into base-1e7 words (first word unpadded, every later word exactly 7
// digits). Reading just `d[0]` is only right below 10 000 000 and for whole
// numbers; this rebuilds the full value. Returns null when `raw` isn't numeric.
export const decimalToNumber = (raw: unknown): number | null => {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") {
    if (raw.trim() === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  if (raw && typeof raw === "object") {
    const { s, e, d } = raw as { s?: unknown; e?: unknown; d?: unknown };
    if (Array.isArray(d) && d.length > 0 && typeof e === "number") {
      const digits = d
        .map((word, i) => (i === 0 ? String(Number(word)) : String(Number(word)).padStart(7, "0")))
        .join("");
      const n = Number(`${digits}e${e - digits.length + 1}`) * (s === -1 ? -1 : 1);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
};
