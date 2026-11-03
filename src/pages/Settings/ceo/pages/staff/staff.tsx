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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  MdOutlineEmail,
  MdClose,
  MdDelete,
} from "react-icons/md";
import { IoSearchOutline } from "react-icons/io5";
import { GoPlus } from "react-icons/go";
import { BsThreeDotsVertical } from "react-icons/bs";
import { PiMicrosoftExcelLogoFill } from "react-icons/pi";
import { HiEye, HiEyeOff } from "react-icons/hi";
import { useMemo, useRef, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SendSmsModal } from "../../../../../components/SendSmsModal";
import { useToast } from "../../../../../Context/ToastContext";
import { DatePickerField } from "../../../../SingleGroup/DatePickerField";
import { extractApiError, downloadExcelBlob, submitOnEnter } from "../../../../../utils";
import { useBranch } from "../../../../../Context/BranchContext";
import type { RootState } from "../../../../../app/store";
import {
  useStaffUsersQuery,
  useCreateStaffUserMutation,
  useUpdateStaffUserMutation,
  useToggleStaffUserStatusMutation,
  useLazyStaffUserForEditQuery,
  useLazyStaffUsersExcelQuery,
} from "../../../../../app/api/usersApi";
import type { RolePermissionRef, StaffUserBranchRef, UserStatus } from "../../../../../app/api/usersApi/types";
import { useAllBranchesQuery } from "../../../../../app/api/branchesApi";
import {
  useRolePermissionsSelectQuery,
  useAssignRolePermissionToUserMutation,
  useRemoveRolePermissionFromUserMutation,
} from "../../../../../app/api/rolePermissionsApi";
import { usePersistedState } from "../../../../../hooks/usePersistedState";
import { resolveMediaUrl } from "../../../../../utils/mediaUrl";
import {
  EMPTY_FORM,
  buildCreatePayload,
  buildEditForm,
  buildUpdatePayload,
  planRolePermissionChanges,
  validateStaffForm,
  type StaffForm,
} from "./staffForm";

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
  name: string;
  // Every tag shown in the Role column: the system role plus any assigned
  // lavozim name(s) — e.g. ["ADMIN", "Bosh Admin (To'liq Ruxsatlar)"].
  // Mirrors AUTH_ROLE_DOCS.md's `roles` flattening on /auth/me, built here
  // from the same two fields (role + rolePermission) GET /users returns.
  roleTags: string[];
  jobTitle: string;
  phone: string | null;
  email: string | null;
  status: string;
}

