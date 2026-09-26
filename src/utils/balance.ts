export type BalanceStatus = "debtor" | "creditor" | "paid";

export const classifyBalance = (balance: number | null | undefined): BalanceStatus => {
  const value = balance ?? 0;
  if (value < 0) return "debtor";
  if (value > 0) return "creditor";
  return "paid";
};

export const BALANCE_STATUS_COLOR: Record<BalanceStatus, string> = {
  debtor: "var(--color-danger)",
  creditor: "var(--color-success)",
  paid: "var(--color-text-muted)",
};

export const getBalanceColor = (balance: number | null | undefined): string =>
  BALANCE_STATUS_COLOR[classifyBalance(balance)];

export const formatUZS = (amount: number | null | undefined): string =>
  `${(amount ?? 0).toLocaleString("uz-UZ")} UZS`;
