import {
  Box, Typography, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useStudentPortalPaymentsQuery } from "../../../app/api/studentPortalApi";
import { formatDate } from "../../../constants/FlatStudents";

export const StudentPortalPayments = () => {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useStudentPortalPaymentsQuery();
  const rows = data ?? [];

  return (
    <Box>
      <Typography fontSize={22} fontWeight={700} color="var(--color-text-primary)" mb={2.5}>
        {t("studentPortal.payments.title")}
      </Typography>

      <Paper sx={{ borderRadius: "12px", overflow: "hidden", border: "1px solid var(--color-border)" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 600, fontSize: 13, color: "var(--color-text-secondary)", bgcolor: "var(--color-surface-alt)" } }}>
                <TableCell>{t("studentPortal.payments.date")}</TableCell>
                <TableCell>{t("studentPortal.payments.amount")}</TableCell>
                <TableCell>{t("studentPortal.payments.method")}</TableCell>
                <TableCell>{t("studentPortal.payments.comment")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : isError ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: "var(--color-danger)" }}>{t("studentPortal.payments.loadError")}</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: "var(--color-text-muted)" }}>{t("studentPortal.payments.empty")}</TableCell></TableRow>
              ) : (
                rows.map((p) => (
                  <TableRow key={p.id} sx={{ "& td": { fontSize: 13, borderBottom: "1px solid var(--color-border)" } }}>
                    <TableCell>{p.date ? formatDate(p.date) : "—"}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "var(--color-success)" }}>{p.amount.toLocaleString("ru-RU")} UZS</TableCell>
                    <TableCell>{p.method || "—"}</TableCell>
                    <TableCell>{p.comment || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default StudentPortalPayments;
