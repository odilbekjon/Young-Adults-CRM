import { Dialog, DialogTitle, DialogContent, IconButton, CircularProgress, Button, Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { FiX, FiPrinter } from "react-icons/fi";
import { usePaymentReceiptQuery } from "../../app/api/financeApi";
import { formatDate } from "../../constants/FlatStudents";
import logo from "../../assets/logo_ya_black.png";

const formatDateTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ReceiptRow = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div style={{ fontSize: 13, color: "#333", marginBottom: 4 }}>
      <strong>{label}</strong> {value}
    </div>
  );
};

// Shown after a payment is created, and reused wherever a past payment's
// receipt needs to be viewed/printed (e.g. StudentProfile's payments table).
// Backed by GET /finance/payments/{id}/receipt — the dedicated print
// endpoint, distinct from the plain GET /finance/payments/{id} detail route.
export const PaymentReceiptModal = ({
  open, onClose, paymentId,
}: {
  open: boolean;
  onClose: () => void;
  paymentId: string | null;
}) => {
  const { t } = useTranslation();
  const { data: payment, isFetching, isError } = usePaymentReceiptQuery(paymentId ?? "", { skip: !open || !paymentId });

  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #payment-receipt-print, #payment-receipt-print * { visibility: visible; }
          #payment-receipt-print { position: fixed; inset: 0; padding: 24px; }
        }
      `}</style>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 18, fontWeight: 600 }}>
        {t("paymentReceipt.title")}
        <IconButton size="small" onClick={onClose}><FiX size={20} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, pb: 4 }}>
        {isFetching ? (
          <Box sx={{ py: 6 }}><CircularProgress size={24} /></Box>
        ) : isError || !payment ? (
          <Box sx={{ py: 6, fontSize: 14, color: "#ef4444" }}>{t("paymentReceipt.loadError")}</Box>
        ) : (
          <Box
            id="payment-receipt-print"
            sx={{
              width: "100%",
              background: "#fff",
              position: "relative",
              "&::before, &::after": {
                content: '""',
                display: "block",
                height: 8,
                background: "repeating-linear-gradient(90deg, #e0e0e0 0px, #e0e0e0 8px, transparent 8px, transparent 16px)",
              },
            }}
          >
            <Box sx={{ px: 3, py: 2.5, border: "1px solid #eee", borderTop: "none", borderBottom: "none" }}>
              <img src={logo} alt="Young Adults" width={100} style={{ display: "block", margin: "0 auto 16px" }} />

              <ReceiptRow label={`${t("settings.ceo.general.invoice.preview.checkNumber")}`} value={payment.checkNumber ? `№${payment.checkNumber}` : null} />
              <ReceiptRow label={t("settings.ceo.general.invoice.preview.company")} value="Young Adults" />
              <ReceiptRow label={t("settings.ceo.general.invoice.preview.branch")} value={payment.branchName} />
              <ReceiptRow label={t("settings.ceo.general.invoice.preview.student")} value={payment.studentName} />
              <ReceiptRow label={t("settings.ceo.general.invoice.preview.phone")} value={payment.studentPhone} />
              <ReceiptRow label={t("settings.ceo.general.invoice.preview.type")} value={payment.paymentMethodName} />
              <ReceiptRow label={t("settings.ceo.general.invoice.preview.paymentAmount")} value={`${payment.amount.toLocaleString("ru-RU")} UZS`} />
              <ReceiptRow label={t("settings.ceo.general.invoice.preview.date")} value={payment.date ? formatDate(payment.date) : null} />

              <Box sx={{ mt: 2, "& > div": { fontSize: 11, color: "#888" } }}>
                <ReceiptRow label={t("settings.ceo.general.invoice.preview.creator")} value={payment.createdBy} />
                <ReceiptRow label={t("settings.ceo.general.invoice.preview.time")} value={formatDateTime(payment.createdAt) || null} />
              </Box>
            </Box>
          </Box>
        )}

        {!isFetching && !isError && payment && (
          <Button
            variant="contained"
            startIcon={<FiPrinter />}
            onClick={handlePrint}
            sx={{ borderRadius: 999, textTransform: "none", bgcolor: "#26a9b8", px: 4, "&:hover": { bgcolor: "#1f8c99" } }}
          >
            {t("paymentReceipt.print")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentReceiptModal;
