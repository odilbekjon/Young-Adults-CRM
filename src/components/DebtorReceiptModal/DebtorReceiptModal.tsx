import type { ReactNode } from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useDebtorReceiptQuery } from "../../app/api/financeApi";
import { useStudentByIdQuery } from "../../app/api/studentsApi";
import { ReceiptModal, type ReceiptLine } from "../PaymentReceiptModal/ReceiptSheet";
import { formatDateTime, formatUzs } from "../PaymentReceiptModal/format";

// Shown from two places, backed by the same GET /finance/debtors/{studentId}
// /receipt endpoint (student, branch, date, totalPaid/totalCharged/debtAmount
// /balance, groups[{name, price}]):
//  - variant "statement" (default; Finance > Debtors' per-row action and
//    StudentProfile's "Print Payment Notice"): the "outstanding balance"
//    statement with the totals breakdown.
//  - variant "system" (StudentProfile's payments table, "system" charge rows):
//    the short check — Company, Branch, Student, Phone, Group, Course price,
//    Teacher, Payment amount, Time — with the totals appended.
// This endpoint returns no check number / teacher / creator, so those lines
// are simply left out (teacher can be supplied by the caller).
//
// The outstanding amount printed here is the student's own balance
// (GET /students/{id}.balance — the figure the profile shows), not the
// endpoint's separately computed debtAmount, so a notice can never disagree
// with the profile or the Debtors list; "Total charged" is derived from it
// (paid + outstanding). For a "system" check the charge's own amount/date
// (chargeAmount/chargeDate) are printed instead of the lifetime totals.
export const DebtorReceiptModal = ({
  open, onClose, studentId, variant = "statement", groupName, teacherName, chargeAmount, chargeDate,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string | null;
  variant?: "statement" | "system";
  // "system" variant: the charge row's own group — picks that group's price
  // out of `groups` instead of listing every enrolled group.
  groupName?: string | null;
  teacherName?: string | null;
  // "system" variant: the charge row's own amount and date.
  chargeAmount?: number | null;
  chargeDate?: string | null;
}) => {
  const { t } = useTranslation();
  const p = (key: string) => t(`settings.ceo.general.invoice.preview.${key}`);
  const { data: receipt, isFetching, isError } = useDebtorReceiptQuery(studentId ?? "", { skip: !open || !studentId });
  const { data: studentData } = useStudentByIdQuery(studentId ?? "", { skip: !open || !studentId });
  const ownBalance = studentData?.data?.balance;

  let lines: ReceiptLine[] = [];
  let banner: ReactNode = null;
  let footnote: ReactNode = null;

  if (receipt) {
    const time = formatDateTime(receipt.date) ?? formatDateTime(new Date().toISOString());
    const owed = ownBalance !== undefined ? Math.max(0, -ownBalance) : Math.abs(receipt.debtAmount);
    const charged = ownBalance !== undefined ? receipt.totalPaid + owed : receipt.totalCharged;
    const chargeDay = chargeDate ? formatDateTime(chargeDate) ?? chargeDate.slice(0, 10).split("-").reverse().join(".") : null;

    if (variant === "system") {
      const matched = groupName ? receipt.groups.find((g) => g.name === groupName) : undefined;
      const single = receipt.groups.length === 1 ? receipt.groups[0] : undefined;
      const shown = matched ?? single;
      lines = [
        { label: p("company"), value: "Young Adults" },
        { label: p("branch"), value: receipt.branch?.name },
        { label: p("student"), value: receipt.student.name },
        { label: p("phone"), value: receipt.student.phone },
        { label: p("group"), value: shown?.name ?? groupName ?? receipt.groups.map((g) => g.name).join(", ") },
        {
          label: p("coursePrice"),
          value: shown
            ? formatUzs(shown.price)
            : receipt.groups.map((g) => `${g.name}: ${formatUzs(g.price)}`).join(", "),
        },
        { label: p("teacher"), value: teacherName },
        {
          label: p("paymentAmount"),
          value: chargeAmount !== undefined && chargeAmount !== null ? formatUzs(Math.abs(chargeAmount)) : formatUzs(receipt.totalPaid),
        },
        { label: t("debtorReceipt.totalPaid") + ":", value: formatUzs(receipt.totalPaid) },
        { label: t("debtorReceipt.balance") + ":", value: owed > 0 ? formatUzs(owed) : null },
        { label: p("time"), value: chargeDay ?? time, muted: true },
      ];
    } else {
      banner = owed > 0 ? (
        <Box
          sx={{
            bgcolor: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca",
            borderRadius: 1, px: 1.5, py: 1, mb: 1.5, fontSize: 13, fontWeight: 700, textAlign: "center",
            letterSpacing: 0.4,
          }}
        >
          {t("debtorReceipt.status")}
        </Box>
      ) : null;
      lines = [
        { label: t("debtorReceipt.name") + ":", value: receipt.student.name },
        { label: t("debtorReceipt.studentId") + ":", value: receipt.student.id },
        { label: t("debtorReceipt.phone") + ":", value: receipt.student.phone },
        { label: t("debtorReceipt.group") + ":", value: receipt.groups.map((g) => g.name).join(", ") },
        { label: t("debtorReceipt.branch") + ":", value: receipt.branch?.name },
        { label: t("debtorReceipt.totalCharged") + ":", value: formatUzs(charged) },
        { label: t("debtorReceipt.totalPaid") + ":", value: formatUzs(receipt.totalPaid) },
        { label: t("debtorReceipt.balance") + ":", value: formatUzs(owed) },
        { label: t("debtorReceipt.issuedAt") + ":", value: time },
      ];
      footnote = owed > 0 ? (
        <Box sx={{ mt: 1.5, fontSize: 11, color: "#888", fontStyle: "italic" }}>
          {t("debtorReceipt.notice")}
        </Box>
      ) : null;
    }
  }

  return (
    <ReceiptModal
      open={open}
      onClose={onClose}
      title={variant === "system" ? t("paymentReceipt.title") : t("debtorReceipt.title")}
      printLabel={t("debtorReceipt.print")}
      loadError={t("debtorReceipt.loadError")}
      isLoading={isFetching}
      isError={isError}
      hasData={Boolean(receipt)}
      printId="debtor-receipt-print"
      lines={lines}
      banner={banner}
      footnote={footnote}
    />
  );
};

export default DebtorReceiptModal;
