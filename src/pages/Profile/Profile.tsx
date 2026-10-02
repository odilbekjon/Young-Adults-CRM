import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Box, Typography, Avatar, Chip, Modal, TextField, Button, IconButton, CircularProgress,
} from "@mui/material";
import { FiFlag, FiEdit2, FiTrash2 } from "react-icons/fi";
import { useGetMeQuery } from "../../app/api/authApi/authApi";
import { useStaffUserByIdQuery, useUpdateOwnStaffProfileMutation, useToggleStaffUserStatusMutation } from "../../app/api/usersApi";
import { logout } from "../../app/store/authSlice";
import type { AppDispatch } from "../../app/store";
import { useToast } from "../../Context/ToastContext";
import { extractApiError } from "../../utils";
import { useAuth } from "../../hooks/useAuth";
import TeacherOwnProfile from "./TeacherOwnProfile";

interface ProfileDisplayUser {
  name: string | null;
  email: string | null;
  phone: string | null;
  photo: string | null;
  jobTitle: string | null;
  roleTags: string[];
  status: string;
  branches: { branch: { id: string; name: string } }[];
}

// ─── Modal style ──────────────────────────────────────────────────────────────
const modalStyle = {
  position: "absolute" as const,
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 440,
  bgcolor: "background.paper",
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

// ─── AdminProfilePage (staff/admin/CEO) ───────────────────────────────────────
const AdminProfilePage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const toast = useToast();
  const isOtherProfile = Boolean(id);

  const { data: meData, isLoading: meLoading, refetch: refetchMe } = useGetMeQuery(undefined, { skip: isOtherProfile });
  const { data: staffUserData, isLoading: staffLoading } = useStaffUserByIdQuery(id ?? "", { skip: !isOtherProfile });
  const isLoading = isOtherProfile ? staffLoading : meLoading;

  const [updateOwnProfile, { isLoading: isSaving }] = useUpdateOwnStaffProfileMutation();
  const [toggleStaffUserStatus, { isLoading: isDeactivating }] = useToggleStaffUserStatusMutation();

  // Memoized so its identity is stable across renders (only changes when the
  // underlying query data actually changes) — the effect below keys off it.
  const user: ProfileDisplayUser | undefined = useMemo(() => {
    if (isOtherProfile) {
      if (!staffUserData) return undefined;
      return {
        name: staffUserData.name,
        email: staffUserData.email,
        phone: staffUserData.phone,
        photo: staffUserData.photo,
        jobTitle: staffUserData.jobTitle,
        roleTags: [staffUserData.role, staffUserData.rolePermission?.name].filter((v): v is string => Boolean(v)),
        status: staffUserData.status,
        branches: staffUserData.branches,
      };
    }
    if (!meData?.data) return undefined;
    return {
      name: meData.data.name,
      email: meData.data.email,
      phone: meData.data.phone,
      photo: meData.data.photo,
      jobTitle: meData.data.jobTitle,
      roleTags: [meData.data.role, ...meData.data.rolePermissions.map((rp) => rp.name)].filter((v): v is string => Boolean(v)),
      status: meData.data.status,
      branches: meData.data.branches,
    };
  }, [isOtherProfile, staffUserData, meData]);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", jobTitle: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name ?? "",
        phone: user.phone ?? "",
        email: user.email ?? "",
        jobTitle: user.jobTitle ?? "",
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // PATCH /users/profile/staff — the dedicated "edit my own profile"
  // endpoint for admin/superadmin. Only name/phone/email/jobTitle are sent,
  // so this can't touch permissions/branches/account status.
  const handleSave = async () => {
    if (!meData?.data?.id) return;
    if (!formData.name.trim()) {
      setFormError("Name is required");
      return;
    }
    setFormError(null);
    try {
      await updateOwnProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        jobTitle: formData.jobTitle.trim() || undefined,
      }).unwrap();
      // updateStaffUser only invalidates the "staff" tag (the admin Staff
      // list) — GET /auth/me is cached under "user" and won't refetch on
      // its own, so this page would otherwise keep showing the pre-edit
      // values until an unrelated refresh.
      await refetchMe();
      toast.success("Profile updated");
      setEditOpen(false);
    } catch (err) {
      const detail = extractApiError(err);
      const message = detail ? `Failed to update profile: ${detail}` : "Failed to update profile";
      setFormError(message);
      toast.error(message);
    }
  };

  // PATCH /users/{id}/toggle-status — the same reversible ACTIVE<->INACTIVE
  // flip the Staff page uses for archiving, applied to the logged-in user's
  // own id. There is no real DELETE here, matching the project-wide
  // archive/toggle-status convention. A deactivated account can't stay
  // usefully "logged in", so this always finishes with a full logout.
  const handleDeactivateSelf = async () => {
    if (!meData?.data?.id) return;
    setDeactivateError(null);
    try {
      await toggleStaffUserStatus(meData.data.id).unwrap();
      setDeleteOpen(false);
      toast.success("Your account has been deactivated");
      dispatch(logout());
      navigate("/login", { replace: true });
    } catch (err) {
      const detail = extractApiError(err);
      const message = detail ? `Failed to deactivate account: ${detail}` : "Failed to deactivate account";
      setDeactivateError(message);
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ bgcolor: "#f4f5f7", minHeight: "100vh", p: 3, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  const displayName = user?.name || user?.email || "—";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <Box sx={{ bgcolor: "#f4f5f7", minHeight: "100vh", p: 3 }}>

      {/* ── Page header ── */}
      <Typography variant="h5" fontWeight={600} sx={{ mb: 1, color: "#1a1a2e" }}>
        {displayName}
      </Typography>

      {/* ── Tab bar ── */}
      <Box sx={{ borderBottom: "1px solid #e0e5ec", mb: 3 }}>
        <Box
          sx={{
            display: "inline-block",
            pb: 1,
            px: 0.5,
            fontSize: 13,
            fontWeight: 600,
            color: "#1976d2",
            borderBottom: "2px solid #1976d2",
            letterSpacing: 0.5,
            cursor: "pointer",
          }}
        >
          PROFILE
        </Box>
      </Box>

      {/* ── Profile card ── */}
      <Box
        sx={{
          width: 480,
          bgcolor: "#fff",
          borderRadius: 2,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          p: 3,
          position: "relative",
        }}
      >
        {/* Action buttons — top right (self-account actions only; hidden
            when viewing someone else's profile by id, e.g. from Archive) */}
        {!isOtherProfile && (
        <Box
          sx={{
            position: "absolute",
            top: 20,
            right: 20,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {/* Flag */}
          <IconButton
            size="small"
            sx={{
              border: "1.5px solid #4caf50",
              color: "#4caf50",
              width: 36,
              height: 36,
              "&:hover": { bgcolor: "#f0faf0" },
            }}
          >
            <FiFlag size={16} />
          </IconButton>

          {/* Edit */}
          <IconButton
            size="small"
            onClick={() => { setFormError(null); setEditOpen(true); }}
            sx={{
              border: "1.5px solid #003366",
              color: "#003366",
              width: 36,
              height: 36,
              "&:hover": { bgcolor: "#eef2f9" },
            }}
          >
            <FiEdit2 size={16} />
          </IconButton>

          {/* Delete */}
          <IconButton
            size="small"
            onClick={() => { setDeactivateError(null); setDeleteOpen(true); }}
            sx={{
              border: "1.5px solid #e53935",
              color: "#e53935",
              width: 36,
              height: 36,
              "&:hover": { bgcolor: "#fff5f5" },
            }}
          >
            <FiTrash2 size={16} />
          </IconButton>
        </Box>
        )}

        {/* Avatar + Name row */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
          <Avatar
            src={user?.photo || undefined}
            sx={{
              width: 72,
              height: 72,
              bgcolor: "#b0bec5",
              fontSize: 28,
            }}
          >
            {avatarInitial}
          </Avatar>
          <Typography variant="h6" fontWeight={500}>
            {displayName}
          </Typography>
        </Box>

        {/* Email */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: 13 }}>
            Email:
          </Typography>
          <Typography variant="body2" fontWeight={500} sx={{ color: "#1a1a2e" }}>
            {user?.email || "—"}
          </Typography>
        </Box>

        {/* Phone */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: 13 }}>
            Phone:
          </Typography>
          <Typography variant="body2" fontWeight={500} sx={{ color: "#1a1a2e" }}>
            {user?.phone || "—"}
          </Typography>
        </Box>

        {/* Job title */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: 13 }}>
            Job title:
          </Typography>
          <Typography variant="body2" fontWeight={500} sx={{ color: "#1a1a2e" }}>
            {user?.jobTitle || "—"}
          </Typography>
        </Box>

        {/* Branches */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: 13, mb: 0.8 }}>
            Branches:
          </Typography>
          {user?.branches && user.branches.length > 0 ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {user.branches.map((b) => (
                <Chip
                  key={b.branch.id}
                  label={b.branch.name}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: "#0F6E56",
                    color: "#0F6E56",
                    fontSize: 12,
                    height: 26,
                    borderRadius: "20px",
                  }}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" fontWeight={500} sx={{ color: "#1a1a2e" }}>
              —
            </Typography>
          )}
        </Box>

        {/* Role */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: 13, mb: 0.8 }}>
            Role:
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {(user?.roleTags ?? []).map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: "#1976d2",
                  color: "#1976d2",
                  fontSize: 12,
                  height: 26,
                  borderRadius: "20px",
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Status */}
        <Box>
          <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: 13, mb: 0.8 }}>
            Status:
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {user?.status && (
              <Chip
                label={user.status}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: user.status === "ACTIVE" ? "#4caf50" : "#9ca3af",
                  color: user.status === "ACTIVE" ? "#4caf50" : "#9ca3af",
                  fontSize: 12,
                  height: 26,
                  borderRadius: "20px",
                }}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* ══════════ EDIT MODAL ══════════ */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Edit Profile
          </Typography>

          <TextField fullWidth label="Name"  name="name"  value={formData.name}  onChange={handleChange} margin="normal" size="small" disabled={isSaving} />
          <TextField fullWidth label="Phone" name="phone" value={formData.phone} onChange={handleChange} margin="normal" size="small" disabled={isSaving} />
          <TextField fullWidth label="Email" name="email" value={formData.email} onChange={handleChange} margin="normal" size="small" disabled={isSaving} />
          <TextField fullWidth label="Job title" name="jobTitle" value={formData.jobTitle} onChange={handleChange} margin="normal" size="small" disabled={isSaving} />

          {formError && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {formError}
            </Typography>
          )}

          <Box sx={{ display: "flex", gap: 1.5, mt: 3 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setEditOpen(false)}
              disabled={isSaving}
              sx={{ textTransform: "none", borderRadius: 1.5 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSave}
              disabled={isSaving}
              startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{ textTransform: "none", borderRadius: 1.5, bgcolor: "#003366" }}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* ══════════ DEACTIVATE ACCOUNT CONFIRM MODAL ══════════ */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <Box sx={{ ...modalStyle, width: 360 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Deactivate account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Your account will be set to inactive and you'll be signed out immediately. Your data isn't deleted — an administrator can reactivate the account later.
          </Typography>
          {deactivateError && (
            <Typography variant="body2" color="error" sx={{ mb: 2 }}>
              {deactivateError}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setDeleteOpen(false)}
              disabled={isDeactivating}
              sx={{ textTransform: "none", borderRadius: 1.5 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              fullWidth
              onClick={handleDeactivateSelf}
              disabled={isDeactivating}
              startIcon={isDeactivating ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{ textTransform: "none", borderRadius: 1.5 }}
            >
              Deactivate
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

// A TEACHER session's own /profile is backed by /teacher-portal/profile
// (photo/password/gender/birthdate only) instead of the staff /users/{id}
// endpoints. Viewing someone else's profile by id (/profile/:id) always stays
// on the admin view.
const ProfilePage = () => {
  const { id } = useParams<{ id?: string }>();
  const { isTeacher } = useAuth();
  return isTeacher && !id ? <TeacherOwnProfile /> : <AdminProfilePage />;
};

export default ProfilePage;
