// src/pages/Settings/ceo/pages/staff/staff.tsx
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Drawer,
  TextField,
  IconButton,
  InputAdornment,
  InputBase,
  Menu,
  MenuItem,
  Select,
  Chip,
  CircularProgress,
  Stack,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
} from "@mui/material";
import {
  MdOutlineEmail,
  MdClose,
  MdCloudUpload,
  MdCalendarToday,
} from "react-icons/md";
import { IoSearchOutline } from "react-icons/io5";
import { GoPlus } from "react-icons/go";
import { BsThreeDotsVertical } from "react-icons/bs";
import { HiEye, HiEyeOff } from "react-icons/hi";
import { useMemo, useRef, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SendSmsModal } from "../../../../../components/SendSmsModal";
import { useToast } from "../../../../../Context/ToastContext";
import { extractApiError } from "../../../../../utils";
import type { RootState } from "../../../../../app/store";
import {
  useStaffUsersQuery,
  useCreateStaffUserMutation,
  useUpdateStaffUserMutation,
  useToggleStaffUserStatusMutation,
} from "../../../../../app/api/usersApi";
import type { UserStatus } from "../../../../../app/api/usersApi/types";
import { useAllBranchesQuery } from "../../../../../app/api/branchesApi";
// GET /users only returns ADMIN/SUPERADMIN accounts (its own Swagger
// description: "STUDENT va TEACHER bu ro'yxatga kirmaydi" — students and
// teachers are excluded) — Teacher records are merged in from the real,
// already-working Teachers API so this page can show every staff member
// (CEO/admins/managers + teachers), not just the users-table subset.
import { useAllTeachersQuery, useToggleTeacherStatusMutation } from "../../../../../app/api/teachersApi";
import type { Teacher } from "../../../../../app/api/teachersApi/types";

// The 8 position labels from the reference design. `role` on POST/PATCH
// /users is a plain optional string (Swagger has no enum for it and no
// endpoint lists valid values), so these are sent verbatim as typed here —
// not invented codes, just the exact labels shown in the reference. Only one
// can apply per user (the field is a single string), so the UI below is
// checkbox-styled but behaves as a single-select.
const ROLE_OPTIONS = [
  "CEO",
  "Branch Director",
  "Administrator",
  "Administrator2",
  "Limited Administrator",
  "Teacher",
  "Marketer",
  "Cashier",
];

interface StaffForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  rolePermissionId: string;
  branchIds: string[];
  dateOfBirth: string;
  gender: string;
  photo: File | null;
}

const EMPTY_FORM: StaffForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "",
  rolePermissionId: "",
  branchIds: [],
  dateOfBirth: "",
  gender: "",
  photo: null,
};

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

const PAGE_SIZE = 10;

interface UnifiedStaffRow {
  id: string;
  kind: "user" | "teacher";
  name: string;
  role: string;
  jobTitle: string;
  phone: string | null;
  email: string | null;
  status: string;
}

