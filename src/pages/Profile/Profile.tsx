import { useState } from "react";
import {
  Box, Typography, Avatar, Chip, Modal, TextField, Button, IconButton,
} from "@mui/material";
import { FiFlag, FiEdit2, FiTrash2 } from "react-icons/fi";

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

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProfileData {
  name: string;
  surname: string;
  phone: string;
  jobTitle: string;
  roles: string[];
  branches: string[];
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────
const ProfilePage = () => {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [profile, setProfile] = useState<ProfileData>({
    name: "Odilbek",
    surname: "Safarov",
    phone: "(91) 517-97-74",
    jobTitle: "",
    roles: ["CEO", "Teacher"],
    branches: ["YA IELTS Campus"],
  });

  const [formData, setFormData] = useState<ProfileData>(profile);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    setProfile(formData);
    setEditOpen(false);
  };

  const handleDelete = () => {
    console.log("Profile deleted");
    setDeleteOpen(false);
  };

  return (
    <Box sx={{ bgcolor: "#f4f5f7", minHeight: "100vh", p: 3 }}>

      {/* ── Page header ── */}
      <Typography variant="h5" fontWeight={600} sx={{ mb: 1, color: "#1a1a2e" }}>
        {profile.name} {profile.surname}
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
        {/* Action buttons — top right */}
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
            onClick={() => { setFormData(profile); setEditOpen(true); }}
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
            onClick={() => setDeleteOpen(true)}
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

        {/* Avatar + Name row */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
          <Avatar
            sx={{
              width: 72,
              height: 72,
              bgcolor: "#b0bec5",
              fontSize: 28,
            }}
          >
            {profile.name[0]}
          </Avatar>
          <Typography variant="h6" fontWeight={500}>
            {profile.name} {profile.surname}
          </Typography>
        </Box>

        {/* Phone */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: 13 }}>
            Phone:
          </Typography>
          <Typography variant="body2" fontWeight={500} sx={{ color: "#1a1a2e" }}>
            {profile.phone}
          </Typography>
        </Box>

        {/* Job title */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: 13 }}>
            Job title:
          </Typography>
          <Typography variant="body2" fontWeight={500} sx={{ color: "#1a1a2e" }}>
            {profile.jobTitle || "—"}
          </Typography>
        </Box>

        {/* Roles */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: 13, mb: 0.8 }}>
            Roles:
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {profile.roles.map((role) => (
              <Chip
                key={role}
                label={role}
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

        {/* Branches */}
        <Box>
          <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: 13, mb: 0.8 }}>
            Branches:
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {profile.branches.map((branch) => (
              <Chip
                key={branch}
                label={branch}
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
      </Box>

      {/* ══════════ EDIT MODAL ══════════ */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Edit Profile
          </Typography>

          <TextField fullWidth label="Name"      name="name"     value={formData.name}     onChange={handleChange} margin="normal" size="small" />
          <TextField fullWidth label="Surname"   name="surname"  value={formData.surname}  onChange={handleChange} margin="normal" size="small" />
          <TextField fullWidth label="Phone"     name="phone"    value={formData.phone}    onChange={handleChange} margin="normal" size="small" />
          <TextField fullWidth label="Job Title" name="jobTitle" value={formData.jobTitle} onChange={handleChange} margin="normal" size="small" />

          <Box sx={{ display: "flex", gap: 1.5, mt: 3 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setEditOpen(false)}
              sx={{ textTransform: "none", borderRadius: 1.5 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSave}
              sx={{ textTransform: "none", borderRadius: 1.5, bgcolor: "#003366" }}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* ══════════ DELETE CONFIRM MODAL ══════════ */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <Box sx={{ ...modalStyle, width: 360 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Delete Profile
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Are you sure you want to delete this profile? This action cannot be undone.
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setDeleteOpen(false)}
              sx={{ textTransform: "none", borderRadius: 1.5 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              fullWidth
              onClick={handleDelete}
              sx={{ textTransform: "none", borderRadius: 1.5 }}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default ProfilePage;