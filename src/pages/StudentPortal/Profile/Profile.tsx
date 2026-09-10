import { Box, Paper, Typography, CircularProgress, Avatar, Divider, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useStudentPortalProfileQuery } from "../../../app/api/studentPortalApi";
import { formatLongDate } from "../../../constants/FlatStudents";

const Field = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography fontSize={12} color="var(--color-text-muted)">{label}</Typography>
    <Typography fontSize={14} color="var(--color-text-primary)" fontWeight={500}>{value || "—"}</Typography>
  </Box>
);

export const StudentPortalProfile = () => {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useStudentPortalProfileQuery();

  return (
    <Box>
      <Typography fontSize={22} fontWeight={700} color="var(--color-text-primary)" mb={2.5}>
        {t("studentPortal.profile.title")}
      </Typography>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress size={26} /></Box>
      ) : isError || !data ? (
        <Typography color="var(--color-danger)" fontSize={14}>{t("studentPortal.profile.loadError")}</Typography>
      ) : (
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
          <Paper elevation={0} sx={{ width: 320, p: 3, borderRadius: "12px", border: "1px solid var(--color-border)", bgcolor: "var(--color-surface)" }}>
            <Stack alignItems="center" gap={1} mb={2.5}>
              <Avatar src={data.photo ?? undefined} sx={{ width: 72, height: 72, fontSize: 24, bgcolor: "var(--color-primary)" }}>
                {data.name?.slice(0, 1).toUpperCase()}
              </Avatar>
              <Typography fontSize={16} fontWeight={700} color="var(--color-text-primary)">{data.name}</Typography>
            </Stack>
            <Stack gap={1.5}>
              <Field label={t("studentPortal.profile.phone")} value={data.phone ?? ""} />
              <Field label={t("studentPortal.profile.email")} value={data.email ?? ""} />
              <Field label={t("studentPortal.profile.branch")} value={data.branchName ?? ""} />
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ flex: 1, minWidth: 280, p: 3, borderRadius: "12px", border: "1px solid var(--color-border)", bgcolor: "var(--color-surface)" }}>
            <Typography fontSize={14} fontWeight={700} color="var(--color-text-primary)" mb={1.5}>
              {t("studentPortal.profile.comments")}
            </Typography>
            {data.comments.length === 0 ? (
              <Typography fontSize={13} color="var(--color-text-muted)">{t("studentPortal.profile.noComments")}</Typography>
            ) : (
              <Stack divider={<Divider />} gap={1.5}>
                {data.comments.map((c) => (
                  <Box key={c.id}>
                    <Typography fontSize={13} color="var(--color-text-primary)">{c.text}</Typography>
                    <Typography fontSize={11.5} color="var(--color-text-muted)" mt={0.3}>
                      {[c.author, c.createdAt ? formatLongDate(c.createdAt) : null].filter(Boolean).join(" · ")}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default StudentPortalProfile;
