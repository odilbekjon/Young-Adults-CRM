import { useState } from "react";
import { Button, IconButton, Menu, MenuItem } from "@mui/material";
import { FiChevronDown, FiCornerUpLeft, FiEdit2, FiPrinter, FiXCircle } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { formatDate } from "../../../constants/FlatStudents";
import { isCompletedPaymentStatus } from "../../../app/api/financeApi";
import { formatDateTime } from "../../../components/PaymentReceiptModal/format";
import type { PaymentTx } from "./buildTransactions";
import { sectionTitleStyle } from "./styles";

const TEAL = "#26a9b8";
const COMMENT_PREVIEW = 44;

const thStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--color-text-secondary, #6b7280)",
  padding: "12px 16px",
  textAlign: "left",
  whiteSpace: "nowrap",
} as const;

const tdStyle = { padding: "12px 16px", verticalAlign: "top" } as const;

// Which of the row's actions are available. Only completed real payments can
// be refunded/removed (DELETE /finance/payments/{id}); a "system" charge is a
// computed monthly line with no payment record, so it can only be printed and
// (when its group is known) edited via PATCH /finance/debt/{studentId}/{groupId}.
const actionsFor = (tx: PaymentTx) => {
  if (tx.kind === "system") {
    return { print: true, edit: Boolean(tx.groupId), refund: false, remove: false };
  }
  const live = Boolean(tx.paymentId) && isCompletedPaymentStatus(tx.status);
  return { print: live, edit: live, refund: live, remove: live };
};

const TypeBadge = ({ tx }: { tx: PaymentTx }) => {
  const { t } = useTranslation();
  const voided = tx.kind === "payment" && !isCompletedPaymentStatus(tx.status);
  const badge = voided
    ? { label: (tx.status ?? "").toLowerCase(), bg: "#fee2e2", color: "#b91c1c" }
    : tx.kind === "payment"
      ? { label: t("studentPayments.typePayment", "payment"), bg: "#5fc236", color: "#fff" }
      : { label: t("studentPayments.typeSystem", "system"), bg: "#8b929c", color: "#fff" };
  return (
    <span style={{ background: badge.bg, color: badge.color, borderRadius: 4, padding: "2px 8px", fontSize: 12, fontWeight: 500 }}>
      {badge.label}
    </span>
  );
};

const Row = ({
  tx, index, onPrint, onOpenMenu,
}: {
  tx: PaymentTx;
  index: number;
  onPrint: (tx: PaymentTx) => void;
  onOpenMenu: (el: HTMLElement, tx: PaymentTx) => void;
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const isSystem = tx.kind === "system";
  const voided = tx.kind === "payment" && !isCompletedPaymentStatus(tx.status);
  const actions = actionsFor(tx);
  const hasMenu = actions.edit || actions.refund || actions.remove;

  const comment = tx.comment ?? "";
  const long = isSystem && comment.length > COMMENT_PREVIEW;
  const shownComment = long && !expanded ? `${comment.slice(0, COMMENT_PREVIEW)}…` : comment;
  const ts = formatDateTime(tx.createdAt, true);
  const [tsDate, tsTime] = ts ? ts.split(" ") : [null, null];

  const amountColor = voided
    ? "var(--color-text-muted, #9ca3af)"
    : isSystem ? "var(--color-text-primary, #1f2937)" : "var(--color-success, #16a34a)";

  return (
    <tr style={{ background: index % 2 === 0 ? "var(--color-surface-alt, #f5f6f8)" : "transparent" }}>
      <td style={{ ...tdStyle, fontSize: 13, whiteSpace: "nowrap", color: "var(--color-text-primary, #374151)" }}>
        {formatDate((tx.date ?? "").slice(0, 10))}
      </td>
      <td style={tdStyle}><TypeBadge tx={tx} /></td>
      <td style={{ ...tdStyle, fontSize: 15, color: amountColor, textDecoration: voided ? "line-through" : undefined }}>
        <div style={{ whiteSpace: "nowrap" }}>{isSystem ? "–" : voided ? "" : "+"}{tx.amount.toLocaleString("ru-RU")}</div>
        <div style={{ fontSize: 13 }}>UZS</div>
      </td>
      <td style={{ ...tdStyle, fontSize: 13, color: "var(--color-text-primary, #374151)", minWidth: 200 }}>
        {tx.groupName && (
          <span style={{ display: "inline-block", background: "var(--color-surface-hover, #e5e7eb)", borderRadius: 4, padding: "1px 8px", fontSize: 11, fontWeight: 600, marginRight: 6 }}>
            {tx.groupName}
          </span>
        )}
        <span style={isSystem ? { color: "var(--color-text-muted, #9ca3af)" } : undefined}>{shownComment || (isSystem ? "" : "—")}</span>
        {long && (
          <div>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              style={{ marginTop: 6, background: "var(--color-surface, #fff)", border: "1px solid var(--color-border, #d1d5db)", borderRadius: 999, padding: "3px 18px", fontSize: 12, cursor: "pointer", color: "var(--color-text-primary, #374151)" }}
            >
              {expanded ? t("studentPayments.less", "less") : t("studentPayments.more", "more")}
            </button>
          </div>
        )}
        {tx.notes && (
          <div style={{ fontSize: 12, color: "var(--color-text-muted, #9ca3af)", marginTop: 2 }}>{tx.notes}</div>
        )}
      </td>
      <td style={{ ...tdStyle, fontSize: 13 }}>
        {tx.creator && <div style={{ color: "var(--color-text-primary, #374151)" }}>{tx.creator}</div>}
        {tsDate && (
          <div style={{ color: "var(--color-text-muted, #9ca3af)" }}>
            {tsDate}<br />{tsTime}
          </div>
        )}
        {!tx.creator && !tsDate && <span style={{ color: "var(--color-text-muted, #9ca3af)" }}>—</span>}
      </td>
      <td style={{ ...tdStyle, whiteSpace: "nowrap", textAlign: "right" }}>
        {actions.print ? (
          <span style={{ display: "inline-flex", alignItems: "stretch" }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FiPrinter size={13} />}
              onClick={() => onPrint(tx)}
              sx={{
                textTransform: "none", fontSize: 13, borderColor: TEAL, color: "var(--color-text-primary, #374151)",
                borderRadius: hasMenu ? "999px 0 0 999px" : 999, borderRight: hasMenu ? "none" : undefined,
                "&:hover": { borderColor: TEAL, bgcolor: "rgba(38,169,184,0.08)" },
              }}
            >
              {t("studentPayments.printOut", "Print out")}
            </Button>
            {hasMenu && (
              <IconButton
                size="small"
                aria-label={t("studentPayments.moreActions", "More actions")}
                onClick={(e) => onOpenMenu(e.currentTarget, tx)}
                sx={{
                  border: `1px solid ${TEAL}`, borderRadius: "0 999px 999px 0", width: 30,
                  "&:hover": { bgcolor: "rgba(38,169,184,0.08)" },
                }}
              >
                <FiChevronDown size={14} />
              </IconButton>
            )}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "var(--color-text-muted, #9ca3af)" }}>—</span>
        )}
      </td>
    </tr>
  );
};

