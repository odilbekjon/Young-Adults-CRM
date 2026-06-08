// src/pages/Staff.tsx

import { useState, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Drawer,
  TextField,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  IconButton,
  InputAdornment,
  Divider,
} from "@mui/material";
import {
  MdOutlineEmail,
  MdDeleteOutline,
  MdClose,
  MdCloudUpload,
  MdCalendarToday,
} from "react-icons/md";
import { HiEye, HiEyeOff } from "react-icons/hi";
import { TEACHERS_DATA } from "../../../../../constants/Teachers";
import { SendSmsModal } from "../../../../../components/SendSmsModal";

// ---------- Types ----------
interface StaffMember {
  id: number;
  name: string;
  roles: string[];
  jobTitle: string;
  phone: string;
}

// ---------- TEACHERS_DATA → StaffMember[] ----------
const buildStaffFromTeachers = (): StaffMember[] =>
  TEACHERS_DATA.map((t) => ({
    id: Number(t.uid),
    name: t.fullName,
    roles: [t.role],          // Teacher.role = "Teacher" etc.
    jobTitle: "",
    phone: t.phone,
  }));

// ---------- Constants ----------
const rolesList = [
  "CEO",
  "Branch Director",
  "Administrator",
  "Administrator2",
  "Limited Administrator",
  "Teacher",
  "Marketer",
  "Cashier",
];

interface NewStaffForm {
  name: string;
  phone: string;
  password: string;
  jobTitle: string;
  roles: string[];
  dateOfBirth: string;
  gender: string;
  photo: string;
}

const defaultForm: NewStaffForm = {
  name: "",
  phone: "",
  password: "",
  jobTitle: "",
  roles: [],
  dateOfBirth: "",
  gender: "",
  photo: "",
};

