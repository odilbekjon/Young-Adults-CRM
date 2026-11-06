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

interface MethodGroup {
  key: string;
  name: string;
  // At least one of the methods behind this line is switched on and not removed.
  live: boolean;
  amount: number;
}

// The Total Net Profit split by payment method: what came in through a method
// (its payments) minus what went out through it (its expenses and withdrawals), so a
// method that only paid something out shows a negative figure. Salaries have no
// method of their own and come as one line; whatever is still unexplained (a row whose
// method is not on the list, a rounding gap) is one "other" line. The lines always add
// up to `netProfit`, the figure the card shows.
//
// One line per method NAME: the backend can list the same method more than once (a copy
// per branch, one created again), and "Click" three times would only be noise. Methods
// that share a name (whatever the case) are one line, in the place of the first of
// them, and their figures are added up.
export const netProfitDetails = ({ methods, payments, outflows, salaries, netProfit }: NetProfitDetailsInput): NetProfitLine[] => {
  const groups = new Map<string, MethodGroup>();
  const groupOfId = new Map<string, string>();
  methods.forEach((m) => {
    const key = nameKey(m.name);
    const group = groups.get(key) ?? { key, name: m.name.trim() || m.name, live: false, amount: 0 };
    group.live = group.live || (m.status !== "INACTIVE" && !m.deletedAt);
    groups.set(key, group);
    groupOfId.set(m.id, key);
  });

  // A row belongs to a method by its id, else by its name; one that is on neither is left for "other".
  const add = (id: string | null, name: string, delta: number) => {
    const key = (id ? groupOfId.get(id) : undefined) ?? (nameKey(name) && groups.has(nameKey(name)) ? nameKey(name) : undefined);
    const group = key === undefined ? undefined : groups.get(key);
    if (group) group.amount += delta;
  };
  payments.forEach((p) => add(p.paymentMethodId, p.paymentMethodName, p.amount));
  outflows.forEach((o) => add(o.id, o.name, -o.amount));

  const lines: NetProfitLine[] = [...groups.values()]
    // A method that was switched off or removed is only listed while it still holds a figure.
    .filter((g) => g.live || g.amount !== 0)
    .map((g) => ({ key: `method:${g.key}`, name: g.name, amount: g.amount, kind: "method" as const }));

  if (salaries !== 0) lines.push({ key: "salaries", name: "", amount: -salaries, kind: "salaries" });

  const other = netProfit - lines.reduce((sum, line) => sum + line.amount, 0);
  if (Math.abs(other) >= 0.5) lines.push({ key: "other", name: "", amount: other, kind: "other" });
  return lines;
};
