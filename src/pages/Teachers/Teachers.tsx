// src/pages/teachers/Teachers.tsx

import {
  Drawer,
  Box,
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputBase,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
  Menu,
  MenuItem,
  Radio,
  RadioGroup,
  FormControl,
  InputAdornment,
  Collapse,
} from "@mui/material";
import { IoSearchOutline } from "react-icons/io5";
import { GoPlus } from "react-icons/go";
import { BsThreeDotsVertical } from "react-icons/bs";
import { MdDownload, MdCalendarToday, MdClose } from "react-icons/md";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { type Teacher } from "../../constants/Teachers";
import { useBranch } from "../../Context/BranchContext";
import { SendSmsModal } from "../../components/SendSmsModal/SendSmsModal";
import { useTranslation } from "react-i18next";

const EMPTY_FORM = {
  fullName: "",
  telegram: "",
  phone: "",
  password: "",
  percent: "",
  dob: "",
  gender: "",
  branch: "",
  photo: null as File | null,
};

/* shared input style */
const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    bgcolor: "#f9fafb",
    "& fieldset": { borderColor: "#e5e7eb" },
    "&:hover fieldset": { borderColor: "#9ca3af" },
    "&.Mui-focused fieldset": { borderColor: "#5b8def" },
  },
  "& .MuiInputBase-input": { fontSize: 14 },
};