export const PaymentsTable = ({
  transactions, isLoading, isError, onPrint, onEdit, onRefund, onRemove,
}: {
  transactions: PaymentTx[];
  isLoading?: boolean;
  isError?: boolean;
  onPrint: (tx: PaymentTx) => void;
  onEdit: (tx: PaymentTx) => void;
  onRefund: (tx: PaymentTx) => void;
  onRemove: (tx: PaymentTx) => void;
}) => {
  const { t } = useTranslation();
  const [menu, setMenu] = useState<{ el: HTMLElement; tx: PaymentTx } | null>(null);
  const menuActions = menu ? actionsFor(menu.tx) : null;
  const close = () => setMenu(null);

  const headers = [
    t("studentPayments.col.date", "Date"),
    t("studentPayments.col.type", "Type"),
    t("studentPayments.col.amount", "Amount"),
    t("studentPayments.col.comment", "Comment"),
    t("studentPayments.col.creator", "Creator"),
    "",
  ];
  const stateCell = (text: string, color: string) => (
    <tr>
      <td colSpan={6} style={{ textAlign: "center", padding: 32, color, fontSize: 14 }}>{text}</td>
    </tr>
  );

  return (
    <div>
      <div style={sectionTitleStyle}>{t("studentPayments.title", "Payments")}</div>
      <div
        style={{
          background: "var(--color-surface, #fff)",
          border: "1px solid var(--color-border, #eaecf0)",
          borderRadius: 12,
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr>{headers.map((h, i) => <th key={i} style={thStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {transactions.map((tx, i) => (
              <Row key={tx.key} tx={tx} index={i} onPrint={onPrint} onOpenMenu={(el, row) => setMenu({ el, tx: row })} />
            ))}
            {isLoading && stateCell(t("studentPayments.loading", "Loading..."), "var(--color-text-muted, #9ca3af)")}
            {!isLoading && isError && stateCell(t("studentPayments.loadError", "Failed to load payments"), "var(--color-danger, #ef4444)")}
            {!isLoading && !isError && transactions.length === 0 &&
              stateCell(t("studentPayments.empty", "No payments yet"), "var(--color-text-muted, #9ca3af)")}
          </tbody>
        </table>
      </div>

      <Menu
        anchorEl={menu?.el ?? null}
        open={Boolean(menu)}
        onClose={close}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {menuActions?.refund && (
          <MenuItem onClick={() => { if (menu) onRefund(menu.tx); close(); }} sx={{ fontSize: 14, color: "#16a34a", gap: 1 }}>
            <FiCornerUpLeft size={15} /> {t("studentPayments.menu.refund", "Refund")}
          </MenuItem>
        )}
        {menuActions?.edit && (
          <MenuItem onClick={() => { if (menu) onEdit(menu.tx); close(); }} sx={{ fontSize: 14, color: "#d97706", gap: 1 }}>
            <FiEdit2 size={15} /> {t("studentPayments.menu.edit", "Edit")}
          </MenuItem>
        )}
        {menuActions?.remove && (
          <MenuItem onClick={() => { if (menu) onRemove(menu.tx); close(); }} sx={{ fontSize: 14, color: "#dc2626", gap: 1 }}>
            <FiXCircle size={15} /> {t("studentPayments.menu.remove", "Remove")}
          </MenuItem>
        )}
      </Menu>
    </div>
  );
};
