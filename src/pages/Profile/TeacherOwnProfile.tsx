// TEACHER-role /profile page (Profile.tsx renders this in place of the admin
// staff profile when the session is a TEACHER — see the wrapper at the bottom
// of Profile.tsx). Reads GET /teacher-portal/profile and updates it through
// PATCH /teacher-portal/profile (multipart: photo, password, gender,
// birthdate). Only fields that were actually changed are sent — in
// particular an empty password field is never sent.
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Avatar, Box, Button, Chip, CircularProgress, MenuItem, Paper, TextField, Typography,
} from "@mui/material";
import {
  useTeacherPortalProfileQuery,
  useTeacherPortalUpdateProfileMutation,
} from "../../app/api/teacherPortalApi";
import type { TeacherPortalGender } from "../../app/api/teacherPortalApi/types";
import { useToast } from "../../Context/ToastContext";
import { extractApiError } from "../../utils";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MIN_PASSWORD = 6;

const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Box sx={{ mb: 1.75 }}>
    <Typography sx={{ color: "var(--color-text-muted)", fontSize: 13, mb: 0.3 }}>{label}</Typography>
    <Box sx={{ fontSize: 14.5, fontWeight: 500, color: "var(--color-text-primary)", wordBreak: "break-word" }}>{children}</Box>
  </Box>
);

