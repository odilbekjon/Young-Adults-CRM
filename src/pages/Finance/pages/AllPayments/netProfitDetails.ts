import type { FinanceOutflow, PaymentMethod, PaymentRow } from "../../../../app/api/financeApi/types";

// One line of the net profit's "Details": the net of one payment method, the
// salaries (which the backend does not tie to a method), or what is left over.
export interface NetProfitLine {
  key: string;
  name: string;
  amount: number;
  kind: "method" | "salaries" | "other";
}

export interface NetProfitDetailsInput {
  // Every payment method, in the order the backend lists them.
  methods: PaymentMethod[];
  // The payments counted in the period (refunded / cancelled ones left out).
  payments: PaymentRow[];
  // Expenses plus withdrawals of the period, per payment method.
  outflows: FinanceOutflow[];
  // Salaries paid in the period (a positive figure), from the same monthly chart as the profit.
  salaries: number;
  // The Total Net Profit the card states for the period.
  netProfit: number;
}

const nameKey = (name: string) => name.trim().toLowerCase();

// The Total Net Profit split by payment method: what came in through a method
// (its payments) minus what went out through it (its expenses and withdrawals), so a
// method that only paid something out shows a negative figure. Salaries have no
// method of their own and come as one line; whatever is still unexplained (a row whose
// method is not on the list, a rounding gap) is one "other" line. The lines always add
// up to `netProfit`, the figure the card shows.
export const netProfitDetails = ({ methods, payments, outflows, salaries, netProfit }: NetProfitDetailsInput): NetProfitLine[] => {
  const ids = new Set(methods.map((m) => m.id));
  const idByName = new Map(methods.map((m) => [nameKey(m.name), m.id]));
  const netByMethod = new Map<string, number>();

  // A row belongs to a method by its id, else by its name; one that is on neither is left for "other".
  const add = (id: string | null, name: string, delta: number) => {
    const methodId = id && ids.has(id) ? id : idByName.get(nameKey(name));
    if (methodId) netByMethod.set(methodId, (netByMethod.get(methodId) ?? 0) + delta);
  };
  payments.forEach((p) => add(p.paymentMethodId, p.paymentMethodName, p.amount));
  outflows.forEach((o) => add(o.id, o.name, -o.amount));

  const lines: NetProfitLine[] = methods
    // A method that was switched off or removed is only listed while it still holds a figure.
    .filter((m) => (m.status !== "INACTIVE" && !m.deletedAt) || (netByMethod.get(m.id) ?? 0) !== 0)
    .map((m) => ({ key: m.id, name: m.name, amount: netByMethod.get(m.id) ?? 0, kind: "method" as const }));

  if (salaries !== 0) lines.push({ key: "salaries", name: "", amount: -salaries, kind: "salaries" });

  const other = netProfit - lines.reduce((sum, line) => sum + line.amount, 0);
  if (Math.abs(other) >= 0.5) lines.push({ key: "other", name: "", amount: other, kind: "other" });
  return lines;
};
