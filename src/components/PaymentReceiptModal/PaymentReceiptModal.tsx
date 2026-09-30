import { useTranslation } from "react-i18next";
import { usePaymentReceiptQuery, usePaymentByIdQuery } from "../../app/api/financeApi";
import { formatDate } from "../../constants/FlatStudents";
import { ReceiptModal, type ReceiptLine } from "./ReceiptSheet";
import { formatDateTime, formatUzs } from "./format";

// Values the caller already knows (e.g. from StudentProfile's payments
// table row) — only used to fill in lines GET /finance/payments/{id}/receipt
// itself doesn't return; the endpoint's own values always win.
export interface PaymentReceiptFallback {
  creator?: string | null;
  createdAt?: string | null;
  groupName?: string | null;
  teacherName?: string | null;
  coursePrice?: number | null;
}

// Shown after a payment is created, and reused wherever a past payment's
// receipt needs to be viewed/printed (e.g. StudentProfile's payments table).
// Backed by GET /finance/payments/{id}/receipt — the dedicated print
// endpoint. Layout follows the reference "check": Check number, Company,
// Branch, Student, Phone, Group, Course price, Teacher, Type, Payment amount,
// Date, then the grey Creator / Time lines. Any line with no data is hidden.
export const PaymentReceiptModal = ({
  open, onClose, paymentId, fallback,
}: {
  open: boolean;
  onClose: () => void;
  paymentId: string | null;
  fallback?: PaymentReceiptFallback;
}) => {
  const { t } = useTranslation();
  const p = (key: string) => t(`settings.ceo.general.invoice.preview.${key}`);
  const { data: receipt, isFetching, isError } = usePaymentReceiptQuery(paymentId ?? "", { skip: !open || !paymentId });

  // GET /finance/payments/{id} is only asked for when the receipt endpoint
  // left teacher / course price / creator blank and the caller can't supply
  // them either — avoids a second request per print in the common case.
  const needsDetail = Boolean(
    receipt && (
      !(receipt.teacherName ?? fallback?.teacherName) ||
      (receipt.coursePrice ?? fallback?.coursePrice) == null ||
      !(receipt.creatorName ?? fallback?.creator)
    )
  );
  const { data: detail } = usePaymentByIdQuery(paymentId ?? "", { skip: !open || !paymentId || !needsDetail });

  const creator = receipt?.creatorName || fallback?.creator || detail?.createdBy || null;
  const teacher = receipt?.teacherName || fallback?.teacherName || detail?.teacherName || null;
  const coursePrice = receipt?.coursePrice ?? fallback?.coursePrice ?? detail?.coursePrice ?? null;
  const number = receipt?.receiptNumber || detail?.checkNumber || null;
  const timestamp = formatDateTime(receipt?.createdAt || fallback?.createdAt || detail?.createdAt || receipt?.date, true);

  const lines: ReceiptLine[] = receipt
    ? [
        { label: p("checkNumber"), value: number ? `№${number}` : null },
        { label: p("company"), value: "Young Adults" },
        { label: p("branch"), value: receipt.branch?.name },
        { label: p("student"), value: receipt.student.name },
        { label: p("phone"), value: receipt.student.phone },
        { label: p("group"), value: receipt.group?.name || fallback?.groupName },
        { label: p("coursePrice"), value: formatUzs(coursePrice) },
        { label: p("teacher"), value: teacher },
        { label: p("type"), value: receipt.paymentMethod },
        { label: p("paymentAmount"), value: formatUzs(receipt.amount) },
        { label: p("paidMonths"), value: receipt.paidMonths.join(", ") },
        { label: p("notes"), value: receipt.notes },
        { label: p("date"), value: receipt.date ? formatDate(receipt.date) : null },
        { label: p("creator"), value: creator, muted: true },
        { label: p("time"), value: timestamp, muted: true },
      ]
    : [];

  return (
    <ReceiptModal
      open={open}
      onClose={onClose}
      title={t("paymentReceipt.title")}
      printLabel={t("paymentReceipt.print")}
      loadError={t("paymentReceipt.loadError")}
      isLoading={isFetching}
      isError={isError}
      hasData={Boolean(receipt)}
      printId="payment-receipt-print"
      lines={lines}
    />
  );
};

export default PaymentReceiptModal;