export const Staff = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);
  const { branchLabel } = useBranch();

  const [searchValue, setSearchValue] = usePersistedState("staff:searchValue", "");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = usePersistedState<"" | UserStatus>("staff:statusFilter", "");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchValue.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchValue]);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, selectedBranchId]);

  // GET /users only ever returns ADMIN/SUPERADMIN accounts — teachers have
  // their own dedicated page (/teachers) and are deliberately NOT merged in
  // here anymore (they used to be; product direction is that Employees
  // shows staff accounts only).
  const usersQueryArgs = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      limit: PAGE_SIZE,
      page,
      branchId: selectedBranchId ?? undefined,
    }),
    [debouncedSearch, statusFilter, selectedBranchId, page]
  );

  const { data: usersData, isLoading: usersLoading, isError: usersError } = useStaffUsersQuery(usersQueryArgs);
  const { data: branchesData } = useAllBranchesQuery();
  const { data: rolePermissionOptions, isLoading: positionsLoading } = useRolePermissionsSelectQuery();
  const [createStaffUser, { isLoading: isCreating }] = useCreateStaffUserMutation();
  const [updateStaffUser, { isLoading: isUpdating }] = useUpdateStaffUserMutation();
  const [assignRolePermission] = useAssignRolePermissionToUserMutation();
  const [removeRolePermission] = useRemoveRolePermissionFromUserMutation();
  const [isSavingRoles, setIsSavingRoles] = useState(false);
  const [toggleStaffUserStatus] = useToggleStaffUserStatusMutation();
  const [fetchStaffUserForEdit] = useLazyStaffUserForEditQuery();
  const [fetchStaffUsersExcel, { isFetching: isExportingExcel }] = useLazyStaffUsersExcelQuery();

  const staffLoading = usersLoading;
  const staffError = usersError;

  const unifiedRows: UnifiedStaffRow[] = useMemo(
    () =>
      (usersData?.rows ?? []).map((u) => ({
        id: u.id,
        name: u.name,
        roleTags: [u.role, ...u.rolePermissions.map((rp) => rp.name)].filter((v): v is string => Boolean(v)),
        jobTitle: u.jobTitle || "—",
        phone: u.phone,
        email: u.email,
        status: u.status,
      })),
    [usersData]
  );

  const totalPages = Math.max(1, usersData?.meta.totalPages ?? 1);
  const totalCount = usersData?.meta.total ?? unifiedRows.length;
  const rows = unifiedRows;
  // GET /branches includes soft-deleted/deactivated branches — filtered to
  // ACTIVE only, same convention as Header's own branch dropdown, so a
  // staff member can't be assigned to a branch that no longer exists.
  const branchOptions = useMemo(
    () => (branchesData?.data ?? []).filter((b) => b.status === "ACTIVE").map((b) => ({ id: b.id, name: b.name })),
    [branchesData]
  );

  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<{ id: string } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  // What the edit drawer was opened with (null when adding): the baseline that
  // decides which fields changed and which positions were added or dropped
  // (see buildUpdatePayload / planRolePermissionChanges).
  const [editInitial, setEditInitial] = useState<StaffForm | null>(null);
  // The edited member's own positions and branches, as the list names them:
  // /role-permissions/select only returns ACTIVE positions and the branch
  // picker only ACTIVE branches, so a member who still holds an inactive one
  // would otherwise show it unticked (or as a raw id).
  const [editKnownPositions, setEditKnownPositions] = useState<RolePermissionRef[]>([]);
  const [editKnownBranches, setEditKnownBranches] = useState<StaffUserBranchRef["branch"][]>([]);
  // True from the click on "Edit" until GET /users/{id}/for-edit has answered.
  const [editLoading, setEditLoading] = useState(false);
  // Bumped whenever the drawer is opened or closed: a for-edit answer that
  // arrives for an older opening (drawer closed meanwhile, or another member
  // opened) must not fill the form.
  const editRequestRef = useRef(0);
  const [smsOpen, setSmsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Ticked positions first need a label: the active ones from /select, plus
  // any the edited member already holds.
  const positionOptions = useMemo(() => {
    const options = [...(rolePermissionOptions ?? [])];
    for (const known of editKnownPositions) {
      if (known.name && !options.some((o) => o.id === known.id)) options.push(known);
    }
    return options;
  }, [rolePermissionOptions, editKnownPositions]);
  const branchChoices = useMemo(() => {
    const choices = [...branchOptions];
    for (const known of editKnownBranches) {
      if (known.name && !choices.some((b) => b.id === known.id)) choices.push({ id: known.id, name: known.name });
    }
    return choices;
  }, [branchOptions, editKnownBranches]);
  const selectedBranchName = branchOptions.find((b) => b.id === selectedBranchId)?.name;
  const editStatus = isEdit ? usersData?.rows.find((u) => u.id === selectedMember?.id)?.status : undefined;
  const showBranchPicker = isEdit || !selectedBranchId;
  const formBusy = isCreating || isUpdating || isSavingRoles || editLoading;

  const openMenu = Boolean(anchorEl);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, id: string) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    setSelectedMember({ id });
  };
  const handleCloseMenu = () => setAnchorEl(null);

  // Every opening starts from a clean slate: all form state is (re)initialised
  // here or in openEditDrawer, never carried over from the previous member.
  const resetDrawerState = () => {
    setEditInitial(null);
    setEditKnownPositions([]);
    setEditKnownBranches([]);
    setPhotoPreview(null);
    setShowPassword(false);
    setErrors({});
    setFormError(null);
  };

  const closeDrawer = () => {
    editRequestRef.current += 1;
    setEditLoading(false);
    setOpen(false);
  };

  const openAdd = () => {
    editRequestRef.current += 1;
    setEditLoading(false);
    setIsEdit(false);
    setSelectedMember(null);
    setForm(EMPTY_FORM);
    resetDrawerState();
    setOpen(true);
  };

  // GET /users/{id}/for-edit is the only endpoint that actually returns
  // branchIds/gender/birthdate (confirmed live, 2026-09) — the already-
  // cached list row (StaffUser) doesn't carry those, so prefilling from it
  // alone used to silently blank them out on every edit. The drawer opens at
  // once on a spinner and fills in when the answer arrives; the list row
  // supplies what for-edit doesn't name (the member's other positions, role).
  const openEditDrawer = async () => {
    const memberId = selectedMember?.id;
    handleCloseMenu();
    if (!memberId) return;
    // The row as it is now, before the await: the list may change meanwhile.
    const row = usersData?.rows.find((u) => u.id === memberId) ?? null;
    const requestId = ++editRequestRef.current;
    setIsEdit(true);
    setSelectedMember({ id: memberId });
    setForm(EMPTY_FORM);
    resetDrawerState();
    setEditLoading(true);
    setOpen(true);
    try {
      const member = await fetchStaffUserForEdit(memberId).unwrap();
      if (requestId !== editRequestRef.current) return;
      const loaded = buildEditForm(member, row);
      setForm(loaded);
      setEditInitial(loaded);
      setEditKnownPositions(row?.rolePermissions ?? []);
      setEditKnownBranches((row?.branches ?? []).map((b) => b.branch));
      setPhotoPreview(resolveMediaUrl(member.photo ?? row?.photo));
    } catch (err) {
      if (requestId !== editRequestRef.current) return;
      setOpen(false);
      toast.error(extractApiError(err) || t("settings.ceo.staff.toast.error"));
    } finally {
      if (requestId === editRequestRef.current) setEditLoading(false);
    }
  };

  // Typing in a field retires the message that was about that field.
  const clearError = (field: string) => {
    setFormError(null);
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm((prev) => ({ ...prev, photo: file }));
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // The rules live in staffForm.ts; the first message is also shown beside the
  // submit button, since the field it belongs to may be scrolled out of view.
  const validate = () => {
    const found = validateStaffForm(form, editInitial);
    const messages: Record<string, string> = {};
    for (const [field, key] of Object.entries(found)) messages[field] = t(key);
    setErrors(messages);
    const first = Object.values(messages)[0];
    if (first) setFormError(first);
    return !first;
  };

  // POST /users' response shape for the created record isn't documented
  // beyond {success, message, data} — read defensively the same way every
  // other loosely-typed list row in this file already is (see `str`-style
  // helpers in usersApi.tsx).
  const extractUserId = (response: unknown): string | null => {
    const data = (response as { data?: { id?: string; _id?: string } } | undefined)?.data;
    const id = data?.id ?? data?._id;
    return typeof id === "string" && id ? id : null;
  };

  // A remove-user answered 404 means the member no longer holds that position
  // (e.g. the PATCH already swapped it out) — which is what was asked for.
  const isNotFound = (err: unknown) => (err as { status?: unknown } | undefined)?.status === 404;

  const handleSubmit = async () => {
    if (editLoading) return;
    setFormError(null);
    if (!validate()) return;
    try {
      let userId: string | null = null;
      let assign: string[] = [];
      let remove: string[] = [];
      if (isEdit && selectedMember && editInitial) {
        const plan = planRolePermissionChanges(editInitial.rolePermissionIds, form.rolePermissionIds);
        assign = plan.assign;
        remove = plan.remove;
        const payload = buildUpdatePayload(form, editInitial, plan);
        // Nothing but positions (or nothing at all) changed: no PATCH needed.
        if (Object.keys(payload).length > 0) await updateStaffUser({ id: selectedMember.id, ...payload }).unwrap();
        userId = selectedMember.id;
      } else {
        const payload = buildCreatePayload(form, selectedBranchId);
        const created = await createStaffUser(payload).unwrap();
        userId = extractUserId(created);
        assign = form.rolePermissionIds.filter((id) => id !== payload.rolePermissionId);
      }

      // Every additional lavozim beyond the primary one is a separate
      // attach call (POST /role-permissions/{id}/assign-user/{userId} —
      // AUTH_ROLE_DOCS.md §14, idempotent even if already assigned). On
      // edit, a lavozim the member held that got unchecked is explicitly
      // detached — nothing this page was never told about is ever touched.
      let rolesFailed = false;
      if (userId && (assign.length > 0 || remove.length > 0)) {
        setIsSavingRoles(true);
        try {
          const results = await Promise.allSettled([
            ...assign.map((rpId) => assignRolePermission({ id: rpId, userId: userId! }).unwrap()),
            ...remove.map((rpId) =>
              removeRolePermission({ id: rpId, userId: userId! }).unwrap().catch((err) => {
                if (!isNotFound(err)) throw err;
              })
            ),
          ]);
          rolesFailed = results.some((r) => r.status === "rejected");
        } finally {
          setIsSavingRoles(false);
        }
      }

      if (rolesFailed) toast.error(t("settings.ceo.staff.toast.rolePermissionPartialError"));
      else toast.success(isEdit ? t("settings.ceo.staff.toast.updated") : t("settings.ceo.staff.toast.created"));
      closeDrawer();
      setForm(EMPTY_FORM);
      setEditInitial(null);
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

  const handleExportExcel = async () => {
    try {
      // No query params: /users/excel's own parameters aren't documented, and
      // the selected branch already travels in the x-branch-id header.
      const blob = await fetchStaffUsersExcel().unwrap();
      downloadExcelBlob(blob, "staff", branchLabel);
    } catch (err) {
      toast.error(extractApiError(err) || t("settings.ceo.staff.exportError"));
    }
  };

  // The only "remove" action on this list: PATCH .../{id}/toggle-status
  // flips ACTIVE <-> INACTIVE without deleting the record. A real DELETE
  // isn't exposed from here — Swagger documents it as a hard delete
  // rejected with 409 while still assigned to a branch; permanent removal
  // belongs on the Archive page.
  const handleDeleteClick = () => {
    setDeleteConfirmOpen(true);
    handleCloseMenu();
  };
  const handleDeleteConfirm = async () => {
    setDeleteConfirmOpen(false);
    if (!selectedMember) return;
    try {
      await toggleStaffUserStatus(selectedMember.id).unwrap();
      toast.success(t("settings.ceo.staff.toast.statusToggled"));
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.ceo.staff.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
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
            {totalCount} {t("settings.ceo.staff.countSuffix")}
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
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            startIcon={isExportingExcel ? <CircularProgress size={16} /> : <PiMicrosoftExcelLogoFill size={18} />}
            sx={{
              borderRadius: 5,
              px: 2.5,
              fontSize: 13,
              textTransform: "none",
              borderColor: "var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            {t("settings.ceo.staff.exportExcel")}
          </Button>
        </Stack>
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={1.5} sx={{ pb: 2 }} flexWrap="wrap">
        <Paper sx={{ p: "2px 4px", display: "flex", alignItems: "center", width: { xs: "100%", sm: 280 }, boxShadow: "none", border: "1px solid var(--color-border)" }}>
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
          sx={{ minWidth: 160, bgcolor: "var(--color-surface)", fontSize: 14 }}
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
                <TableRow
                  key={member.id}
                  onClick={() => navigate(`/profile/${member.id}`)}
                  sx={{ cursor: "pointer", "&:hover": { bgcolor: "var(--color-surface-hover)" } }}
                >
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
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, max-content)", gap: 0.5 }}>
                      {member.roleTags.length > 0
                        ? member.roleTags.map((tag) => (
                            <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: 11, bgcolor: "var(--color-surface-alt)", color: "var(--color-text-secondary)" }} />
                          ))
                        : <Typography fontSize={13} color="var(--color-text-secondary)">—</Typography>}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, color: "var(--color-text-secondary)", verticalAlign: "top", pt: 2 }}>
                    {member.jobTitle}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, verticalAlign: "top", pt: 2 }}>
                    {member.phone || member.email || "—"}
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ verticalAlign: "top", pt: 1.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                      <IconButton size="small" sx={{ color: "#f0a500" }} onClick={() => { setSelectedMember({ id: member.id }); handleSmsOpen(); }}>
                        <MdOutlineEmail size={20} />
                      </IconButton>
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, member.id)}>
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
                      <MenuItem onClick={openEditDrawer}>{t("settings.ceo.staff.menu.edit")}</MenuItem>
                      <MenuItem onClick={handleDeleteClick} sx={{ color: "#d32f2f" }}>
                        <MdDelete size={15} style={{ marginRight: 8 }} /> {t("settings.ceo.staff.menu.delete")}
                      </MenuItem>
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

      {/* POST /sms/send/students is the only send endpoint this backend
          exposes — there's no way to actually message a staff member yet,
          so this stays permanently empty (Send disabled) rather than
          sending to the wrong recipient. */}
      <SendSmsModal
        open={smsOpen}
        onClose={() => { setSmsOpen(false); setSelectedMember(null); }}
        studentIds={[]}
        recipientLabel={t("settings.ceo.staff.sms.recipientLabel")}
        sender="3700"
      />

      {/* Delete confirm */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 2, minWidth: 360 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{t("settings.ceo.staff.deleteDialog.title")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">{t("settings.ceo.staff.deleteDialog.message")}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setDeleteConfirmOpen(false)} sx={{ textTransform: "none", borderRadius: 1.5 }}>
            {t("settings.ceo.staff.deleteDialog.cancel")}
          </Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} sx={{ textTransform: "none", borderRadius: 1.5 }}>
            {t("settings.ceo.staff.deleteDialog.confirm")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={closeDrawer}
        onKeyDown={submitOnEnter(handleSubmit, formBusy)}
        PaperProps={{ sx: { width: 420, display: "flex", flexDirection: "column", bgcolor: "var(--color-surface)" } }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2.5, borderBottom: "1px solid var(--color-border)" }}>
          <Typography fontWeight={700} fontSize={17} color="var(--color-text-primary)">
            {isEdit ? t("settings.ceo.staff.drawer.editTitle") : t("settings.ceo.staff.drawer.addTitle")}
          </Typography>
          <IconButton onClick={closeDrawer} size="small" sx={{ color: "var(--color-text-muted)" }}>
            <MdClose size={20} />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 3 }}>
          {editLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
          ) : (
          <Stack spacing={2.5}>
            {/* The account's system role and status can't be edited here (the
                role is never sent; status is toggled from the list), so they
                are shown as they are. */}
            {isEdit && (
              <Stack direction="row" gap={0.75} flexWrap="wrap">
                {form.role && <Chip label={form.role} size="small" sx={{ height: 20, fontSize: 11, bgcolor: "var(--color-surface-alt)", color: "var(--color-text-secondary)" }} />}
                {editStatus && (
                  <Chip
                    label={editStatus === "INACTIVE" ? t("settings.ceo.staff.filters.inactive") : t("settings.ceo.staff.filters.active")}
                    size="small"
                    sx={{ height: 20, fontSize: 11 }}
                  />
                )}
              </Stack>
            )}

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
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("settings.ceo.staff.form.password")}</Typography>
              <TextField
                name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={handleChange}
                fullWidth size="small" placeholder={t("settings.ceo.staff.form.passwordPlaceholder")}
                error={Boolean(errors.password)}
                helperText={errors.password || (isEdit ? t("settings.ceo.staff.form.passwordKeepHelp") : undefined)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword((v) => !v)}>
                        {showPassword ? <HiEye size={18} /> : <HiEyeOff size={18} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={inputSx}
              />
            </Box>

            <Box>
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("settings.ceo.staff.form.jobTitle")}</Typography>
              <TextField name="jobTitle" value={form.jobTitle} onChange={handleChange} fullWidth size="small" placeholder={t("settings.ceo.staff.form.jobTitlePlaceholder")} sx={inputSx} />
              <Typography fontSize={11.5} color="var(--color-text-muted)" mt={0.5}>
                {t("settings.ceo.staff.form.jobTitleHelp")}
              </Typography>
            </Box>

            <Box>
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("settings.ceo.staff.form.email")}</Typography>
              <TextField
                name="email" value={form.email} onChange={handleChange} fullWidth size="small" placeholder={t("settings.ceo.staff.form.emailPlaceholder")}
                error={Boolean(errors.email)} helperText={errors.email} sx={inputSx}
              />
            </Box>

            <Box>
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("settings.ceo.staff.form.rolePermissionId")}</Typography>
              {/* A user can hold multiple lavozims (AUTH_ROLE_DOCS.md's
                  UserRolePermission is many-to-many) — real multi-select
                  now. POST/PATCH /users only takes one primary
                  rolePermissionId; every other checked box is attached via
                  a separate assign-user call in handleSubmit. */}
              <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 2, rowGap: 0.5 }}>
                {positionOptions.map((option) => (
                  <FormControlLabel
                    key={option.id}
                    control={
                      <Checkbox
                        size="small"
                        checked={form.rolePermissionIds.includes(option.id)}
                        onChange={() => {
                          clearError("rolePermissionId");
                          setForm((p) => ({
                            ...p,
                            rolePermissionIds: p.rolePermissionIds.includes(option.id)
                              ? p.rolePermissionIds.filter((id) => id !== option.id)
                              : [...p.rolePermissionIds, option.id],
                          }));
                        }}
                      />
                    }
                    label={<span style={{ fontSize: 13 }}>{option.name}</span>}
                    sx={{ mr: 0 }}
                  />
                ))}
                {positionsLoading && <CircularProgress size={18} />}
                {!positionsLoading && positionOptions.length === 0 && (
                  <Typography fontSize={12.5} color="var(--color-text-muted)">
                    {t("settings.ceo.staff.form.rolePermissionIdHelp")}
                  </Typography>
                )}
              </Box>
              {errors.rolePermissionId && (
                <Typography fontSize={12} color="error" mt={0.5}>{errors.rolePermissionId}</Typography>
              )}
            </Box>

            {/* Every position — a CEO included — is attached only to the
                branches chosen here (or the one selected in the header). */}
            {showBranchPicker ? (
            <Box>
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("settings.ceo.staff.form.branches")}</Typography>
              <Select
                multiple
                size="small"
                fullWidth
                displayEmpty
                value={form.branchIds}
                error={Boolean(errors.branches)}
                onChange={(e) => {
                  clearError("branches");
                  setForm((p) => ({ ...p, branchIds: e.target.value as string[] }));
                }}
                renderValue={(selected) =>
                  (selected as string[]).length
                    ? (selected as string[]).map((id) => branchChoices.find((b) => b.id === id)?.name ?? id).join(", ")
                    : <span style={{ color: "var(--color-text-muted)" }}>{t("settings.ceo.staff.form.branches")}</span>
                }
                sx={{ bgcolor: "var(--color-surface-alt)", fontSize: 14 }}
              >
                {branchChoices.map((b) => (
                  <MenuItem key={b.id} value={b.id} sx={{ fontSize: 14 }}>{b.name}</MenuItem>
                ))}
              </Select>
              {errors.branches && (
                <Typography fontSize={12} color="error" mt={0.5}>{errors.branches}</Typography>
              )}
            </Box>
            ) : selectedBranchName ? (
              <Typography fontSize={12} color="var(--color-text-muted)">
                {t("settings.ceo.staff.form.branchFromHeader", { branch: selectedBranchName })}
              </Typography>
            ) : null}

            <Box>
              <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("settings.ceo.staff.form.dateOfBirth")}</Typography>
              <DatePickerField value={form.dateOfBirth} onChange={(iso) => setForm((prev) => ({ ...prev, dateOfBirth: iso }))} />
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

          </Stack>
          )}
        </Box>

        <Box sx={{ px: 3, py: 2.5, borderTop: "1px solid var(--color-border)" }}>
          {/* Outside the scrolling form so an error is never hidden below the fold. */}
          {formError && (
            <Typography fontSize={13} color="error" mb={1.5}>{formError}</Typography>
          )}
          <Button
            fullWidth variant="contained" onClick={handleSubmit} disabled={formBusy}
            sx={{ borderRadius: "24px", py: 1.3, fontSize: 15, fontWeight: 600, textTransform: "none", bgcolor: "#4f7ec4", boxShadow: "0 4px 12px rgba(79,126,196,0.35)", "&:hover": { bgcolor: "#3b6ab0" } }}
          >
            {(isCreating || isUpdating || isSavingRoles) ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : t("settings.ceo.staff.form.submit")}
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
};

export default Staff;
