import { useMemo } from "react";
import { Button } from "@mui/material";
import { FiPrinter } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import type { StudentFinanceHistoryEntry, StudentPaymentsSummary } from "../../../app/api/studentsApi/types";
import { formatUzs } from "../../../components/PaymentReceiptModal/format";
import { sectionTitleStyle } from "./styles";

/* ─── OUTSTANDING BALANCE ────────────────────────────── */
// `balance` is StudentDetail's own balance (the same figure the sidebar's
// badge shows) — the single source of truth for whether the student owes
// money. `summary` (GET /students/{id}/payments' totals) is only shown as a
// breakdown next to it, never used to re-derive a second, possibly
// conflicting balance.
export const OutstandingBalanceCard = ({
  balance, summary, isLoading, onPrintNotice,
}: {
  balance: number;
  summary?: StudentPaymentsSummary;
  isLoading?: boolean;
  onPrintNotice: () => void;
}) => {
  const { t } = useTranslation();
  if (isLoading) return null;

  const isDebt = balance < 0;
  const isCredit = balance > 0;
  const hasBreakdown = summary && (summary.totalCharged > 0 || summary.totalPaid > 0);
  const tone = isDebt ? "var(--color-danger, #ef4444)" : "var(--color-success, #16a34a)";

  return (
    <div style={{ margin: "20px 0 12px" }}>
      <div style={{ ...sectionTitleStyle, margin: "0 0 12px" }}>{t("studentPayments.balanceTitle", "Balance")}</div>
      <div
        style={{
          background: isDebt ? "#fef2f2" : "#f0fdf4",
          border: `1px solid ${isDebt ? "#fecaca" : "#bbf7d0"}`,
          borderRadius: 12,
          padding: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: tone, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
            {isDebt
              ? t("studentPayments.outstanding", "Outstanding balance")
              : isCredit
                ? t("studentPayments.credit", "Credit balance")
                : t("studentPayments.fullyPaid", "Fully paid")}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: tone, marginTop: 4 }}>
            {formatUzs(Math.abs(balance))}
          </div>
          {hasBreakdown && (
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
              {t("studentPayments.totalDue", "Total due")}:{" "}
              <strong style={{ color: "#111827" }}>{formatUzs(summary!.totalCharged)}</strong>
              {"   ·   "}{t("studentPayments.alreadyPaid", "Already paid")}:{" "}
              <strong style={{ color: "#111827" }}>{formatUzs(summary!.totalPaid)}</strong>
            </div>
          )}
        </div>
        {isDebt && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<FiPrinter size={13} />}
            onClick={onPrintNotice}
            sx={{
              textTransform: "none", fontWeight: 600, fontSize: 12, borderRadius: 999,
              borderColor: "#ef4444", color: "#dc2626",
              "&:hover": { borderColor: "#dc2626", bgcolor: "#fef2f2" },
            }}
          >
            {t("studentPayments.printNotice", "Print Payment Notice")}
          </Button>
        )}
      </div>
    </div>
  );
};

/* ─── MONTHLY BALANCE ────────────────────────────────── */
// Source: GET /students/{id}/finance-history — the backend itself returns one
// entry per month with `monthBalance` (= that month's payments − that
// month's charges), so nothing is re-derived client-side. Colour follows the
// sign: 0 → yellow, negative → red, positive → green.
type Tone = "green" | "red" | "yellow";

const TONES: Record<Tone, { border: string; text: string }> = {
  green: { border: "var(--color-success, #22a06b)", text: "var(--color-success, #16a34a)" },
  red: { border: "var(--color-danger, #e5484d)", text: "var(--color-danger, #ef4444)" },
  yellow: { border: "var(--color-warning, #f59e0b)", text: "var(--color-warning, #f59e0b)" },
};

const toneOf = (amount: number): Tone => (amount === 0 ? "yellow" : amount < 0 ? "red" : "green");

const MONTH_RE = /^(\d{4})-(\d{1,2})/;

// "2026-06" / "2026-06-01" -> "2026 M06" (the reference card label); any
// other label shape from the backend is shown as it came.
const monthLabel = (raw: string) => {
  const m = MONTH_RE.exec(raw);
  return m ? `${m[1]} M${m[2].padStart(2, "0")}` : raw;
};

export const MonthlyBalance = ({
  rows, isLoading, isError,
}: {
  rows: StudentFinanceHistoryEntry[];
  isLoading?: boolean;
  isError?: boolean;
}) => {
  const { t } = useTranslation();
  const entries = useMemo(() => {
    const sortable = rows.length > 0 && rows.every((r) => MONTH_RE.test(r.month));
    // Newest month first (reference order), only when every label is sortable.
    const ordered = sortable ? [...rows].sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0)) : rows;
    return ordered.map((r, i) => ({
      key: `${r.month}-${i}`,
      label: monthLabel(r.month),
      amount: r.monthBalance,
      tone: toneOf(r.monthBalance),
      title: `${t("studentPayments.charged", "Charged")}: ${formatUzs(r.totalDebt)} · ${t("studentPayments.paid", "Paid")}: ${formatUzs(r.totalPaid)}`,
    }));
  }, [rows, t]);

  if (isLoading) return null;

  return (
    <div>
      <div style={sectionTitleStyle}>{t("studentPayments.monthlyTitle", "Monthly balance status")}</div>
      {isError ? (
        <div style={{ fontSize: 13, color: "var(--color-danger, #ef4444)" }}>
          {t("studentPayments.monthlyError", "Failed to load the monthly balance")}
        </div>
      ) : entries.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--color-text-muted, #9ca3af)" }}>
          {t("studentPayments.monthlyEmpty", "No monthly data yet")}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
          {entries.map((e) => {
            const c = TONES[e.tone];
            return (
              <div
                key={e.key}
                title={e.title}
                style={{
                  border: `1px solid ${c.border}`,
                  background: "var(--color-surface, #fff)",
                  borderRadius: 8,
                  padding: "8px 24px 10px",
                  minWidth: 130,
                  flexShrink: 0,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 11, color: c.border, marginBottom: 2 }}>{e.label}</div>
                <div style={{ fontSize: 22, fontWeight: 500, color: c.text }}>{e.amount.toLocaleString("en-US")}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
