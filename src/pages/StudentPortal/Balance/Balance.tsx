import { Box, Paper, Typography, CircularProgress } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useStudentPortalBalanceQuery } from "../../../app/api/studentPortalApi";

const money = (n: number) => n.toLocaleString("ru-RU");

const SummaryCard = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <Paper
    elevation={0}
    sx={{
      flex: 1, minWidth: 200, p: 2.5, borderRadius: "12px",
      border: "1px solid var(--color-border)", bgcolor: "var(--color-surface)",
    }}
  >
    <Typography fontSize={13} fontWeight={600} color="var(--color-text-secondary)" mb={1}>{label}</Typography>
    <Typography fontSize={26} fontWeight={700} color={color ?? "var(--color-text-primary)"}>{value} UZS</Typography>
  </Paper>
);

export const StudentPortalBalance = () => {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useStudentPortalBalanceQuery();

  return (
    <Box>
      <Typography fontSize={22} fontWeight={700} color="var(--color-text-primary)" mb={2.5}>
        {t("studentPortal.balance.title")}
      </Typography>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress size={26} /></Box>
      ) : isError ? (
        <Typography color="var(--color-danger)" fontSize={14}>{t("studentPortal.balance.loadError")}</Typography>
      ) : (
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <SummaryCard
            label={t("studentPortal.balance.balance")}
            value={money(data?.balance ?? 0)}
            color={(data?.balance ?? 0) < 0 ? "var(--color-danger)" : "var(--color-success)"}
          />
          <SummaryCard label={t("studentPortal.balance.paidAmount")} value={money(data?.paidAmount ?? 0)} />
          <SummaryCard label={t("studentPortal.balance.debt")} value={money(data?.debt ?? 0)} color={(data?.debt ?? 0) > 0 ? "var(--color-danger)" : undefined} />
        </Box>
      )}
    </Box>
  );
};

export default StudentPortalBalance;
