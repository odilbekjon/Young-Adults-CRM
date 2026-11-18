// The monthly server payment reminder (FRONTEND_INTEGRATION_DOCS.md §1). The
// backend returns it ONLY to SUPERADMIN/CEO accounts, on GET /auth/me,
// /settings, /branches and /branches/:id - either as flat keys on the object or
// grouped in `serverPaymentInfo`. Every key has aliases (daysLeft /
// daysUntilPayment, nextPaymentDate / paymentDate, isWarning /
// buOgohlantirishmi), so each is read through its aliases. The backend decides
// WHEN to warn (`isWarning`: 5 days or fewer before the payment day); the
// frontend only shows what it says.

export interface ServerPaymentInfo {
  serverPaymentDate?: number;
  serverPaymentDay?: number;
  nextPaymentDate?: string;
  paymentDate?: string;
  daysLeft?: number;
  daysUntilPayment?: number;
  isWarning?: boolean;
  buOgohlantirishmi?: boolean;
}

// Mixed into every response type that carries the reminder.
export interface ServerPaymentFields extends ServerPaymentInfo {
  serverPaymentInfo?: ServerPaymentInfo | null;
}

export interface ServerPaymentWarning {
  isWarning: boolean;
  daysLeft: number | null;
  // YYYY-MM-DD of the payment day, or null when the backend did not say.
  nextPaymentDate: string | null;
}

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const firstOf = (sources: Array<Record<string, unknown>>, keys: string[]): unknown => {
  for (const source of sources) {
    for (const key of keys) {
      if (source[key] !== undefined && source[key] !== null) return source[key];
    }
  }
  return undefined;
};

// Reads the reminder from a response object. Returns null when it carries none
// (every role except SUPERADMIN/CEO), so callers can simply skip it.
export const readServerPayment = (raw: unknown): ServerPaymentWarning | null => {
  const root = asObject(raw);
  if (!root) return null;
  const sources = [asObject(root.serverPaymentInfo), root].filter((s): s is Record<string, unknown> => s !== null);

  const flag = firstOf(sources, ["isWarning", "buOgohlantirishmi"]);
  const days = firstOf(sources, ["daysLeft", "daysUntilPayment"]);
  const date = firstOf(sources, ["nextPaymentDate", "paymentDate"]);
  if (flag === undefined && days === undefined && date === undefined) return null;

  const daysNumber = days === undefined || days === "" ? NaN : Number(days);
  return {
    isWarning: flag === true,
    daysLeft: Number.isFinite(daysNumber) ? daysNumber : null,
    nextPaymentDate: typeof date === "string" && date !== "" ? date.slice(0, 10) : null,
  };
};
