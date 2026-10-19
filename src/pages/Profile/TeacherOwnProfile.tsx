// Profile tab of the TEACHER Account page (TeacherAccount renders this for
// /profile; Profile.tsx swaps that page in for the admin staff profile when
// the session is a TEACHER — see the wrapper at the bottom of Profile.tsx).
// Same 3-column layout as the admin TeacherProfile page: own info card |
// own groups (TeacherAccountGroups) | selected group's roster. Reads GET
// /teacher-portal/profile (falling back to GET /auth/me for phone/photo/
// branches the portal payload may omit) and updates it through
// PATCH /teacher-portal/profile (multipart: photo, password, gender,
// birthdate) from the pencil button's dialog. Only fields that were actually
// changed are sent — in particular an empty password field is never sent.
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton,
  MenuItem, Paper, TextField, Typography,
} from "@mui/material";
import { MdEdit } from "react-icons/md";
import {
  useTeacherPortalProfileQuery,
  useTeacherPortalUpdateProfileMutation,
} from "../../app/api/teacherPortalApi";
import type { TeacherPortalGender } from "../../app/api/teacherPortalApi/types";
import { useToast } from "../../Context/ToastContext";
import { extractApiError, formatPhone } from "../../utils";
import { useAuth } from "../../hooks/useAuth";
import { TeacherAccountGroups } from "../TeacherAccount/TeacherAccountGroups";
import { formatTrainingDate } from "../../utils/formatTrainingDate";

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
  const { user: me } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

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
      setEditOpen(false);
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

  const displayName = profile.name || me?.name || profile.email || "—";
  const phone = formatPhone(profile.phone || me?.phone);
  const photoUrl = profile.photo || me?.photo || undefined;
  const branchNames = profile.branches.length > 0
    ? profile.branches.map((b) => ({ key: b.id || b.name, name: b.name }))
    : profile.branchName
      ? [{ key: profile.branchName, name: profile.branchName }]
      : (me?.branches ?? []).map((b) => ({ key: b.branch.id, name: b.branch.name }));
  const shortId = profile.id.length > 12 ? `${profile.id.slice(0, 8)}…` : profile.id;
  const cardSx = {
    bgcolor: "var(--color-surface)", border: "1px solid var(--color-border)",
    borderRadius: 2, p: { xs: 2, md: 2.5 }, minWidth: 0,
  };

  return (
    <Box className="teacher-profile-grid" sx={{ gap: 3, alignItems: "start" }}>
      {/* ── Info card ── */}
      <Paper elevation={0} sx={{ ...cardSx, position: "relative" }}>
        <IconButton
          size="small"
          aria-label={t("teacherPortal.profile.editTitle")}
          title={t("teacherPortal.profile.editTitle")}
          onClick={() => { setError(null); setEditOpen(true); }}
          sx={{
            position: "absolute", top: 12, right: 12, width: 30, height: 30,
            border: "1px solid var(--color-border)", color: "var(--color-text-muted)",
          }}
        >
          <MdEdit size={14} />
        </IconButton>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, pr: 5 }}>
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

        {(profile.email || profile.specialization || profile.gender || profile.birthdate) && (
          <Box sx={{ borderTop: "1px solid var(--color-border)", mt: 2, pt: 2 }}>
            {profile.email && <InfoRow label={t("teacherPortal.profile.email")}>{profile.email}</InfoRow>}
            {profile.specialization && (
              <InfoRow label={t("teacherPortal.profile.specialization")}>{profile.specialization}</InfoRow>
            )}
            {profile.gender && <InfoRow label={t("teacherPortal.profile.gender")}>{genderLabel}</InfoRow>}
            {profile.birthdate && (
              <InfoRow label={t("teacherPortal.profile.birthdate")}>{formatTrainingDate(profile.birthdate)}</InfoRow>
            )}
          </Box>
        )}
      </Paper>

      {/* ── Own groups + selected group's roster ── */}
      <TeacherAccountGroups />

      {/* ── Edit dialog ── */}
      <Dialog open={editOpen} onClose={() => !isSaving && setEditOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 600, pb: 0.5 }}>{t("teacherPortal.profile.editTitle")}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: "var(--color-text-muted)", mb: 2 }}>
            {t("teacherPortal.profile.editHint")}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Avatar src={photoPreview || photoUrl} sx={{ width: 56, height: 56, bgcolor: "#b0bec5" }}>
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
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default TeacherOwnProfile;
