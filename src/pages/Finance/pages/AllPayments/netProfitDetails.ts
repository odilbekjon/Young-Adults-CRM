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

// The payment methods as lines of figures: ONE group per method NAME (the backend can
// list the same method more than once - a copy per branch, one created again - and
// "Click" three times would only be noise). Methods that share a name (whatever the
// case) are one group, in the place of the first of them. `add` puts an amount on the
// method a row belongs to - by its id, else by its name - and says whether there was
// one; a row on neither is left for the caller's "other" line.
const methodGroups = (methods: PaymentMethod[]) => {
  const groups = new Map<string, MethodGroup>();
  const groupOfId = new Map<string, string>();
  methods.forEach((m) => {
    const key = nameKey(m.name);
    const group = groups.get(key) ?? { key, name: m.name.trim() || m.name, live: false, amount: 0 };
    group.live = group.live || (m.status !== "INACTIVE" && !m.deletedAt);
    groups.set(key, group);
    groupOfId.set(m.id, key);
  });

  const add = (id: string | null, name: string, delta: number): boolean => {
    const key = (id ? groupOfId.get(id) : undefined) ?? (nameKey(name) && groups.has(nameKey(name)) ? nameKey(name) : undefined);
    const group = key === undefined ? undefined : groups.get(key);
    if (!group) return false;
    group.amount += delta;
    return true;
  };

  // A method that was switched off or removed is only listed while it still holds a figure.
  const lines = (): NetProfitLine[] =>
    [...groups.values()]
      .filter((g) => g.live || g.amount !== 0)
      .map((g) => ({ key: `method:${g.key}`, name: g.name, amount: g.amount, kind: "method" as const }));

  return { add, lines };
};

// The Total Net Profit split by payment method: what came in through a method
// (its payments) minus what went out through it (its expenses and withdrawals), so a
// method that only paid something out shows a negative figure. Salaries have no
// method of their own and come as one line; whatever is still unexplained (a row whose
// method is not on the list, a rounding gap) is one "other" line. The lines always add
// up to `netProfit`, the figure the card shows.
export const netProfitDetails = ({ methods, payments, outflows, salaries, netProfit }: NetProfitDetailsInput): NetProfitLine[] => {
  const { add, lines: methodLines } = methodGroups(methods);
  payments.forEach((p) => add(p.paymentMethodId, p.paymentMethodName, p.amount));
  outflows.forEach((o) => add(o.id, o.name, -o.amount));

  const lines = methodLines();
  if (salaries !== 0) lines.push({ key: "salaries", name: "", amount: -salaries, kind: "salaries" });

  const other = netProfit - lines.reduce((sum, line) => sum + line.amount, 0);
  if (Math.abs(other) >= 0.5) lines.push({ key: "other", name: "", amount: other, kind: "other" });
  return lines;
};

export interface IncomeByMethodInput {
  // Every payment method, in the order the backend lists them.
  methods: PaymentMethod[];
  // The payments to split: whatever the page's filters let through (refunded /
  // cancelled ones already left out).
  payments: PaymentRow[];
}

// The money RECEIVED, split by payment method: for any period and any filters (a single
// day, one group, one teacher...), unlike the net profit, which needs whole months and no
// filters because expenses and salaries cannot be filtered. A payment whose method is not
// on the list is one "other" line, so the lines always add up to the payments' own total.
export const incomeByMethod = ({ methods, payments }: IncomeByMethodInput): NetProfitLine[] => {
  const { add, lines: methodLines } = methodGroups(methods);
  let unlisted = 0;
  payments.forEach((p) => {
    if (!add(p.paymentMethodId, p.paymentMethodName, p.amount)) unlisted += p.amount;
  });

  const lines = methodLines();
  if (Math.abs(unlisted) >= 0.5) lines.push({ key: "other", name: "", amount: unlisted, kind: "other" });
  return lines;
};
