// Profile tab of the TEACHER Account page (TeacherAccount renders this for
// /profile; Profile.tsx swaps that page in for the admin staff profile when
// the session is a TEACHER — see the wrapper at the bottom of Profile.tsx).
// Same 3-column layout as the admin TeacherProfile page: own info card |
// own groups (TeacherAccountGroups) | selected group's roster. Read-only:
// GET /teacher-portal/profile, falling back to GET /auth/me for the
// phone/photo/branches the portal payload may omit.
import { useTranslation } from "react-i18next";
import { Avatar, Box, Button, Chip, CircularProgress, Paper, Typography } from "@mui/material";
import { useTeacherPortalProfileQuery } from "../../app/api/teacherPortalApi";
import { formatPhone } from "../../utils";
import { useAuth } from "../../hooks/useAuth";
import { TeacherAccountGroups } from "../TeacherAccount/TeacherAccountGroups";
import { formatTrainingDate } from "../../utils/formatTrainingDate";

const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Box sx={{ mb: 1.75 }}>
    <Typography sx={{ color: "var(--color-text-muted)", fontSize: 13, mb: 0.3 }}>{label}</Typography>
    <Box sx={{ fontSize: 14.5, fontWeight: 500, color: "var(--color-text-primary)", wordBreak: "break-word" }}>{children}</Box>
  </Box>
);

export const TeacherOwnProfile = () => {
  const { t } = useTranslation();
  const { data: profile, isLoading, isError, refetch } = useTeacherPortalProfileQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const { user: me } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ minHeight: "60vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !profile) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" mb={1.5}>{t("teacherPortal.profile.loadError")}</Typography>
        <Button variant="outlined" size="small" onClick={() => refetch()} sx={{ textTransform: "none" }}>
          {t("teacherDashboard.schedule.retry")}
        </Button>
      </Box>
    );
  }

  const displayName = profile.name || me?.name || profile.email || "—";
  const phone = formatPhone(profile.phone || me?.phone);
  const photoUrl = profile.photo || me?.photo || undefined;
  const branchNames = profile.branches.length > 0
    ? profile.branches.map((b) => ({ key: b.id || b.name, name: b.name }))
    : profile.branchName
      ? [{ key: profile.branchName, name: profile.branchName }]
      : (me?.branches ?? []).map((b) => ({ key: b.branch.id, name: b.branch.name }));
  const shortId = profile.id.length > 12 ? `${profile.id.slice(0, 8)}…` : profile.id;

  return (
    <Box className="teacher-profile-grid" sx={{ gap: 3, alignItems: "start" }}>
      {/* ── Info card ── */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 2, p: { xs: 2, md: 2.5 }, minWidth: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Avatar src={photoUrl} sx={{ width: 72, height: 72, bgcolor: "#b0bec5", fontSize: 28 }}>
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="h6" fontWeight={500} sx={{ color: "var(--color-text-primary)", wordBreak: "break-word" }}>
            {displayName}
          </Typography>
        </Box>

        {profile.id && (
          <Typography sx={{ color: "var(--color-text-muted)", fontSize: 13, mb: 0.5 }} title={profile.id}>
            (id: {shortId})
          </Typography>
        )}
        <Typography sx={{ color: "var(--color-text-muted)", fontSize: 14, mb: 2 }}>
          {t("teacherPortal.profile.phone")}:{" "}
          <Box component="span" sx={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{phone || "—"}</Box>
        </Typography>

        <InfoRow label={`${t("teacherPortal.profile.roles")}:`}>
          <Chip
            label={t("teacherPortal.profile.teacherRole")}
            size="small"
            variant="outlined"
            sx={{ borderColor: "#1a5490", color: "#1a5490", fontSize: 12, height: 26, borderRadius: "20px" }}
          />
        </InfoRow>
        <InfoRow label={`${t("teacherPortal.profile.branches")}:`}>
          {branchNames.length > 0 ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {branchNames.map((b) => (
                <Chip
                  key={b.key}
                  label={b.name}
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: "#0F6E56", color: "#0F6E56", fontSize: 12, height: 26, borderRadius: "20px" }}
                />
              ))}
            </Box>
          ) : (
            "—"
          )}
        </InfoRow>

        {(profile.email || profile.specialization || profile.birthdate) && (
          <Box sx={{ borderTop: "1px solid var(--color-border)", mt: 2, pt: 2 }}>
            {profile.email && <InfoRow label={t("teacherPortal.profile.email")}>{profile.email}</InfoRow>}
            {profile.specialization && (
              <InfoRow label={t("teacherPortal.profile.specialization")}>{profile.specialization}</InfoRow>
            )}
            {profile.birthdate && (
              <InfoRow label={t("teacherPortal.profile.birthdate")}>{formatTrainingDate(profile.birthdate)}</InfoRow>
            )}
          </Box>
        )}
      </Paper>

      {/* ── Own groups + selected group's roster ── */}
      <TeacherAccountGroups />
    </Box>
  );
};

export default TeacherOwnProfile;
