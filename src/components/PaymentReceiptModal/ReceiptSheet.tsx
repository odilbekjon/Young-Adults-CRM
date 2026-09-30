import { useState, type ReactNode } from "react";
import { Dialog, DialogTitle, DialogContent, IconButton, CircularProgress, Button, Box } from "@mui/material";
import { FiX, FiPrinter } from "react-icons/fi";
import logo from "../../assets/logo_ya_black.png";

export interface ReceiptLine {
  label: string;
  value?: string | null;
  // Rendered in the lighter grey used for the trailing Creator/Time lines.
  muted?: boolean;
}

const Line = ({ label, value, muted }: ReceiptLine) => {
  if (!value) return null;
  return (
    <div style={{ fontSize: 13, color: muted ? "#9ca3af" : "#333", marginBottom: 4, lineHeight: 1.45 }}>
      <strong style={{ fontWeight: 600, color: muted ? "#9ca3af" : "#222" }}>{label}</strong> {value}
    </div>
  );
};

// The bundled logo asset (src/assets/logo_ya_black.png) is a valid PNG, but
// a receipt must never show a browser "broken image" icon if it ever fails
// to load (blocked/cached-bad asset) — it falls back to the plain wordmark.
const ReceiptLogo = () => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div style={{ textAlign: "center", margin: "0 auto 16px", fontSize: 20, fontWeight: 800, lineHeight: 1, color: "#111" }}>
        young<br />adults
      </div>
    );
  }
  return (
    <img
      src={logo}
      alt="Young Adults"
      width={110}
      onError={() => setFailed(true)}
      style={{ display: "block", margin: "0 auto 16px", maxWidth: "60%", height: "auto" }}
    />
  );
};

// Shared print-ready "check" (receipt) used by PaymentReceiptModal (real
// payment) and DebtorReceiptModal (system charge / balance statement): the
// same logo + scalloped-paper layout + Print button, only the lines differ.
export const ReceiptModal = ({
  open, onClose, title, printLabel, loadError, isLoading, isError, hasData, printId, lines, banner, footnote,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  printLabel: string;
  loadError: string;
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
  printId: string;
  lines: ReceiptLine[];
  banner?: ReactNode;
  footnote?: ReactNode;
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2, maxWidth: 400 } }}>
    <style>{`
      @media print {
        body * { visibility: hidden !important; }
        #${printId}, #${printId} * { visibility: visible !important; }
        #${printId} { position: fixed; top: 0; left: 0; width: 80mm; padding: 4mm; box-shadow: none; }
      }
    `}</style>
    <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 18, fontWeight: 600 }}>
      {title}
      <IconButton size="small" onClick={onClose}><FiX size={20} /></IconButton>
    </DialogTitle>
    <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, pb: 4 }}>
      {isLoading ? (
        <Box sx={{ py: 6 }}><CircularProgress size={24} /></Box>
      ) : isError || !hasData ? (
        <Box sx={{ py: 6, fontSize: 14, color: "var(--color-danger, #ef4444)", textAlign: "center" }}>{loadError}</Box>
      ) : (
        <Box
          id={printId}
          sx={{
            width: "100%",
            background: "#fff",
            color: "#222",
            boxShadow: "0 2px 14px rgba(0,0,0,0.12)",
            "&::before, &::after": {
              content: '""',
              display: "block",
              height: 8,
              background: "repeating-linear-gradient(90deg, #e5e7eb 0px, #e5e7eb 8px, transparent 8px, transparent 16px)",
            },
          }}
        >
          <Box sx={{ px: 3, py: 2.5 }}>
            <ReceiptLogo />
            {banner}
            {lines.map((l) => <Line key={l.label} {...l} />)}
            {footnote}
          </Box>
        </Box>
      )}

      {!isLoading && !isError && hasData && (
        <Button
          variant="contained"
          startIcon={<FiPrinter />}
          onClick={() => window.print()}
          sx={{ borderRadius: 999, textTransform: "none", bgcolor: "#26a9b8", px: 4, "&:hover": { bgcolor: "#1f8c99" } }}
        >
          {printLabel}
        </Button>
      )}
    </DialogContent>
  </Dialog>
);
