// src/pages/teachers/Teachers.tsx

import {
  Drawer,
  Box,
  Typography,
  Button,
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
  Chip,
  CircularProgress,
} from "@mui/material";
import { IoSearchOutline } from "react-icons/io5";
import { GoPlus } from "react-icons/go";
import { BsThreeDotsVertical } from "react-icons/bs";
import { PiMicrosoftExcelLogoFill } from "react-icons/pi";
import { MdDownload, MdCalendarToday, MdClose } from "react-icons/md";
import { useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useBranch } from "../../Context/BranchContext";
import type { RootState } from "../../app/store";
import { SendSmsModal } from "../../components/SendSmsModal/SendSmsModal";
import { useTranslation } from "react-i18next";
import { useToast } from "../../Context/ToastContext";
import { extractApiError } from "../../utils/extractApiError";
import {
  useAllTeachersQuery,
  useCreateTeacherMutation,
  useUpdateTeacherMutation,
  useToggleTeacherStatusMutation,
  useLazyTeachersExcelQuery,
} from "../../app/api/teachersApi";
import type { Teacher, TeacherGender } from "../../app/api/teachersApi/types";
import { useAllGroupsQuery } from "../../app/api/groupsApi";

const EMPTY_FORM = {
  name: "",
  phone: "",
  password: "",
  dob: "",
  gender: "" as "" | TeacherGender,
  photo: null as File | null,
};

/* shared input style */
const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    bgcolor: "var(--color-surface-alt)",
    "& fieldset": { borderColor: "var(--color-border)" },
    "&:hover fieldset": { borderColor: "var(--color-text-muted)" },
    "&.Mui-focused fieldset": { borderColor: "#5b8def" },
  },
  "& .MuiInputBase-input": { fontSize: 14 },
};