export const Staff = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | UserStatus>("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchValue.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchValue]);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, selectedBranchId]);

  // Both APIs accept the same search/status/branchId filters — fetched with
  // a large limit (same convention Students/Teachers pages already use for
  // "fetch effectively all") since the two sources are merged and paginated
  // together client-side below, which server-side pagination on either one
  // alone couldn't do.
  const sourceQueryArgs = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      limit: 200,
      branchId: selectedBranchId ?? undefined,
    }),
    [debouncedSearch, statusFilter, selectedBranchId]
  );

  const { data: usersData, isLoading: usersLoading, isError: usersError } = useStaffUsersQuery(sourceQueryArgs);
  // GET /users excludes teachers by design (see import comment above) — this
  // fills that gap so CEO/admins/managers AND teachers all show up here.
  const { data: teachersData, isLoading: teachersLoading, isError: teachersError } = useAllTeachersQuery(sourceQueryArgs);
  const { data: branchesData } = useAllBranchesQuery();
  const [createStaffUser, { isLoading: isCreating }] = useCreateStaffUserMutation();
  const [updateStaffUser, { isLoading: isUpdating }] = useUpdateStaffUserMutation();
  const [toggleStaffUserStatus] = useToggleStaffUserStatusMutation();
  const [toggleTeacherStatus] = useToggleTeacherStatusMutation();

  const staffLoading = usersLoading || teachersLoading;
  const staffError = usersError || teachersError;

  const unifiedRows: UnifiedStaffRow[] = useMemo(() => {
    const fromUsers: UnifiedStaffRow[] = (usersData?.rows ?? []).map((u) => ({
      id: u.id,
      kind: "user",
      name: u.name,
      role: u.role || "—",
      jobTitle: u.rolePermission?.name ?? "—",
      phone: u.phone,
      email: u.email,
      status: u.status,
    }));
    const fromTeachers: UnifiedStaffRow[] = (teachersData?.data ?? []).map((tch: Teacher) => ({
      id: tch.id,
      kind: "teacher",
      name: tch.name,
      role: "Teacher",
      jobTitle: tch.specialization ?? "—",
      phone: tch.phone,
      email: tch.email,
      status: tch.status,
    }));
    return [...fromUsers, ...fromTeachers];
  }, [usersData, teachersData]);

  const totalPages = Math.max(1, Math.ceil(unifiedRows.length / PAGE_SIZE));
  const rows = unifiedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // GET /branches includes soft-deleted/deactivated branches — filtered to
  // ACTIVE only, same convention as Header's own branch dropdown, so a
  // staff member can't be assigned to a branch that no longer exists.
  const branchOptions = (branchesData?.data ?? [])
    .filter((b) => b.status === "ACTIVE")
    .map((b) => ({ id: b.id, name: b.name }));

  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<{ id: string; kind: "user" | "teacher" } | null>(null);
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  const [smsOpen, setSmsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const openMenu = Boolean(anchorEl);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, id: string, kind: "user" | "teacher") => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    setSelectedMember({ id, kind });
  };
  const handleCloseMenu = () => setAnchorEl(null);

  const openAdd = () => {
    setIsEdit(false);
    setSelectedMember(null);
    setForm(EMPTY_FORM);
    setPhotoPreview(null);
    setShowPassword(false);
    setErrors({});
    setFormError(null);
    setOpen(true);
  };

  // Editing is only meaningful for real `users`-table rows here — a merged
  // Teacher row's "Edit" menu item (below) opens its own real edit surface
  // on the Teachers page instead, since this drawer only knows how to submit
  // to POST/PATCH /users.
  const openEditDrawer = () => {
    if (selectedMember?.kind !== "user") { handleCloseMenu(); return; }
    const member = (usersData?.rows ?? []).find((s) => s.id === selectedMember.id);
    if (member) {
      setIsEdit(true);
      setForm({
        name: member.name,
        email: member.email ?? "",
        phone: member.phone ?? "",
        password: "",
        role: member.role ?? "",
        rolePermissionId: member.rolePermission?.id ?? "",
        branchIds: [],
        dateOfBirth: "",
        gender: "",
        photo: null,
      });
      setPhotoPreview(null);
      setShowPassword(false);
      setErrors({});
      setFormError(null);
      setOpen(true);
    }
    handleCloseMenu();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm((prev) => ({ ...prev, photo: file }));
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = t("settings.ceo.staff.validation.nameRequired");
    if (!isEdit && !form.rolePermissionId.trim()) e.rolePermissionId = t("settings.ceo.staff.validation.rolePermissionIdRequired");
    if (!isEdit && !form.email.trim() && !form.phone.trim()) e.phone = t("settings.ceo.staff.validation.contactRequired");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!validate()) return;
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      password: form.password || undefined,
      role: form.role.trim() || undefined,
      rolePermissionId: form.rolePermissionId.trim() || undefined,
      branchIds: form.branchIds.length ? form.branchIds : undefined,
      birthdate: form.dateOfBirth || undefined,
      gender: form.gender || undefined,
      photo: form.photo ?? undefined,
    };
    try {
      if (isEdit && selectedMember) {
        await updateStaffUser({ id: selectedMember.id, ...payload }).unwrap();
        toast.success(t("settings.ceo.staff.toast.updated"));
      } else {
        await createStaffUser({
          ...payload,
          name: form.name.trim(),
          rolePermissionId: form.rolePermissionId.trim(),
        }).unwrap();
        toast.success(t("settings.ceo.staff.toast.created"));
      }
      setOpen(false);
      setForm(EMPTY_FORM);
      setSelectedMember(null);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.ceo.staff.toast.error");
      const message = detail ? `${generic}: ${detail}` : generic;
      setFormError(message);
      toast.error(message);
    }
  };

  const handleSmsOpen = () => { setSmsOpen(true); handleCloseMenu(); };

  // The only "remove" action on this list: PATCH .../{id}/toggle-status
  // flips ACTIVE <-> INACTIVE without deleting the record, for both users
  // and merged-in teacher rows. A real DELETE isn't exposed from here — for
  // users, Swagger documents it as a hard delete rejected with 409 while
  // still assigned to a branch; permanent removal belongs on the Archive
  // page (staff) / Teachers page's own archive flow (teacher rows).
  const handleToggleStatus = async () => {
    if (!selectedMember) return;
    try {
      if (selectedMember.kind === "user") {
        await toggleStaffUserStatus(selectedMember.id).unwrap();
      } else {
        await toggleTeacherStatus(selectedMember.id).unwrap();
      }
      toast.success(t("settings.ceo.staff.toast.statusToggled"));
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.ceo.staff.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
    handleCloseMenu();
  };

  const handleOpenTeacherProfile = () => {
    if (selectedMember?.kind === "teacher") navigate(`/teachers/${selectedMember.id}`);
    handleCloseMenu();
  };

  return (
    <Box sx={{ p: 3, bgcolor: "var(--color-bg-page)", minHeight: "100vh" }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Stack direction="row" alignItems="baseline" spacing={1}>
          <Typography fontSize={22} fontWeight={500} color="var(--color-text-primary)">
            {t("settings.ceo.staff.title")}
          </Typography>
          <Typography fontSize={14} color="var(--color-text-muted)">
            {unifiedRows.length} {t("settings.ceo.staff.countSuffix")}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="contained"
            startIcon={<GoPlus />}
            onClick={openAdd}
            sx={{
              bgcolor: "#1a3f6f",
              borderRadius: 5,
              px: 3,
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 1,
              boxShadow: "none",
              textTransform: "none",
              "&:hover": { bgcolor: "#15345c" },
            }}
          >
            {t("settings.ceo.staff.addNew")}
          </Button>
          <Button
            variant="outlined"
            startIcon={<MdCloudUpload />}
            sx={{
              borderRadius: 5,
              px: 2.5,
              fontSize: 13,
              textTransform: "none",
              borderColor: "var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            {t("settings.ceo.staff.import")}
          </Button>
        </Stack>
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={1.5} sx={{ pb: 2 }} flexWrap="wrap">
        <Paper sx={{ p: "2px 4px", display: "flex", alignItems: "center", width: 280, boxShadow: "none", border: "1px solid var(--color-border)" }}>
          <InputBase
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            sx={{ ml: 1, flex: 1, fontSize: 14 }}
            placeholder={t("settings.ceo.staff.search.placeholder")}
          />
          <IconButton sx={{ p: "8px" }}><IoSearchOutline size={18} /></IconButton>
        </Paper>
        <Select
          size="small"
          displayEmpty
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | UserStatus)}
          sx={{ minWidth: 160, bgcolor: "#fff", fontSize: 14 }}
        >
          <MenuItem value="">{t("settings.ceo.staff.filters.allStatuses")}</MenuItem>
          <MenuItem value="ACTIVE">{t("settings.ceo.staff.filters.active")}</MenuItem>
          <MenuItem value="INACTIVE">{t("settings.ceo.staff.filters.inactive")}</MenuItem>
        </Select>
      </Stack>

      {/* Table */}
      {staffLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : staffError ? (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography color="error" fontSize={14}>{t("settings.ceo.staff.table.loadError")}</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: "1px solid var(--color-border)" }}>
          <Table>
            <TableBody>
              {rows.map((member, i) => (
                <TableRow key={member.id} sx={{ "&:hover": { bgcolor: "var(--color-surface-hover)" } }}>
                  <TableCell sx={{ fontSize: 13, color: "var(--color-text-muted)", verticalAlign: "top", pt: 2, width: 40 }}>
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </TableCell>
                  <TableCell sx={{ fontSize: 14, verticalAlign: "top", pt: 2 }}>
                    <Stack direction="row" alignItems="center" gap={1}>
                      {member.name}
                      {member.status === "INACTIVE" && (
                        <Chip label={t("settings.ceo.staff.filters.inactive")} size="small" sx={{ height: 18, fontSize: 10 }} />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ verticalAlign: "top", pt: 2 }}>
                    <Typography fontSize={13} color="var(--color-text-secondary)">{member.role || "—"}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, color: "var(--color-text-secondary)", verticalAlign: "top", pt: 2 }}>
                    {member.jobTitle}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, verticalAlign: "top", pt: 2 }}>
                    {member.phone || member.email || "—"}
                  </TableCell>
                  <TableCell align="right" sx={{ verticalAlign: "top", pt: 1.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                      <IconButton size="small" sx={{ color: "#f0a500" }} onClick={() => { setSelectedMember({ id: member.id, kind: member.kind }); handleSmsOpen(); }}>
                        <MdOutlineEmail size={20} />
                      </IconButton>
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, member.id, member.kind)}>
                        <BsThreeDotsVertical size={18} />
                      </IconButton>
                    </Box>
                    <Menu
                      anchorEl={anchorEl}
                      open={openMenu && selectedMember?.id === member.id}
                      onClose={handleCloseMenu}
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      transformOrigin={{ vertical: "top", horizontal: "right" }}
                    >
                      {member.kind === "user"
                        ? <MenuItem onClick={openEditDrawer}>{t("settings.ceo.staff.menu.edit")}</MenuItem>
                        : <MenuItem onClick={handleOpenTeacherProfile}>{t("settings.ceo.staff.menu.edit")}</MenuItem>}
                      <MenuItem onClick={handleToggleStatus}>{t("settings.ceo.staff.menu.toggleStatus")}</MenuItem>
                    </Menu>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ color: "var(--color-text-muted)", py: 4 }}>
                    {t("settings.ceo.staff.table.noData")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Stack direction="row" justifyContent="center" spacing={1} mt={2}>
          <Button size="small" variant="outlined" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            {t("settings.ceo.staff.pagination.prev")}
          </Button>
          <Typography fontSize={13} color="var(--color-text-secondary)" sx={{ display: "flex", alignItems: "center", px: 1 }}>
            {page} / {totalPages}
          </Typography>
          <Button size="small" variant="outlined" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            {t("settings.ceo.staff.pagination.next")}
          </Button>
        </Stack>
      )}

      <SendSmsModal
        open={smsOpen}
        onClose={() => { setSmsOpen(false); setSelectedMember(null); }}
        selectedCount={1}
        recipientLabel={t("settings.ceo.staff.sms.recipientLabel")}
        sender="3700"
      />

      {/* Drawer */}
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: 420, display: "flex", flexDirection: "column", bgcolor: "var(--color-surface)" } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2.5, borderBottom: "1px solid var(--color-border)" }}>
          <Typography fontWeight={700} fontSize={17} color="var(--color-text-primary)">
            {isEdit ? t("settings.ceo.staff.drawer.editTitle") : t("settings.ceo.staff.drawer.addTitle")}
          </Typography>
          <IconButton onClick={() => setOpen(false)} size="small" sx={{ color: "var(--color-text-muted)" }}>
            <MdClose size={20} />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 3 }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("settings.ceo.staff.form.name")}</Typography>
              <TextField name="name" value={form.name} onChange={handleChange} fullWidth size="small" error={Boolean(errors.name)} helperText={errors.name} sx={inputSx} />
            </Box>

            <Box>
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("settings.ceo.staff.form.phone")}</Typography>
              <TextField
                name="phone" value={form.phone} onChange={handleChange} fullWidth size="small"
                error={Boolean(errors.phone)} helperText={errors.phone}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box sx={{ fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500, whiteSpace: "nowrap", borderRight: "1px solid var(--color-border)", pr: 1, mr: 0.5 }}>
                        +998
                      </Box>
                    </InputAdornment>
                  ),
                }}
                sx={inputSx}
              />
            </Box>

            <Box>
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("settings.ceo.staff.form.email")}</Typography>
              <TextField name="email" value={form.email} onChange={handleChange} fullWidth size="small" placeholder={t("settings.ceo.staff.form.emailPlaceholder")} sx={inputSx} />
            </Box>

            <Box>
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("settings.ceo.staff.form.rolePermissionId")}</Typography>
              <TextField
                name="rolePermissionId" value={form.rolePermissionId} onChange={handleChange} fullWidth size="small"
                error={Boolean(errors.rolePermissionId)}
                helperText={errors.rolePermissionId || t("settings.ceo.staff.form.rolePermissionIdHelp")}
                sx={inputSx}
              />
            </Box>

            <Box>
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("settings.ceo.staff.form.role")}</Typography>
              {/* `role` is a single plain string on POST/PATCH /users (no
                  enum, no listing endpoint) — checkbox-styled to match the
                  reference design, but only one stays checked at a time
                  since the backend can only store one value. */}
              <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 2, rowGap: 0.5 }}>
                {ROLE_OPTIONS.map((option) => (
                  <FormControlLabel
                    key={option}
                    control={
                      <Checkbox
                        size="small"
                        checked={form.role === option}
                        onChange={() => setForm((p) => ({ ...p, role: p.role === option ? "" : option }))}
                      />
                    }
                    label={<span style={{ fontSize: 13 }}>{option}</span>}
                    sx={{ mr: 0 }}
                  />
                ))}
              </Box>
            </Box>

            <Box>
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("settings.ceo.staff.form.branches")}</Typography>
              <Select
                multiple
                size="small"
                fullWidth
                displayEmpty
                value={form.branchIds}
                onChange={(e) => setForm((p) => ({ ...p, branchIds: e.target.value as string[] }))}
                renderValue={(selected) =>
                  (selected as string[]).length
                    ? (selected as string[]).map((id) => branchOptions.find((b) => b.id === id)?.name ?? id).join(", ")
                    : <span style={{ color: "var(--color-text-muted)" }}>{t("settings.ceo.staff.form.branches")}</span>
                }
                sx={{ bgcolor: "var(--color-surface-alt)", fontSize: 14 }}
              >
                {branchOptions.map((b) => (
                  <MenuItem key={b.id} value={b.id} sx={{ fontSize: 14 }}>{b.name}</MenuItem>
                ))}
              </Select>
            </Box>

            <Box>
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("settings.ceo.staff.form.dateOfBirth")}</Typography>
              <TextField
                name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} fullWidth size="small"
                InputLabelProps={{ shrink: true }}
                InputProps={{ startAdornment: (<InputAdornment position="start"><MdCalendarToday size={15} color="var(--color-text-muted)" /></InputAdornment>) }}
                sx={inputSx}
              />
            </Box>

            <Box>
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("settings.ceo.staff.form.gender")}</Typography>
              <RadioGroup
                row
                value={form.gender}
                onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
              >
                <FormControlLabel value="MALE" control={<Radio size="small" />} label={<span style={{ fontSize: 13 }}>{t("settings.ceo.staff.form.male")}</span>} />
                <FormControlLabel value="FEMALE" control={<Radio size="small" />} label={<span style={{ fontSize: 13 }}>{t("settings.ceo.staff.form.female")}</span>} />
              </RadioGroup>
            </Box>

            <Box>
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("settings.ceo.staff.form.photo")}</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {photoPreview && (
                  <Box component="img" src={photoPreview} sx={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--color-border)", flexShrink: 0 }} />
                )}
                <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--color-border)", borderRadius: "10px", bgcolor: "var(--color-surface-alt)", px: 1.5, py: 0.9 }}>
                  <Typography fontSize={13} color="var(--color-text-muted)" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {form.photo ? form.photo.name : t("settings.ceo.staff.form.noFileChosen")}
                  </Typography>
                  <Button size="small" variant="outlined" onClick={() => fileInputRef.current?.click()} sx={{ fontSize: 12, borderRadius: "8px", borderColor: "var(--color-border)", color: "var(--color-text-secondary)", textTransform: "none", py: 0.3, px: 1.5, minWidth: 0, flexShrink: 0 }}>
                    {t("settings.ceo.staff.form.browse")}
                  </Button>
                </Box>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
              </Box>
            </Box>

            <Box>
              <Button onClick={() => setShowPassword((v) => !v)} sx={{ fontSize: 13, color: "#5b8def", textTransform: "none", p: 0, fontWeight: 500, "&:hover": { background: "none", textDecoration: "underline" } }}>
                {showPassword ? t("settings.ceo.staff.form.hidePasswordToggle") : t("settings.ceo.staff.form.setPasswordToggle")}
              </Button>
              {showPassword && (
                <TextField
                  name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange}
                  fullWidth size="small" placeholder={t("settings.ceo.staff.form.passwordPlaceholder")} sx={{ ...inputSx, mt: 1.5 }}
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
              )}
            </Box>

            {formError && (
              <Typography fontSize={13} color="error">{formError}</Typography>
            )}
          </Stack>
        </Box>

        <Box sx={{ px: 3, py: 2.5, borderTop: "1px solid var(--color-border)" }}>
          <Button
            fullWidth variant="contained" onClick={handleSubmit} disabled={isCreating || isUpdating}
            sx={{ borderRadius: "24px", py: 1.3, fontSize: 15, fontWeight: 600, textTransform: "none", bgcolor: "#4f7ec4", boxShadow: "0 4px 12px rgba(79,126,196,0.35)", "&:hover": { bgcolor: "#3b6ab0" } }}
          >
            {(isCreating || isUpdating) ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : t("settings.ceo.staff.form.submit")}
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
};

export default Staff;
