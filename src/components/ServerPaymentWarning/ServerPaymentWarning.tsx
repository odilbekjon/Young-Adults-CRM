// Reminds SUPERADMIN/CEO accounts that the monthly server payment is close, so
// the system doesn't go down because the term ran out unnoticed. The backend
// puts the reminder on GET /auth/me (already loaded for every session, so this
// costs no request) and says when to warn (`isWarning`: 5 days or fewer before
// the payment day) - see utils/serverPayment.ts. Closing it silences it for the
// rest of the day; the next day it asks again until the payment date has passed.
import { useMemo, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, IconButton, Typography } from "@mui/material";
import { MdClose, MdWarningAmber } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { readServerPayment } from "../../utils/serverPayment";
import { todayLocalISO } from "../../utils/localDate";

const DISMISSED_KEY = "SERVER_PAYMENT_WARNING_DISMISSED";

// Storage can be unavailable (private mode, blocked site data): the reminder
// then simply shows again, which is the safe side.
const readDismissed = (): string | null => {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
};

const writeDismissed = (value: string) => {
  try {
    localStorage.setItem(DISMISSED_KEY, value);
  } catch {
    /* ignore */
  }
};

const formatDate = (iso: string): string => {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}.${m}.${y}` : iso;
};

export const ServerPaymentWarning = () => {
  const { t } = useTranslation();
  const { user, isCeo } = useAuth();
  const warning = useMemo(() => (isCeo ? readServerPayment(user) : null), [isCeo, user]);

  // One mark per payment date and calendar day: closing today's reminder does
  // not hide tomorrow's, nor next month's.
  const mark = warning ? `${warning.nextPaymentDate ?? ""}|${todayLocalISO()}` : "";
  const [dismissedMark, setDismissedMark] = useState<string | null>(readDismissed);

  if (!warning?.isWarning || dismissedMark === mark) return null;

  const close = () => {
    writeDismissed(mark);
    setDismissedMark(mark);
  };

  const days = warning.daysLeft;
  const date = warning.nextPaymentDate ? formatDate(warning.nextPaymentDate) : "";
  const headline =
    days === null ? t("layout.serverPayment.soon")
    : days <= 0 ? t("layout.serverPayment.today")
    : t("layout.serverPayment.daysLeft", { days });

  return (
    <Dialog
      open
      onClose={close}
      PaperProps={{ sx: { borderRadius: 3, width: 440, maxWidth: "95vw", border: "1px solid #f0b429" } }}
    >
      <Box sx={{ display: "flex", justifyContent: "flex-end", px: 1.5, pt: 1.5 }}>
        <IconButton size="small" onClick={close} aria-label={t("layout.serverPayment.close")} sx={{ color: "var(--color-text-muted)" }}>
          <MdClose size={18} />
        </IconButton>
      </Box>
      <DialogContent sx={{ px: 3, pt: 0, pb: 2, textAlign: "center" }}>
        <Box
          sx={{
            width: 56, height: 56, borderRadius: "50%", mx: "auto", mb: 1.5,
            bgcolor: "#fff4d6", color: "#d9930d",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <MdWarningAmber size={32} />
        </Box>
        <Typography fontWeight={700} fontSize={17} color="var(--color-text-primary)" mb={0.75}>
          {t("layout.serverPayment.title")}
        </Typography>
        <Typography fontWeight={600} fontSize={15} color="#d9930d" mb={1}>
          {headline}
        </Typography>
        <Typography fontSize={13} color="var(--color-text-secondary)">
          {date ? t("layout.serverPayment.description", { date }) : t("layout.serverPayment.descriptionNoDate")}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center", pb: 3, px: 3 }}>
        <Button
          variant="contained"
          onClick={close}
          sx={{
            borderRadius: 999, textTransform: "none", bgcolor: "#d9930d", fontSize: 14, fontWeight: 600,
            px: 5, py: 1.1, boxShadow: "none", "&:hover": { bgcolor: "#bf800a", boxShadow: "none" },
          }}
        >
          {t("layout.serverPayment.understood")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ServerPaymentWarning;