export const Teachers = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { teachers: branchTeachers, branchLabel } = useBranch();

  const [searchValue, setSearchValue]             = useState("");
  const [open, setOpen]                           = useState(false);
  const [isEdit, setIsEdit]                       = useState(false);
  const [anchorEl, setAnchorEl]                   = useState<null | HTMLElement>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [localTeachers, setLocalTeachers]         = useState<Teacher[]>([]);
  const [form, setForm]                           = useState(EMPTY_FORM);
  const [deleteOpen, setDeleteOpen]               = useState(false);
  const [smsOpen, setSmsOpen]                     = useState(false);
  const [showPassword, setShowPassword]           = useState(false);
  const [photoPreview, setPhotoPreview]           = useState<string | null>(null);
  const fileInputRef                              = useRef<HTMLInputElement>(null);
  const [, setErrors]                       = useState<Record<string, string>>({});

  const openMenu    = Boolean(anchorEl);
  const allTeachers = [...branchTeachers, ...localTeachers];

  const filteredTeachers = allTeachers.filter((teacher) =>
    teacher.fullName.toLowerCase().includes(searchValue.toLowerCase())
  );

  /* ── menu ── */
  const handleMenuOpen  = (e: React.MouseEvent<HTMLElement>, id: number) => { e.stopPropagation(); setAnchorEl(e.currentTarget); setSelectedTeacherId(id); };
  const handleCloseMenu = () => setAnchorEl(null);

  /* ── open drawer ── */
  const openAdd = () => {
    setIsEdit(false);
    setSelectedTeacherId(null);
    setForm(EMPTY_FORM);
    setPhotoPreview(null);
    setShowPassword(false);
    setErrors({});
    setOpen(true);
  };

  const openEditDrawer = () => {
    const teacher = allTeachers.find((teacher) => teacher.id === selectedTeacherId);
    if (teacher) {
      setIsEdit(true);
      setForm({ fullName: teacher.fullName, telegram: teacher.telegram || "", phone: teacher.phone,
        password: "", percent: teacher.percent || "", dob: teacher.dob || "",
        gender: teacher.gender || "", branch: teacher.branch || "", photo: null });
      setPhotoPreview(null);
      setShowPassword(false);
      setOpen(true);
      setErrors({});
    }
    handleCloseMenu();
  };

  /* ── form ── */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setForm((prev) => ({ ...prev, photo: file })); setPhotoPreview(URL.createObjectURL(file)); }
  };

  /* ── validate ── */
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.phone.trim())    e.phone    = t("teachers.validation.phoneRequired");
    if (!form.fullName.trim()) e.fullName = t("teachers.validation.nameRequired");
    if (!form.dob)             e.dob      = t("teachers.validation.dobRequired");
    if (!form.gender)          e.gender   = t("teachers.validation.genderRequired");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── submit ── */
  const handleSubmit = () => {
    if (!validate()) return;
    if (isEdit && selectedTeacherId) {
      setLocalTeachers((prev) =>
        prev.map((teacher) => teacher.id === selectedTeacherId
          ? { ...teacher, fullName: form.fullName, phone: form.phone, telegram: form.telegram,
              percent: form.percent, dob: form.dob, gender: form.gender, branch: form.branch }
          : teacher)
      );
    } else {
      setLocalTeachers((prev) => [...prev, {
        id: Date.now(), fullName: form.fullName, phone: form.phone, telegram: form.telegram,
        uid: String(Date.now()).slice(-7), role: "Teacher", branch: form.branch,
        percent: form.percent, dob: form.dob, gender: form.gender, groups: [],
      }]);
    }
    setErrors({});
    setForm(EMPTY_FORM);
    setOpen(false);
    setSelectedTeacherId(null);
  };

  /* ── delete ── */
  const handleDelete     = () => { setDeleteOpen(true); handleCloseMenu(); };
  const handleConfirmDel = () => { setLocalTeachers((prev) => prev.filter((teacher) => teacher.id !== selectedTeacherId)); setDeleteOpen(false); setSelectedTeacherId(null); };
  const handleSmsOpen    = () => { setSmsOpen(true); handleCloseMenu(); };

  /* ════════════════════════════════════════════════════════ */
  return (
    <div style={{ padding: "20px" }}>

      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Stack direction="row" alignItems="baseline" spacing={1}>
          <span style={{ fontSize: 22, fontWeight: 500 }}>{t("teachers.title")}</span>
          <span style={{ fontSize: 14, color: "#888" }}>{branchLabel} — {filteredTeachers.length} {t("teachers.countSuffix")}</span>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<GoPlus />} onClick={openAdd}
            sx={{ borderRadius: "20px", background: "#1a3a5c", boxShadow: "none", textTransform: "none", fontWeight: 500, px: 3 }}>
            {t("teachers.actions.addNew")}
          </Button>
          <Button variant="outlined" startIcon={<MdDownload />}
            sx={{ borderRadius: "20px", textTransform: "none", color: "inherit", borderColor: "#ccc" }}>
            {t("teachers.actions.import")}
          </Button>
        </Stack>
      </Stack>

      {/* Alert */}
      <div style={{ background: "#f0f9f4", border: "1px solid #b6dfc8", borderRadius: 8,
        padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#1d9e75",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", fontSize: 13 }}>✓</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f6e56" }}>{t("teachers.alert.title")}</div>
          <div style={{ fontSize: 12, color: "#1d9e75" }}>{t("teachers.alert.description")}</div>
        </div>
      </div>

      {/* Search */}
      <Stack direction="row" sx={{ pb: 2 }}>
        <Paper sx={{ p: "2px 4px", display: "flex", alignItems: "center", width: 320, boxShadow: "none", border: "1px solid #e0e0e0" }}>
          <InputBase value={searchValue} onChange={(e) => setSearchValue(e.target.value)} sx={{ ml: 1, flex: 1 }} placeholder={t("teachers.search.placeholder")} />
          <IconButton sx={{ p: "8px" }}><IoSearchOutline size={18} /></IconButton>
        </Paper>
      </Stack>

      {/* Table */}
      <TableContainer sx={{ borderRadius: "10px", border: "1px solid #e0e0e0" }}>
        <Table sx={{ bgcolor: "#fff" }}>
          <TableBody sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", padding: "12px" }}>
            {filteredTeachers.map((teacher) => (
              <TableRow key={teacher.id} onClick={() => navigate(`/teachers/${teacher.id}`)}
                sx={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  border: "1px solid #e8e8e8", borderRadius: "10px", cursor: "pointer",
                  "&:hover": { bgcolor: "#f9f9f9" }, "& td": { border: 0 } }}>
                <TableCell sx={{ fontWeight: 500, fontSize: 14, flex: 1, py: 1.8 }}>{teacher.fullName}</TableCell>
                <TableCell sx={{ color: "#185FA5", fontSize: 14, mr: 12 }}>{teacher.phone}</TableCell>
                <TableCell sx={{ fontSize: 14, color: "#888", minWidth: 90, textAlign: "center", py: 1.8 }}>{teacher.groups.length} {t("teachers.table.groupsCount")}</TableCell>
                <TableCell align="center" sx={{ py: 1.8 }} onClick={(e) => e.stopPropagation()}>
                  <IconButton size="small" onClick={(e) => handleMenuOpen(e, teacher.id)}>
                    <BsThreeDotsVertical size={16} />
                  </IconButton>
                  <Menu anchorEl={anchorEl} open={openMenu && selectedTeacherId === teacher.id} onClose={handleCloseMenu}
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                    transformOrigin={{ vertical: "top", horizontal: "center" }}>
                    <MenuItem onClick={openEditDrawer}>✏️ {t("teachers.menu.edit")}</MenuItem>
                    <MenuItem onClick={handleSmsOpen}>📱 {t("teachers.menu.sms")}</MenuItem>
                    <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>🗑 {t("teachers.menu.delete")}</MenuItem>
                  </Menu>
                </TableCell>
              </TableRow>
            ))}
            {filteredTeachers.length === 0 && (
              <TableRow sx={{ "& td": { border: 0 } }}>
                <TableCell colSpan={4} align="center" sx={{ color: "#aaa", py: 4 }}>{t("teachers.table.noData")}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <SendSmsModal
        open={smsOpen}
        onClose={() => setSmsOpen(false)}
        selectedCount={1}
        recipientLabel={t("teachers.sms.recipientLabel")}
        sender="3700"
      />

      {/* ══════════════════════════════════════════════════════
          DRAWER
      ══════════════════════════════════════════════════════ */}
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}
        PaperProps={{ sx: { width: 460, display: "flex", flexDirection: "column", bgcolor: "#fff" } }}>

        {/* header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          px: 3, py: 2.5, borderBottom: "1px solid #f0f0f0" }}>
          <Typography fontWeight={700} fontSize={17} color="#1a1a2e">
            {isEdit ? t("teachers.drawer.editTitle") : t("teachers.drawer.addTitle")}
          </Typography>
          <IconButton onClick={() => setOpen(false)} size="small" sx={{ color: "#9ca3af" }}>
            <MdClose size={20} />
          </IconButton>
        </Box>

        {/* scrollable body */}
        <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 3 }}>
          <Stack spacing={2.5}>

            {/* Phone */}
            <Box>
              <Typography fontSize={13} fontWeight={500} color="#374151" mb={0.8}>{t("teachers.form.phone")}</Typography>
              <TextField name="phone" value={form.phone} onChange={handleChange}
                fullWidth size="small" placeholder={t("teachers.form.phonePlaceholder")}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5,
                        borderRight: "1px solid #e5e7eb", pr: 1.2, mr: 0.5,
                        fontSize: 13, color: "#374151", fontWeight: 500, whiteSpace: "nowrap" }}>
                        🇺🇿 +998
                      </Box>
                    </InputAdornment>
                  ),
                }}
                sx={inputSx}
              />
            </Box>

            {/* Name */}
            <Box>
              <Typography fontSize={13} fontWeight={500} color="#374151" mb={0.8}>{t("teachers.form.name")}</Typography>
              <TextField name="fullName" value={form.fullName} onChange={handleChange}
                fullWidth size="small" placeholder={t("teachers.form.namePlaceholder")} sx={inputSx} />
            </Box>

            {/* Branch — faqat Edit rejimida */}
            {isEdit && (
              <Box>
                <Typography fontSize={13} fontWeight={500} color="#374151" mb={0.8}>{t("teachers.form.branch")}</Typography>
                <TextField name="branch" value={form.branch} onChange={handleChange}
                  fullWidth size="small" placeholder={t("teachers.form.branchPlaceholder")} sx={inputSx} />
              </Box>
            )}

            {/* Date of birth */}
            <Box>
              <Typography fontSize={13} fontWeight={500} color="#374151" mb={0.8}>{t("teachers.form.dob")}</Typography>
              <TextField name="dob" type="date" value={form.dob} onChange={handleChange}
                fullWidth size="small" InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MdCalendarToday size={15} color="#9ca3af" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  ...inputSx,
                  "& input[type='date']::-webkit-calendar-picker-indicator": {
                    opacity: 0, position: "absolute", right: 0, width: "100%", cursor: "pointer",
                  },
                }}
              />
            </Box>

            {/* Gender */}
            <Box>
              <Typography fontSize={13} fontWeight={500} color="#374151" mb={0.8}>{t("teachers.form.gender")}</Typography>
              <FormControl>
                <RadioGroup row name="gender" value={form.gender} onChange={handleChange}>
                  <FormControlLabel value="Male"
                    control={<Radio size="small" sx={{ color: "#9ca3af", "&.Mui-checked": { color: "#5b8def" } }} />}
                    label={<Typography fontSize={14}>{t("teachers.form.genderMale")}</Typography>} />
                  <FormControlLabel value="Female"
                    control={<Radio size="small" sx={{ color: "#9ca3af", "&.Mui-checked": { color: "#5b8def" } }} />}
                    label={<Typography fontSize={14}>{t("teachers.form.genderFemale")}</Typography>} />
                </RadioGroup>
              </FormControl>
            </Box>

            {/* Photo */}
            <Box>
              <Typography fontSize={13} fontWeight={500} color="#374151" mb={0.8}>{t("teachers.form.photo")}</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {photoPreview && (
                  <Box component="img" src={photoPreview} alt={t("teachers.form.photoPreviewAlt")}
                    sx={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #e5e7eb", flexShrink: 0 }} />
                )}
                <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
                  border: "1px solid #e5e7eb", borderRadius: "10px", bgcolor: "#f9fafb", px: 1.5, py: 0.9 }}>
                  <Typography fontSize={13} color="#9ca3af" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {form.photo ? form.photo.name : t("teachers.form.noFileChosen")}
                  </Typography>
                  <Button size="small" variant="outlined" onClick={() => fileInputRef.current?.click()}
                    sx={{ fontSize: 12, borderRadius: "8px", borderColor: "#d1d5db", color: "#374151",
                      textTransform: "none", py: 0.3, px: 1.5, minWidth: 0, flexShrink: 0 }}>
                    {t("teachers.form.browse")}
                  </Button>
                </Box>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
              </Box>
            </Box>

            {/* Set password */}
            <Box>
              <Button onClick={() => setShowPassword((v) => !v)}
                sx={{ fontSize: 13, color: "#5b8def", textTransform: "none", p: 0, fontWeight: 500,
                  "&:hover": { background: "none", textDecoration: "underline" } }}>
                {showPassword ? t("teachers.form.hidePasswordToggle") : t("teachers.form.setPasswordToggle")}
              </Button>
              <Collapse in={showPassword}>
                <TextField name="password" type="password" value={form.password} onChange={handleChange}
                  fullWidth size="small" placeholder={t("teachers.form.passwordPlaceholder")} sx={{ ...inputSx, mt: 1.5 }} />
              </Collapse>
            </Box>

          </Stack>
        </Box>

        {/* footer */}
        <Box sx={{ px: 3, py: 2.5, borderTop: "1px solid #f0f0f0" }}>
          <Button fullWidth variant="contained" onClick={handleSubmit}
            sx={{
              borderRadius: "24px", py: 1.3, fontSize: 15, fontWeight: 600,
              textTransform: "none", bgcolor: "#4f7ec4",
              boxShadow: "0 4px 12px rgba(79,126,196,0.35)",
              "&:hover": { bgcolor: "#3b6ab0" },
            }}>
            {t("teachers.form.submit")}
          </Button>
        </Box>
      </Drawer>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} PaperProps={{ sx: { borderRadius: 3, width: 360 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{t("teachers.deleteDialog.title")}</DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color="text.secondary">
            {t("teachers.deleteDialog.message")}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ textTransform: "none", color: "#667085" }}>{t("teachers.deleteDialog.cancel")}</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDel} sx={{ borderRadius: 2, textTransform: "none" }}>{t("teachers.deleteDialog.confirm")}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};