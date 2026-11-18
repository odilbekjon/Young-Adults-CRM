import { decimalToNumber } from "./decimal";

// Whether a group-roster row says its student owes for THIS group
// (FRONTEND_INTEGRATION_DOCS.md §2): `buQarzmi` (aliases hasDebt / isDebtor /
// isDebt) is the verdict, `debt` (aliases debtAmount / groupDebt) the amount. It
// is about this group alone - the student's account-wide balance, or a debt in
// another group, plays no part. Every source is tried in order (a membership row
// and the student object nested in it, say); the first one that says anything
// wins.
//
// true = owes, false = does not, null = no row says either way (an older backend,
// or a roster endpoint without these keys) - callers then fall back to whatever
// else they know, e.g. the signed balance.
const FLAG_KEYS = ["buQarzmi", "hasDebt", "isDebtor", "isDebt"];
const AMOUNT_KEYS = ["debt", "debtAmount", "groupDebt"];

export const readGroupDebtor = (...sources: Array<object | null | undefined>): boolean | null => {
  const rows = sources.filter((s): s is Record<string, unknown> => !!s && typeof s === "object");
  for (const row of rows) {
    for (const key of FLAG_KEYS) {
      if (typeof row[key] === "boolean") return row[key] as boolean;
    }
  }
  for (const row of rows) {
    for (const key of AMOUNT_KEYS) {
      const amount = decimalToNumber(row[key]);
      if (amount !== null) return amount > 0;
    }
  }
  return null;
};