// ---------- Component ----------
export const Staff = () => {
  const [staff, setStaff] = useState<StaffMember[]>(buildStaffFromTeachers());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<NewStaffForm>(defaultForm);
  const [showPassword, setShowPassword] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SMS modal state
  const [smsOpen, setSmsOpen] = useState(false);
  const [, setSmsMember] = useState<StaffMember | null>(null);

  // ---------- Handlers ----------
  const handleDelete = (id: number) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
  };

  const handleRoleToggle = (role: string) => {
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const newMember: StaffMember = {
      id: Date.now(),
      name: form.name,
      roles: form.roles,
      jobTitle: form.jobTitle,
      phone: form.phone,
    };
    setStaff((prev) => [newMember, ...prev]);
    setForm(defaultForm);
    setFileName("");
    setDrawerOpen(false);
  };

  const handleOpenSms = (member: StaffMember) => {
    setSmsMember(member);
    setSmsOpen(true);
  };

  return (
    <Box sx={{ p: 3, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={500}>
          Staff
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button
            variant="contained"
            onClick={() => setDrawerOpen(true)}
            sx={{
              bgcolor: "#1a3f6f",
              borderRadius: 5,
              px: 3,
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 1,
              "&:hover": { bgcolor: "#15345c" },
            }}
          >
            ADD NEW
          </Button>
          <Button
            variant="outlined"
            startIcon={<MdCloudUpload />}
            sx={{
              borderRadius: 5,
              px: 2.5,
              fontSize: 13,
              textTransform: "none",
              borderColor: "#ccc",
              color: "#555",
              "&:hover": { borderColor: "#aaa" },
            }}
          >
            Import
          </Button>
        </Box>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              {["id", "Name", "Role", "Job title", "Phone", "Actions"].map((col) => (
                <TableCell
                  key={col}
                  align={col === "Actions" ? "right" : "left"}
                  sx={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: "#333",
                    borderBottom: "1px solid #e0e0e0",
                  }}
                >
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {staff.map((member) => (
              <TableRow key={member.id} sx={{ "&:hover": { bgcolor: "#fafafa" } }}>
                <TableCell sx={{ fontSize: 13, color: "#555", verticalAlign: "top", pt: 2 }}>
                  {member.id}
                </TableCell>
                <TableCell sx={{ fontSize: 14, verticalAlign: "top", pt: 2 }}>
                  {member.name}
                </TableCell>
                <TableCell sx={{ verticalAlign: "top", pt: 2 }}>
                  {member.roles.map((role) => (
                    <Typography key={role} fontSize={13} color="#555" lineHeight={1.8}>
                      {role}
                    </Typography>
                  ))}
                </TableCell>
                <TableCell sx={{ fontSize: 13, color: "#555", verticalAlign: "top", pt: 2 }}>
                  {member.jobTitle}
                </TableCell>
                <TableCell sx={{ fontSize: 13, verticalAlign: "top", pt: 2 }}>
                  {member.phone}
                </TableCell>
                <TableCell align="right" sx={{ verticalAlign: "top", pt: 1.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                    {/* SMS button */}
                    <IconButton
                      size="small"
                      sx={{ color: "#f0a500" }}
                      onClick={() => handleOpenSms(member)}
                    >
                      <MdOutlineEmail size={20} />
                    </IconButton>
                    {/* Delete — faqat 1 dan ko'p role bo'lsa */}
                    {member.roles.length > 1 && (
                      <IconButton
                        size="small"
                        sx={{ color: "#e53935" }}
                        onClick={() => handleDelete(member.id)}
                      >
                        <MdDeleteOutline size={20} />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add New Staff Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 380, p: 0 } }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 3, py: 2.5 }}>
          <Typography fontWeight={600} fontSize={17}>
            Add New Staff
          </Typography>
          <IconButton size="small" onClick={() => setDrawerOpen(false)}>
            <MdClose size={20} />
          </IconButton>
        </Box>
        <Divider />

        <Box sx={{ px: 3, py: 2, overflowY: "auto", flex: 1 }}>
          {/* Name */}
          <Box mb={2}>
            <Typography fontSize={13} mb={0.5}>Name</Typography>
            <TextField
              fullWidth size="small"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </Box>

          {/* Phone */}
          <Box mb={2}>
            <Typography fontSize={13} mb={0.5}>Phone</Typography>
            <Box sx={{ display: "flex" }}>
              <Box
                sx={{
                  border: "1px solid #c4c4c4",
                  borderRight: "none",
                  borderRadius: "4px 0 0 4px",
                  px: 1.5,
                  display: "flex",
                  alignItems: "center",
                  bgcolor: "#fff",
                  fontSize: 13,
                  color: "#333",
                  whiteSpace: "nowrap",
                }}
              >
                +998
              </Box>
              <TextField
                fullWidth size="small"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "0 4px 4px 0",
                    bgcolor: "#eef4fb",
                  },
                }}
              />
            </Box>
          </Box>

          {/* Password */}
          <Box mb={2}>
            <Typography fontSize={13} mb={0.5}>Password</Typography>
            <TextField
              fullWidth size="small"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#eef4fb" } }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword((v) => !v)}>
                      {showPassword ? <HiEye size={18} /> : <HiEyeOff size={18} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Job title */}
          <Box mb={2}>
            <Typography fontSize={13} mb={0.5}>Job title</Typography>
            <TextField
              fullWidth size="small"
              value={form.jobTitle}
              onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))}
            />
          </Box>

          {/* Role */}
          <Box mb={2}>
            <Typography fontSize={13} mb={0.5}>Role</Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap" }}>
              {rolesList.map((role) => (
                <FormControlLabel
                  key={role}
                  control={
                    <Checkbox
                      size="small"
                      checked={form.roles.includes(role)}
                      onChange={() => handleRoleToggle(role)}
                      sx={{ py: 0.3 }}
                    />
                  }
                  label={<Typography fontSize={13}>{role}</Typography>}
                  sx={{ width: "50%", m: 0 }}
                />
              ))}
            </Box>
          </Box>

          {/* Date of birth */}
          <Box mb={2}>
            <Typography fontSize={13} mb={0.5}>Date of birth</Typography>
            <TextField
              fullWidth size="small"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MdCalendarToday size={16} color="#aaa" />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": { bgcolor: "#f9f9f9" },
                "& input::-webkit-calendar-picker-indicator": { opacity: 0, width: 0 },
              }}
            />
          </Box>

          {/* Gender */}
          <Box mb={2}>
            <Typography fontSize={13} mb={0.5}>Gender</Typography>
            <RadioGroup
              row
              value={form.gender}
              onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
            >
              <FormControlLabel value="male" control={<Radio size="small" />} label={<Typography fontSize={13}>Male</Typography>} />
              <FormControlLabel value="female" control={<Radio size="small" />} label={<Typography fontSize={13}>Female</Typography>} />
            </RadioGroup>
          </Box>

          {/* Photo */}
          <Box mb={3}>
            <Typography fontSize={13} mb={0.5}>Photo</Typography>
            <Box sx={{ display: "flex" }}>
              <Box
                sx={{
                  flex: 1,
                  border: "1px solid #c4c4c4",
                  borderRight: "none",
                  borderRadius: "4px 0 0 4px",
                  px: 1.5,
                  py: 0.8,
                  fontSize: 13,
                  color: fileName ? "#333" : "#aaa",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  bgcolor: "#fff",
                }}
              >
                {fileName || "No file chosen"}
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  borderRadius: "0 4px 4px 0",
                  textTransform: "none",
                  fontSize: 13,
                  px: 2,
                  borderColor: "#c4c4c4",
                  color: "#333",
                  minWidth: 85,
                }}
              >
                Browse
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  if (e.target.files?.[0]) setFileName(e.target.files[0].name);
                }}
              />
            </Box>
          </Box>

          {/* Submit */}
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            sx={{
              bgcolor: "#4db6c8",
              borderRadius: 5,
              textTransform: "none",
              fontWeight: 600,
              fontSize: 15,
              py: 1,
              "&:hover": { bgcolor: "#3aa3b5" },
            }}
          >
            Submit
          </Button>
        </Box>
      </Drawer>

      {/* SMS Modal — reusable */}
      <SendSmsModal
        open={smsOpen}
        onClose={() => { setSmsOpen(false); setSmsMember(null); }}
        selectedCount={1}
        recipientLabel="staff"
        sender="3700"
      />
    </Box>
  );
};