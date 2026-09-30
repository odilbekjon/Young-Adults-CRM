// TEACHER-role "Salary" page — the teacher's own published/paid payroll
// history from GET /teacher-portal/salaries. Same table as the admin
// TeacherProfile salary tab (period / status / calculated / paid) plus the
// payment date, but themed with the app's CSS variables so it follows dark
// mode. The endpoint takes no period parameter, so the period picker filters
// the returned list client-side.
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import { useTeacherPortalSalariesQuery } from "../../app/api/teacherPortalApi";
import { formatTrainingDate } from "../../utils/formatTrainingDate";

const periodKey = (year: number | null, month: number | null) =>
  year && month ? `${year}-${String(month).padStart(2, "0")}` : "";

const formatMoney = (value: number) => value.toLocaleString("ru-RU");

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  PAID: { bg: "rgba(34,197,94,0.15)", fg: "#16a34a" },
  PUBLISHED: { bg: "rgba(59,130,246,0.15)", fg: "#2563eb" },
  DRAFT: { bg: "rgba(148,163,184,0.2)", fg: "var(--color-text-muted)" },
};

const COLUMNS = ["period", "status", "total", "paid", "paidAt"] as const;

export const TeacherSalary = () => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState("");
  const { data, isLoading, isError, refetch } = useTeacherPortalSalariesQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const all = useMemo(
    () =>
      [...(data ?? [])].sort((a, b) =>
        periodKey(b.periodYear, b.periodMonth).localeCompare(periodKey(a.periodYear, a.periodMonth)),
      ),
    [data],
  );
  const periods = useMemo(
    () => [...new Set(all.map((r) => periodKey(r.periodYear, r.periodMonth)).filter(Boolean))],
    [all],
  );
  const rows = useMemo(
    () => (selected ? all.filter((r) => periodKey(r.periodYear, r.periodMonth) === selected) : all),
    [all, selected],
  );

  const totalCalculated = rows.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalPaid = rows.reduce((sum, r) => sum + r.paidAmount, 0);

  const statusLabel = (status: string) => {
    const key = status.toLowerCase();
    return ["draft", "published", "paid"].includes(key) ? t(`teacherSalary.status.${key}`) : status || "—";
  };
  const periodLabel = (year: number | null, month: number | null) =>
    year && month ? `${String(month).padStart(2, "0")}.${year}` : "—";

  const thSx = {
    px: 2, py: 1.5, fontSize: 13, fontWeight: 500, color: "var(--color-text-muted)",
    textAlign: "left" as const, borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" as const,
  };
  const tdSx = {
    px: 2, py: 1.5, fontSize: 13.5, color: "var(--color-text-primary)",
    borderBottom: "1px solid var(--color-border-subtle)", whiteSpace: "nowrap" as const,
  };
  const messageRow = (content: React.ReactNode) => (
    <tr>
      <Box component="td" colSpan={COLUMNS.length} sx={{ textAlign: "center", py: 5 }}>{content}</Box>
    </tr>
  );

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "var(--color-bg-page)", pt: 3, px: { xs: 2, md: 4 }, pb: 6 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)" }}>
            {t("teacherSalary.title")}
          </Typography>
          <Typography sx={{ fontSize: 13, color: "var(--color-text-muted)" }}>{t("teacherSalary.subtitle")}</Typography>
        </Box>
        <Box
          component="select"
          value={selected}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelected(e.target.value)}
          aria-label={t("teacherSalary.period")}
          sx={{
            border: "1px solid var(--color-border)", borderRadius: "8px", px: 1.5, py: 0.9, fontSize: 13,
            color: "var(--color-text-primary)", background: "var(--color-surface)", outline: "none", cursor: "pointer",
          }}
        >
          <option value="">{t("teacherSalary.allPeriods")}</option>
          {periods.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Box>
      </Box>

      <Box sx={{
        display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5, mb: 2.5, maxWidth: 640,
        "@media(max-width:560px)": { gridTemplateColumns: "1fr" },
      }}>
        {[
          { label: t("teacherSalary.totalCalculated"), value: totalCalculated },
          { label: t("teacherSalary.totalPaid"), value: totalPaid },
        ].map((card) => (
          <Paper
            key={card.label}
            elevation={0}
            sx={{ px: 2, py: 1.75, borderRadius: "12px", border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
          >
            <Typography sx={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{card.label}</Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: "var(--color-primary)", lineHeight: 1.25 }}>
              {isLoading || isError ? "—" : formatMoney(card.value)}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Paper
        elevation={0}
        sx={{ borderRadius: "12px", border: "1px solid var(--color-border)", background: "var(--color-surface)", overflow: "hidden" }}
      >
        <Box sx={{ overflowX: "auto" }}>
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr>
                {COLUMNS.map((k) => (
                  <Box component="th" key={k} sx={thSx}>{t(`teacherSalary.table.${k}`)}</Box>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? messageRow(<CircularProgress size={24} />)
                : isError
                  ? messageRow(
                      <>
                        <Typography sx={{ fontSize: 14, color: "var(--color-danger)", mb: 1.5 }}>
                          {t("teacherSalary.loadError")}
                        </Typography>
                        <Button size="small" variant="outlined" onClick={() => refetch()} sx={{ textTransform: "none" }}>
                          {t("teacherDashboard.schedule.retry")}
                        </Button>
                      </>,
                    )
                  : rows.length === 0
                    ? messageRow(
                        <Typography sx={{ fontSize: 14, color: "var(--color-text-muted)" }}>{t("teacherSalary.empty")}</Typography>,
                      )
                    : rows.map((r) => {
                        const color = STATUS_COLORS[r.status] ?? STATUS_COLORS.DRAFT;
                        return (
                          <tr key={r.id}>
                            <Box component="td" sx={tdSx}>{periodLabel(r.periodYear, r.periodMonth)}</Box>
                            <Box component="td" sx={tdSx}>
                              <Box
                                component="span"
                                sx={{ px: 1.1, py: 0.3, borderRadius: "999px", fontSize: 12, fontWeight: 600, background: color.bg, color: color.fg }}
                              >
                                {statusLabel(r.status)}
                              </Box>
                            </Box>
                            <Box component="td" sx={tdSx}>{formatMoney(r.totalAmount)}</Box>
                            <Box component="td" sx={tdSx}>{formatMoney(r.paidAmount)}</Box>
                            <Box component="td" sx={tdSx}>{r.paidAt ? formatTrainingDate(r.paidAt) : "—"}</Box>
                          </tr>
                        );
                      })}
            </tbody>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default TeacherSalary;
