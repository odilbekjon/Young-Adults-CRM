import {
  Box, Typography, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useStudentPortalAttendancesQuery } from "../../../app/api/studentPortalApi";
import { formatDate } from "../../../constants/FlatStudents";

const statusColor = (status: string) => {
  if (status === "PRESENT") return { bg: "#dcfce7", color: "#15803d" };
  if (status === "ABSENT") return { bg: "#fee2e2", color: "#b91c1c" };
  return { bg: "#fef3c7", color: "#92400e" };
};

export const StudentPortalAttendance = () => {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useStudentPortalAttendancesQuery();
  const rows = data ?? [];

  return (
    <Box>
      <Typography fontSize={22} fontWeight={700} color="var(--color-text-primary)" mb={2.5}>
        {t("studentPortal.attendance.title")}
      </Typography>

      <Paper sx={{ borderRadius: "12px", overflow: "hidden", border: "1px solid var(--color-border)" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 600, fontSize: 13, color: "var(--color-text-secondary)", bgcolor: "var(--color-surface-alt)" } }}>
                <TableCell>{t("studentPortal.attendance.date")}</TableCell>
                <TableCell>{t("studentPortal.attendance.group")}</TableCell>
                <TableCell>{t("studentPortal.attendance.status")}</TableCell>
                <TableCell>{t("studentPortal.attendance.reason")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : isError ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: "var(--color-danger)" }}>{t("studentPortal.attendance.loadError")}</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: "var(--color-text-muted)" }}>{t("studentPortal.attendance.empty")}</TableCell></TableRow>
              ) : (
                rows.map((r, i) => {
                  const c = statusColor(r.status);
                  return (
                    <TableRow key={`${r.date}-${i}`} sx={{ "& td": { fontSize: 13, borderBottom: "1px solid var(--color-border)" } }}>
                      <TableCell>{formatDate(r.date)}</TableCell>
                      <TableCell>{r.groupName || "—"}</TableCell>
                      <TableCell>
                        <Chip
                          label={t(`studentPortal.attendance.statuses.${r.status.toLowerCase()}`, { defaultValue: r.status })}
                          size="small"
                          sx={{ bgcolor: c.bg, color: c.color, fontWeight: 600, fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell>{r.reason || "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default StudentPortalAttendance;