export const Teachers = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const { branchLabel } = useBranch();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const { data: teachersData, isLoading: teachersLoading } = useAllTeachersQuery({ page: 1, limit: 100 });
  const { data: allGroupsData } = useAllGroupsQuery({ page: 1, limit: 100 });
  const [createTeacher, { isLoading: isCreating }] = useCreateTeacherMutation();
  const [updateTeacher, { isLoading: isUpdating }] = useUpdateTeacherMutation();
  const [toggleTeacherStatus] = useToggleTeacherStatusMutation();
  const [fetchTeachersExcel, { isFetching: isExportingExcel }] = useLazyTeachersExcelQuery();

  const teachers: Teacher[] = teachersData?.data ?? [];

  // Real teacher endpointi guruhlar sonini qaytarmaydi — bu son mavjud
  // groupsApi ma'lumotidan (har bir guruhning teachers[] massivi) hisoblanadi,
  // yangi endpoint o'ylab topilmadi.
  const groupCountByTeacherId = useMemo(() => {
    const map = new Map<string, number>();
    (allGroupsData?.data ?? []).forEach((g) => {
      g.teachers.forEach((tch) => map.set(tch.id, (map.get(tch.id) ?? 0) + 1));
    });
    return map;
  }, [allGroupsData]);

  const [searchValue, setSearchValue]             = useState("");
  const [open, setOpen]                           = useState(false);
  const [isEdit, setIsEdit]                       = useState(false);
  const [anchorEl, setAnchorEl]                   = useState<null | HTMLElement>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [form, setForm]                           = useState(EMPTY_FORM);
  const [smsOpen, setSmsOpen]                     = useState(false);
  const [showPassword, setShowPassword]           = useState(false);
  const [photoPreview, setPhotoPreview]           = useState<string | null>(null);
  const fileInputRef                              = useRef<HTMLInputElement>(null);
  const [errors, setErrors]                       = useState<Record<string, string>>({});

  const openMenu = Boolean(anchorEl);

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  /* ── menu ── */
  const handleMenuOpen  = (e: React.MouseEvent<HTMLElement>, id: string) => { e.stopPropagation(); setAnchorEl(e.currentTarget); setSelectedTeacherId(id); };
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
    const teacher = teachers.find((tch) => tch.id === selectedTeacherId);
    if (teacher) {
      setIsEdit(true);
      setForm({
        name: teacher.name,
        phone: teacher.phone ?? "",
        password: "",
        dob: teacher.birthdate ?? "",
        gender: teacher.gender ?? "",
        photo: null,
      });
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
    if (!form.name.trim())  e.name  = t("teachers.validation.nameRequired");
    if (!form.phone.trim()) e.phone = t("teachers.validation.phoneRequired");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── submit ── */
  const handleSubmit = async () => {
    // No branch field in this form — the teacher is created under whichever
    // branch is active in the header, so that must be a real branch, not
    // "All branches", before a new teacher can be created.
    if (!isEdit && !selectedBranchId) {
      toast.error(t("teachers.validation.branchRequired"));
      return;
    }
    if (!validate()) return;
    const payload = {
      name: form.name,
      phone: form.phone || undefined,
      password: form.password || undefined,
      birthdate: form.dob || undefined,
      gender: form.gender || undefined,
      photo: form.photo ?? undefined,
    };
    try {
      if (isEdit && selectedTeacherId) {
        await updateTeacher({ id: selectedTeacherId, ...payload }).unwrap();
        toast.success(t("teachers.toast.updated"));
      } else {
        // Without branchIds, the backend enrolled the new teacher in every
        // branch instead of just the one currently active in the header.
        await createTeacher({ ...payload, branchIds: selectedBranchId ? [selectedBranchId] : undefined }).unwrap();
        toast.success(t("teachers.toast.created"));
      }
      setErrors({});
      setForm(EMPTY_FORM);
      setOpen(false);
      setSelectedTeacherId(null);
    } catch (err) {
      const detail = extractApiError(err);
      toast.error(detail ? `${t("teachers.toast.error")}: ${detail}` : t("teachers.toast.error"));
    }
  };

  const handleSmsOpen    = () => { setSmsOpen(true); handleCloseMenu(); };
  const handleExportExcel = async () => {
    try {
      const blob = await fetchTeachersExcel({
        search: searchValue || undefined,
        branchId: selectedBranchId ?? undefined,
        page: 1,
        limit: Math.max(teachersData?.meta?.total ?? teachers.length, 1),
      }).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "teachers.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("teachers.actions.exportError"));
    }
  };
  // The only "remove" action on this list: PATCH /teachers/{id}/toggle-status
  // flips ACTIVE <-> INACTIVE (this list shows both, unlike Students/Groups)
  // without deleting the record. A real DELETE /teachers/{id} isn't exposed
  // from here — it's the Archive page's permanent-delete action, since the
  // backend rejects it outright while the teacher still has groups/history.
  const handleToggleStatus = async () => {
    if (!selectedTeacherId) return;
    try {
      await toggleTeacherStatus(selectedTeacherId).unwrap();
      toast.success(t("teachers.toast.statusToggled"));
    } catch (err) {
      const detail = extractApiError(err);
      toast.error(detail ? `${t("teachers.toast.error")}: ${detail}` : t("teachers.toast.error"));
    }
    handleCloseMenu();
  };

  /* ════════════════════════════════════════════════════════ */
  return (
    <div style={{ padding: "20px" }}>

      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Stack direction="row" alignItems="baseline" spacing={1}>
          <span style={{ fontSize: 22, fontWeight: 500 }}>{t("teachers.title")}</span>
          <span style={{ fontSize: 14, color: "var(--color-text-muted)" }}>{branchLabel} — {filteredTeachers.length} {t("teachers.countSuffix")}</span>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<GoPlus />} onClick={openAdd}
            sx={{ borderRadius: "20px", background: "#1a3a5c", boxShadow: "none", textTransform: "none", fontWeight: 500, px: 3 }}>
            {t("teachers.actions.addNew")}
          </Button>
          <Button variant="outlined" startIcon={<MdDownload />}
            sx={{ borderRadius: "20px", textTransform: "none", color: "inherit", borderColor: "var(--color-border)" }}>
            {t("teachers.actions.import")}
          </Button>
          <Button
            variant="outlined"
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            startIcon={isExportingExcel ? <CircularProgress size={16} /> : <PiMicrosoftExcelLogoFill size={18} />}
            sx={{ borderRadius: "20px", textTransform: "none", color: "inherit", borderColor: "var(--color-border)" }}>
            {t("teachers.actions.exportExcel")}
          </Button>
        </Stack>
      </Stack>

      {/* Alert */}
      <div style={{ background: "var(--color-success-surface)", border: "1px solid var(--color-success-border)", borderRadius: 8,
        padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#1d9e75",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", fontSize: 13 }}>✓</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-success-text)" }}>{t("teachers.alert.title")}</div>
          <div style={{ fontSize: 12, color: "var(--color-success-text)" }}>{t("teachers.alert.description")}</div>
        </div>
      </div>

      {/* Search */}
      <Stack direction="row" sx={{ pb: 2 }}>
        <Paper sx={{ p: "2px 4px", display: "flex", alignItems: "center", width: 320, boxShadow: "none", border: "1px solid var(--color-border)" }}>
          <InputBase value={searchValue} onChange={(e) => setSearchValue(e.target.value)} sx={{ ml: 1, flex: 1 }} placeholder={t("teachers.search.placeholder")} />
          <IconButton sx={{ p: "8px" }}><IoSearchOutline size={18} /></IconButton>
        </Paper>
      </Stack>

      {/* Table */}
      {teachersLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : (
        <TableContainer sx={{ borderRadius: "10px", border: "1px solid var(--color-border)" }}>
          <Table sx={{ bgcolor: "var(--color-surface)" }}>
            <TableBody sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", padding: "12px" }}>
              {filteredTeachers.map((teacher) => (
                <TableRow key={teacher.id} onClick={() => navigate(`/teachers/${teacher.id}`)}
                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                    border: "1px solid var(--color-border)", borderRadius: "10px", cursor: "pointer",
                    "&:hover": { bgcolor: "var(--color-surface-hover)" }, "& td": { border: 0 } }}>
                  <TableCell sx={{ fontWeight: 500, fontSize: 14, flex: 1, py: 1.8, display: "flex", alignItems: "center", gap: 1 }}>
                    {teacher.name}
                    {teacher.status === "INACTIVE" && (
                      <Chip label={t("teachers.table.inactive")} size="small" sx={{ height: 18, fontSize: 10 }} />
                    )}
                  </TableCell>
                  <TableCell sx={{ color: "var(--color-primary)", fontSize: 14, mr: 12 }}>{teacher.phone || teacher.email || "—"}</TableCell>
                  <TableCell sx={{ fontSize: 14, color: "var(--color-text-muted)", minWidth: 90, textAlign: "center", py: 1.8 }}>{groupCountByTeacherId.get(teacher.id) ?? 0} {t("teachers.table.groupsCount")}</TableCell>
                  <TableCell align="center" sx={{ py: 1.8 }} onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, teacher.id)}>
                      <BsThreeDotsVertical size={16} />
                    </IconButton>
                    <Menu anchorEl={anchorEl} open={openMenu && selectedTeacherId === teacher.id} onClose={handleCloseMenu}
                      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                      transformOrigin={{ vertical: "top", horizontal: "center" }}>
                      <MenuItem onClick={openEditDrawer}>✏️ {t("teachers.menu.edit")}</MenuItem>
                      <MenuItem onClick={handleSmsOpen}>📱 {t("teachers.menu.sms")}</MenuItem>
                      <MenuItem onClick={handleToggleStatus}>🔁 {t("teachers.menu.toggleStatus")}</MenuItem>
                    </Menu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTeachers.length === 0 && (
                <TableRow sx={{ "& td": { border: 0 } }}>
                  <TableCell colSpan={4} align="center" sx={{ color: "var(--color-text-muted)", py: 4 }}>{t("teachers.table.noData")}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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
        PaperProps={{ sx: { width: 460, display: "flex", flexDirection: "column", bgcolor: "var(--color-surface)" } }}>

        {/* header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          px: 3, py: 2.5, borderBottom: "1px solid var(--color-border)" }}>
          <Typography fontWeight={700} fontSize={17} color="var(--color-text-primary)">
            {isEdit ? t("teachers.drawer.editTitle") : t("teachers.drawer.addTitle")}
          </Typography>
          <IconButton onClick={() => setOpen(false)} size="small" sx={{ color: "var(--color-text-muted)" }}>
            <MdClose size={20} />
          </IconButton>
        </Box>

        {/* scrollable body */}
        <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 3 }}>
          <Stack spacing={2.5}>

            {/* Phone */}
            <Box>
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("teachers.form.phone")}</Typography>
              <TextField name="phone" value={form.phone} onChange={handleChange}
                fullWidth size="small" placeholder={t("teachers.form.phonePlaceholder")}
                error={Boolean(errors.phone)} helperText={errors.phone}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5,
                        borderRight: "1px solid var(--color-border)", pr: 1.2, mr: 0.5,
                        fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500, whiteSpace: "nowrap" }}>
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
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("teachers.form.name")}</Typography>
              <TextField name="name" value={form.name} onChange={handleChange}
                fullWidth size="small" placeholder={t("teachers.form.namePlaceholder")}
                error={Boolean(errors.name)} helperText={errors.name}
                sx={inputSx} />
            </Box>

            {/* Date of birth */}
            <Box>
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("teachers.form.dob")}</Typography>
              <TextField name="dob" type="date" value={form.dob} onChange={handleChange}
                fullWidth size="small" InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MdCalendarToday size={15} color="var(--color-text-muted)" />
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
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("teachers.form.gender")}</Typography>
              <FormControl>
                <RadioGroup row name="gender" value={form.gender} onChange={handleChange}>
                  <FormControlLabel value="MALE"
                    control={<Radio size="small" sx={{ color: "var(--color-text-muted)", "&.Mui-checked": { color: "#5b8def" } }} />}
                    label={<Typography fontSize={14}>{t("teachers.form.genderMale")}</Typography>} />
                  <FormControlLabel value="FEMALE"
                    control={<Radio size="small" sx={{ color: "var(--color-text-muted)", "&.Mui-checked": { color: "#5b8def" } }} />}
                    label={<Typography fontSize={14}>{t("teachers.form.genderFemale")}</Typography>} />
                </RadioGroup>
              </FormControl>
            </Box>

            {/* Photo */}
            <Box>
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("teachers.form.photo")}</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {photoPreview && (
                  <Box component="img" src={photoPreview} alt={t("teachers.form.photoPreviewAlt")}
                    sx={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--color-border)", flexShrink: 0 }} />
                )}
                <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
                  border: "1px solid var(--color-border)", borderRadius: "10px", bgcolor: "var(--color-surface-alt)", px: 1.5, py: 0.9 }}>
                  <Typography fontSize={13} color="var(--color-text-muted)" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {form.photo ? form.photo.name : t("teachers.form.noFileChosen")}
                  </Typography>
                  <Button size="small" variant="outlined" onClick={() => fileInputRef.current?.click()}
                    sx={{ fontSize: 12, borderRadius: "8px", borderColor: "var(--color-border)", color: "var(--color-text-secondary)",
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
        <Box sx={{ px: 3, py: 2.5, borderTop: "1px solid var(--color-border)" }}>
          <Button fullWidth variant="contained" onClick={handleSubmit} disabled={isCreating || isUpdating}
            sx={{
              borderRadius: "24px", py: 1.3, fontSize: 15, fontWeight: 600,
              textTransform: "none", bgcolor: "#4f7ec4",
              boxShadow: "0 4px 12px rgba(79,126,196,0.35)",
              "&:hover": { bgcolor: "#3b6ab0" },
            }}>
            {(isCreating || isUpdating) ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : t("teachers.form.submit")}
          </Button>
        </Box>
      </Drawer>

    </div>
  );
};
