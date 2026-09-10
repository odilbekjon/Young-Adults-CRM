import { Dialog, DialogTitle, DialogContent, IconButton, CircularProgress, Button, Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { FiX, FiPrinter } from "react-icons/fi";
import { useDebtorReceiptQuery } from "../../app/api/financeApi";
import logo from "../../assets/logo_ya_black.png";

const ReceiptRow = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div style={{ fontSize: 13, color: "#333", marginBottom: 4 }}>
      <strong>{label}</strong> {value}
    </div>
  );
};

// Shown from the Debtors table's per-row "receipt" action. Backed by
// GET /finance/debtors/{studentId}/receipt — same print-style layout as
// PaymentReceiptModal, which backs GET /finance/payments/{id} instead.
export const DebtorReceiptModal = ({
  open, onClose, studentId,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string | null;
}) => {
  const { t } = useTranslation();
  const { data: receipt, isFetching, isError } = useDebtorReceiptQuery(studentId ?? "", { skip: !open || !studentId });

  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #debtor-receipt-print, #debtor-receipt-print * { visibility: visible; }
          #debtor-receipt-print { position: fixed; inset: 0; padding: 24px; }
        }
      `}</style>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 18, fontWeight: 600 }}>
        {t("debtorReceipt.title")}
        <IconButton size="small" onClick={onClose}><FiX size={20} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, pb: 4 }}>
        {isFetching ? (
          <Box sx={{ py: 6 }}><CircularProgress size={24} /></Box>
        ) : isError || !receipt ? (
          <Box sx={{ py: 6, fontSize: 14, color: "#ef4444" }}>{t("debtorReceipt.loadError")}</Box>
        ) : (
          <Box
            id="debtor-receipt-print"
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

              <ReceiptRow label={t("debtorReceipt.name")} value={receipt.name} />
              <ReceiptRow label={t("debtorReceipt.phone")} value={receipt.phone} />
              <ReceiptRow label={t("debtorReceipt.group")} value={receipt.groupName} />
              <ReceiptRow label={t("debtorReceipt.branch")} value={receipt.branchName} />
              <ReceiptRow label={t("debtorReceipt.balance")} value={`${receipt.balance.toLocaleString("ru-RU")} UZS`} />
            </Box>
          </Box>
        )}

        {!isFetching && !isError && receipt && (
          <Button
            variant="contained"
            startIcon={<FiPrinter />}
            onClick={handlePrint}
            sx={{ borderRadius: 999, textTransform: "none", bgcolor: "#26a9b8", px: 4, "&:hover": { bgcolor: "#1f8c99" } }}
          >
            {t("debtorReceipt.print")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DebtorReceiptModal;
