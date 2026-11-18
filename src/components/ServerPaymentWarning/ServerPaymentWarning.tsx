// A slim yellow notice at the top of every staff page, telling SUPERADMIN/CEO
// accounts that the monthly server payment is close, so the system doesn't go
// down because the term ran out unnoticed. The backend puts the reminder on GET
// /auth/me (already loaded for every session, so this costs no request) and says
// when to warn (`isWarning`: 5 days or fewer before the payment day) - see
// utils/serverPayment.ts. It is not dismissible: once the warning period starts it
// stays on every page until the backend stops sending `isWarning` (the payment
// day has passed and the next one is not close yet).
import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { MdWarningAmber } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { readServerPayment } from "../../utils/serverPayment";

const formatDate = (iso: string): string => {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}.${m}.${y}` : iso;
};

export const ServerPaymentWarning = () => {
  const { t } = useTranslation();
  const { user, isCeo } = useAuth();
  const warning = useMemo(() => (isCeo ? readServerPayment(user) : null), [isCeo, user]);

  if (!warning?.isWarning) return null;

  const days = warning.daysLeft;
  const date = warning.nextPaymentDate ? formatDate(warning.nextPaymentDate) : "";
  const headline =
    days === null ? t("layout.serverPayment.soon")
    : days <= 0 ? t("layout.serverPayment.today")
    : t("layout.serverPayment.daysLeft", { days });

  return (
    <Box
      role="alert"
      sx={{
        mx: { xs: 2, md: 3 }, mt: 1.5,
        px: 1.5, py: 0.75,
        display: "flex", alignItems: "center", gap: 1.25,
        bgcolor: "#fff4cc", border: "1px solid #f0c040", borderRadius: "10px",
        color: "#6b4e00",
      }}
    >
      <Box sx={{ display: "flex", color: "#d9930d", flexShrink: 0 }}>
        <MdWarningAmber size={20} />
      </Box>
      <Typography fontSize={13} lineHeight={1.35} sx={{ color: "inherit" }}>
        <b>{t("layout.serverPayment.title")}</b>{" "}
        {headline}
        {date ? ` (${date})` : ""}. {t("layout.serverPayment.description")}
      </Typography>
    </Box>
  );
};

export default ServerPaymentWarning;