export const TeacherOwnProfile = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: profile, isLoading, isError, refetch } = useTeacherPortalProfileQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [updateProfile, { isLoading: isSaving }] = useTeacherPortalUpdateProfileMutation();

  const [gender, setGender] = useState<TeacherPortalGender | "">("");
  const [birthdate, setBirthdate] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync the form with the server values whenever they (re)load.
  useEffect(() => {
    if (!profile) return;
    setGender(profile.gender ?? "");
    setBirthdate(profile.birthdate ?? "");
  }, [profile]);

  // Object URLs must be released when replaced/unmounted.
  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const genderLabel = useMemo(() => {
    if (profile?.gender === "MALE") return t("teacherPortal.profile.male");
    if (profile?.gender === "FEMALE") return t("teacherPortal.profile.female");
    return t("teacherPortal.profile.genderNone");
  }, [profile?.gender, t]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("teacherPortal.profile.photoInvalid"));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError(t("teacherPortal.profile.photoTooLarge"));
      return;
    }
    setError(null);
    setPhoto(file);
  };

  const handleSave = async () => {
    if (!profile) return;
    setError(null);

    if (password) {
      if (password.length < MIN_PASSWORD) {
        setError(t("teacherPortal.profile.passwordTooShort"));
        return;
      }
      if (password !== confirm) {
        setError(t("teacherPortal.profile.passwordMismatch"));
        return;
      }
    }

    const payload = {
      photo: photo ?? undefined,
      password: password || undefined,
      gender: gender && gender !== profile.gender ? gender : undefined,
      birthdate: birthdate && birthdate !== (profile.birthdate ?? "") ? birthdate : undefined,
    };
    if (!payload.photo && !payload.password && !payload.gender && !payload.birthdate) {
      setError(t("teacherPortal.profile.nothingToSave"));
      return;
    }

    try {
      await updateProfile(payload).unwrap();
      toast.success(t("teacherPortal.profile.saved"));
      setPhoto(null);
      setPassword("");
      setConfirm("");
    } catch (err) {
      const detail = extractApiError(err);
      const message = detail
        ? `${t("teacherPortal.profile.saveError")}: ${detail}`
        : t("teacherPortal.profile.saveError");
      setError(message);
      toast.error(message);
    }
  };

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

  const displayName = profile.name || profile.email || "—";
  const cardSx = {
    bgcolor: "var(--color-surface)", border: "1px solid var(--color-border)",
    borderRadius: 2, p: { xs: 2, md: 3 }, minWidth: 0,
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "var(--color-bg-page)", p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 2.5, color: "var(--color-text-primary)" }}>
        {t("teacherPortal.profile.title")}
      </Typography>

      <Box sx={{
        display: "grid", gridTemplateColumns: "minmax(0, 420px) minmax(0, 480px)", gap: 2.5, alignItems: "start",
        "@media(max-width:1000px)": { gridTemplateColumns: "minmax(0, 1fr)" },
      }}>
        {/* ── Read-only info ── */}
        <Paper elevation={0} sx={cardSx}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
            <Avatar src={profile.photo || undefined} sx={{ width: 72, height: 72, bgcolor: "#b0bec5", fontSize: 28 }}>
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="h6" fontWeight={500} sx={{ color: "var(--color-text-primary)", wordBreak: "break-word" }}>
              {displayName}
            </Typography>
          </Box>

          <InfoRow label={t("teacherPortal.profile.phone")}>{profile.phone || "—"}</InfoRow>
          <InfoRow label={t("teacherPortal.profile.email")}>{profile.email || "—"}</InfoRow>
          {profile.specialization && (
            <InfoRow label={t("teacherPortal.profile.specialization")}>{profile.specialization}</InfoRow>
          )}
          <InfoRow label={t("teacherPortal.profile.gender")}>{genderLabel}</InfoRow>
          <InfoRow label={t("teacherPortal.profile.birthdate")}>{profile.birthdate || "—"}</InfoRow>
          <InfoRow label={t("teacherPortal.profile.branches")}>
            {profile.branches.length > 0 ? (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {profile.branches.map((b) => (
                  <Chip
                    key={b.id || b.name}
                    label={b.name}
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: "#0F6E56", color: "#0F6E56", fontSize: 12, height: 26, borderRadius: "20px" }}
                  />
                ))}
              </Box>
            ) : (
              profile.branchName || "—"
            )}
          </InfoRow>
        </Paper>

        {/* ── Edit form ── */}
        <Paper elevation={0} sx={cardSx}>
          <Typography variant="h6" fontWeight={600} sx={{ color: "var(--color-text-primary)" }}>
            {t("teacherPortal.profile.editTitle")}
          </Typography>
          <Typography sx={{ fontSize: 13, color: "var(--color-text-muted)", mb: 2 }}>
            {t("teacherPortal.profile.editHint")}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Avatar src={photoPreview || profile.photo || undefined} sx={{ width: 56, height: 56, bgcolor: "#b0bec5" }}>
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
            <Button
              variant="outlined"
              size="small"
              disabled={isSaving}
              onClick={() => fileRef.current?.click()}
              sx={{ textTransform: "none" }}
            >
              {t("teacherPortal.profile.choosePhoto")}
            </Button>
            {photo && (
              <Typography sx={{ fontSize: 12.5, color: "var(--color-text-muted)", minWidth: 0 }} noWrap>
                {photo.name}
              </Typography>
            )}
          </Box>

          <TextField
            select
            fullWidth
            size="small"
            margin="dense"
            label={t("teacherPortal.profile.gender")}
            value={gender}
            onChange={(e) => setGender(e.target.value as TeacherPortalGender | "")}
            disabled={isSaving}
          >
            <MenuItem value="">{t("teacherPortal.profile.genderNone")}</MenuItem>
            <MenuItem value="MALE">{t("teacherPortal.profile.male")}</MenuItem>
            <MenuItem value="FEMALE">{t("teacherPortal.profile.female")}</MenuItem>
          </TextField>

          <TextField
            fullWidth
            size="small"
            margin="dense"
            type="date"
            label={t("teacherPortal.profile.birthdate")}
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            disabled={isSaving}
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <TextField
            fullWidth
            size="small"
            margin="dense"
            type="password"
            label={t("teacherPortal.profile.newPassword")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSaving}
            autoComplete="new-password"
            helperText={t("teacherPortal.profile.passwordHint")}
          />
          {password && (
            <TextField
              fullWidth
              size="small"
              margin="dense"
              type="password"
              label={t("teacherPortal.profile.confirmPassword")}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={isSaving}
              autoComplete="new-password"
            />
          )}

          {error && (
            <Typography variant="body2" color="error" sx={{ mt: 1.5 }}>
              {error}
            </Typography>
          )}

          <Button
            variant="contained"
            fullWidth
            onClick={handleSave}
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ mt: 2.5, textTransform: "none", borderRadius: 1.5, bgcolor: "#003366" }}
          >
            {isSaving ? t("teacherPortal.profile.saving") : t("teacherPortal.profile.save")}
          </Button>
        </Paper>
      </Box>
    </Box>
  );
};

export default TeacherOwnProfile;
