// src/pages/Students.tsx
import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useAuth } from "../../hooks/useAuth";
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { MdDelete, MdMail, MdEdit, MdPayment } from "react-icons/md";
import { BsThreeDotsVertical, BsPersonPlus } from "react-icons/bs";
import { TbAdjustmentsHorizontal, TbColumns3 } from "react-icons/tb";
import { HiChevronDown } from "react-icons/hi";
import { IoClose, IoSearchOutline } from "react-icons/io5";
import { FiUser } from "react-icons/fi";
import { PiMicrosoftExcelLogoFill } from "react-icons/pi";

import { FlatStudent, mapApiStudentToFlat, formatDate } from "../../constants/FlatStudents";
import { ALL_COLUMNS, CONTACT_ICONS, BADGE_COLORS } from "../../constants/StudentsTable";
import { useNavigate } from "react-router-dom";

import { AddStudent } from "../../components/AddStudent";
import { AddPayment } from "../../components/AddPayment";
import { useAllStudentsQuery, useUpdateStudentMutation, useToggleStudentStatusMutation, useLazyStudentsExcelQuery } from "../../app/api/studentsApi";
import { useAllGroupsQuery, useAddStudentToGroupMutation } from "../../app/api/groupsApi";
import { useToast } from "../../Context/ToastContext";
import { DatePickerField } from "../SingleGroup/DatePickerField";
import { extractApiError } from "../../utils/extractApiError";
import type { RootState } from "../../app/store";

import { SendSmsModal } from "../../components/SendSmsModal";

/* ─── TYPES ─────────────────────────────────────────── */
type SortDir = "asc" | "desc";
type SortKey = keyof FlatStudent | "";

interface Filters {
  search: string;
  teacher: string;
  course: string;
  status: string;
  financial: string;
  groupCount: string;
  fromCreated: string;
  toCreatedDate: string;
}

/* ─── STYLES ─────────────────────────────────────────── */
const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "6px",
    fontSize: 13,
    bgcolor: "var(--color-surface)",
    "& fieldset": { borderColor: "var(--color-border)" },
    "&:hover fieldset": { borderColor: "var(--color-text-muted)" },
    "&.Mui-focused fieldset": { borderColor: "#5c7fa3" },
  },
};

/* ─── DROPDOWN FILTER ────────────────────────────────── */
interface DropdownProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  onClear: () => void;
}

const DropdownFilter = ({ label, value, options, onChange, onClear }: DropdownProps) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  return (
    <>
      <Button
        variant="outlined"
        size="small"
        endIcon={!value ? <HiChevronDown size={13} /> : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          borderRadius: "6px",
          borderColor: value ? "#5c7fa3" : "var(--color-border)",
          color: value ? "#5c7fa3" : "var(--color-text-secondary)",
          bgcolor: value ? "var(--color-primary-surface)" : "var(--color-surface)",
          fontWeight: 400, fontSize: 13, px: 1.5, py: 0.6,
          textTransform: "none", whiteSpace: "nowrap",
          "&:hover": { borderColor: "#5c7fa3", bgcolor: "var(--color-primary-surface)" },
        }}
      >
        {value ? (
          <Stack direction="row" alignItems="center" gap={0.5}>
            <span>{options.find((o) => o.value === value)?.label || value}</span>
            <IoClose size={13} onClick={(e) => { e.stopPropagation(); onClear(); }} />
          </Stack>
        ) : label}
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 160, mt: 0.5, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" } }}
      >
        {options.map((o) => (
          <MenuItem
            key={o.value} selected={value === o.value}
            onClick={() => { onChange(o.value); setAnchor(null); }}
            sx={{ fontSize: 13 }}
          >
            {o.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

/* ─── PLAIN TEXT FILTER BOX (External ID, Group count) ── */
interface TextFilterProps {
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  disabledTitle?: string;
  type?: "text" | "number";
  minWidth?: number;
}

const TextFilterInput = ({ placeholder, value, onChange, disabled, disabledTitle, type = "text", minWidth = 140 }: TextFilterProps) => (
  <Tooltip title={disabled ? disabledTitle ?? "" : ""} arrow disableHoverListener={!disabled}>
    <Box
      sx={{
        display: "flex", alignItems: "center",
        border: "1px solid var(--color-border)", borderRadius: "6px",
        px: 1.2, py: 0.6, bgcolor: disabled ? "var(--color-surface-alt)" : "var(--color-surface)",
        minWidth, opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        placeholder={placeholder}
        value={value}
        type={type}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{ border: "none", outline: "none", fontSize: 13, color: "var(--color-text-secondary)", background: "transparent", width: "100%", cursor: disabled ? "not-allowed" : "text" }}
      />
    </Box>
  </Tooltip>
);

/* ─── DATE FILTER BOX (From/To created) ─────────────────── */
const DateFilterInput = ({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (val: string) => void }) => (
  <Box sx={{ minWidth: 150 }}>
    <DatePickerField value={value} onChange={onChange} placeholder={placeholder} />
  </Box>
);

/* ─── ADD TO GROUP MODAL ─────────────────────────────── */
// Status (Swagger: POST /student-groups accepts an optional `status` — PROBATION
// or ACTIVE) decides whether the membership starts as a trial lesson (no
// billing) or immediately active, in which case `paymentStartDate` is also
// sent so the backend knows when to start calculating payment.
type AddToGroupStatus = "PROBATION" | "ACTIVE";

const todayIso = () => new Date().toISOString().slice(0, 10);

export interface AddToGroupPayload {
  groupId: string;
  status: AddToGroupStatus;
  paymentStartDate?: string;
}

const AddToGroupModal = ({
  open,
  onClose,
  onSubmit,
  groups,
  selectedCount,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: AddToGroupPayload) => Promise<boolean>;
  groups: { id: string; name: string }[];
  selectedCount: number;
  isSubmitting?: boolean;
}) => {
  const { t } = useTranslation();
  const [groupId, setGroupId] = useState("");
  const [status, setStatus] = useState<AddToGroupStatus>("PROBATION");
  const [paymentStartDate, setPaymentStartDate] = useState(todayIso());

  useEffect(() => {
    if (!open) {
      setGroupId("");
      setStatus("PROBATION");
      setPaymentStartDate(todayIso());
    }
  }, [open]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!groupId || isSubmitting) return;
    const success = await onSubmit({
      groupId,
      status,
      paymentStartDate: status === "ACTIVE" ? paymentStartDate || undefined : undefined,
    });
    if (success) { setGroupId(""); setStatus("PROBATION"); setPaymentStartDate(todayIso()); }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{ sx: { borderRadius: "12px", width: 580, maxWidth: "95vw", p: 0 } }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ px: 3, py: 2.5 }}
      >
        <Box>
          <Typography fontWeight={600} fontSize={16} color="var(--color-text-primary)">
            {t("students.addToGroup.title")}
          </Typography>
          {selectedCount > 0 && (
            <Typography fontSize={12} color="var(--color-text-secondary)" mt={0.3}>
              {t("students.addToGroup.studentsSelected", { count: selectedCount })}
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={handleClose} disabled={isSubmitting} sx={{ color: "var(--color-text-muted)" }}>
          <IoClose size={20} />
        </IconButton>
      </Stack>

      <Divider />

      <Box sx={{ px: 3, py: 3 }}>
        <TextField
          select
          fullWidth
          size="small"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          disabled={isSubmitting}
          SelectProps={{ displayEmpty: true }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "8px",
              fontSize: 14,
              bgcolor: "var(--color-surface)",
              "& fieldset": { borderColor: "var(--color-border)" },
              "&:hover fieldset": { borderColor: "var(--color-text-muted)" },
              "&.Mui-focused fieldset": { borderColor: "#5c7fa3" },
            },
          }}
        >
          <MenuItem value="" disabled sx={{ fontSize: 14, color: "var(--color-text-muted)" }}>
            {t("students.addToGroup.selectGroup")}
          </MenuItem>
          {groups.map((g) => (
            <MenuItem key={g.id} value={g.id} sx={{ fontSize: 14 }}>
              {g.name}
            </MenuItem>
          ))}
        </TextField>

        <Box mt={2.5}>
          <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>
            {t("students.addToGroup.status")}
          </Typography>
          <RadioGroup
            row
            value={status}
            onChange={(e) => setStatus(e.target.value as AddToGroupStatus)}
            sx={{ gap: 3 }}
          >
            <FormControlLabel
              value="PROBATION"
              disabled={isSubmitting}
              control={<Radio size="small" sx={{ color: "var(--color-border)", "&.Mui-checked": { color: "#5c7fa3" }, p: 0.5 }} />}
              label={<Typography fontSize={13} color="var(--color-text-secondary)">{t("students.addToGroup.statusOptions.probation")}</Typography>}
              sx={{ m: 0, gap: 0.5 }}
            />
            <FormControlLabel
              value="ACTIVE"
              disabled={isSubmitting}
              control={<Radio size="small" sx={{ color: "var(--color-border)", "&.Mui-checked": { color: "#5c7fa3" }, p: 0.5 }} />}
              label={<Typography fontSize={13} color="var(--color-text-secondary)">{t("students.addToGroup.statusOptions.active")}</Typography>}
              sx={{ m: 0, gap: 0.5 }}
            />
          </RadioGroup>
          <Typography fontSize={12} color="var(--color-text-muted)" mt={0.5}>
            {status === "PROBATION"
              ? t("students.addToGroup.statusOptions.probationHint")
              : t("students.addToGroup.statusOptions.activeHint")}
          </Typography>
        </Box>

        {status === "ACTIVE" && (
          <Box mt={2.5}>
            <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>
              {t("students.addToGroup.paymentStartDate")}
            </Typography>
            <DatePickerField value={paymentStartDate} onChange={setPaymentStartDate} disabled={isSubmitting} />
          </Box>
        )}

        <Box mt={3}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!groupId || isSubmitting}
            sx={{
              borderRadius: "20px",
              py: 1.1, px: 3,
              fontWeight: 600, fontSize: 14,
              bgcolor: "#4bbfbf",
              "&:hover": { bgcolor: "#3aacac" },
              "&.Mui-disabled": { bgcolor: "var(--color-border)", color: "var(--color-surface)" },
              boxShadow: "none",
              textTransform: "none",
            }}
          >
            {isSubmitting ? t("students.addToGroup.submitting") : t("students.addToGroup.submit")}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

/* ─── EDIT STUDENT DRAWER ────────────────────────────── */
const EditStudentDrawer = ({
  open, student, onClose, onSave, saving, error,
}: {
  open: boolean;
  student: FlatStudent | null;
  onClose: () => void;
  onSave: (uid: string, data: { name: string; phone: string }) => Promise<boolean>;
  saving?: boolean;
  error?: string | null;
}) => {
  const { t } = useTranslation();
  const [name,   setName]   = useState("");
  const [phone,  setPhone]  = useState("");
  const [dob,    setDob]    = useState("");
  const [gender, setGender] = useState("male");

  React.useEffect(() => {
    if (student) { setName(student.name); setPhone(student.phone); }
  }, [student]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 420 } }}>
      <Stack
        direction="row" justifyContent="space-between" alignItems="center"
        sx={{ px: 3, py: 2.5, borderBottom: "1px solid var(--color-border)", bgcolor: "var(--color-surface)" }}
      >
        <Typography fontWeight={700} fontSize={17}>{t("students.editDrawer.title")}</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "var(--color-text-muted)" }}><IoClose size={20} /></IconButton>
      </Stack>

      <Box sx={{ px: 3, py: 2.5, overflowY: "auto", flex: 1, bgcolor: "var(--color-bg-page)" }}>
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("students.editDrawer.phone")}</Typography>
          <Stack direction="row" gap={1}>
            <Box sx={{ border: "1px solid var(--color-border)", borderRadius: "6px", px: 1.5, display: "flex", alignItems: "center", bgcolor: "var(--color-surface)", fontSize: 13, color: "var(--color-text-secondary)", whiteSpace: "nowrap", minWidth: 60, justifyContent: "center" }}>
              +998
            </Box>
            <TextField fullWidth size="small" value={phone} onChange={(e) => setPhone(e.target.value)} sx={inputSx} />
          </Stack>
        </Box>

        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("students.editDrawer.name")}</Typography>
          <TextField fullWidth size="small" value={name} onChange={(e) => setName(e.target.value)} sx={inputSx} />
        </Box>

        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("students.editDrawer.dob")}</Typography>
          <DatePickerField value={dob} onChange={setDob} />
        </Box>

        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={0.8}>{t("students.editDrawer.gender")}</Typography>
          <RadioGroup row value={gender} onChange={(e) => setGender(e.target.value)} sx={{ gap: 3 }}>
            {[
              { value: "male", label: t("students.editDrawer.male") },
              { value: "female", label: t("students.editDrawer.female") },
            ].map((g) => (
              <FormControlLabel key={g.value} value={g.value}
                control={<Radio size="small" sx={{ color: "var(--color-border)", "&.Mui-checked": { color: "#5c7fa3" }, p: 0.5 }} />}
                label={<Typography fontSize={13} color="var(--color-text-secondary)">{g.label}</Typography>}
                sx={{ m: 0, gap: 0.5 }}
              />
            ))}
          </RadioGroup>
        </Box>

        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={1}>{t("students.editDrawer.additionalContacts")}</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {CONTACT_ICONS.map((item, i) => (
              <Tooltip key={i} title={t(`students.contacts.${item.key}`)} arrow>
                <IconButton size="small" sx={{ width: 40, height: 40, border: "1.5px solid var(--color-border)", borderRadius: "50%", color: "#5c7fa3", bgcolor: "var(--color-surface)" }}>
                  {item.icon}
                </IconButton>
              </Tooltip>
            ))}
          </Stack>
        </Box>

        <Stack alignItems="flex-end" gap={0.5} mb={3}>
          <Button variant="text" size="small" sx={{ fontSize: 13, color: "#5c7fa3", textTransform: "none", p: 0, minWidth: 0 }}>{t("students.editDrawer.addToGroup")}</Button>
          <Button variant="text" size="small" sx={{ fontSize: 13, color: "#5c7fa3", textTransform: "none", p: 0, minWidth: 0 }}>{t("students.editDrawer.setPassword")}</Button>
        </Stack>

        {error && (
          <Typography fontSize={13} color="error" mb={1.5}>{error}</Typography>
        )}

        <Button
          variant="contained" fullWidth
          disabled={saving}
          onClick={async () => { if (!student) return; const ok = await onSave(student.uid, { name, phone }); if (ok) onClose(); }}
          sx={{ borderRadius: "20px", py: 1.2, fontWeight: 600, fontSize: 14, bgcolor: "#5c7fa3", "&:hover": { bgcolor: "#4a6a8a" }, boxShadow: "none", textTransform: "none" }}
        >
          {saving ? t("students.editDrawer.saving") : t("students.editDrawer.submit")}
        </Button>
      </Box>
    </Drawer>
  );
};


/* ─── MAIN COMPONENT ─────────────────────────────────── */
export const Students = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [sendSmsOpen, setSendSmsOpen] = useState(false);

  const [page, setPage] = useState(1);
  const limit = 20;
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);
  const [updateStudent, { isLoading: isUpdatingStudent }] = useUpdateStudentMutation();
  const [toggleStudentStatus, { isLoading: isArchivingStudent }] = useToggleStudentStatusMutation();
  const [fetchStudentsExcel, { isFetching: isExportingExcel }] = useLazyStudentsExcelQuery();
  const { data: groupsData } = useAllGroupsQuery({ page: 1, limit: 100 });
  const [addStudentToGroup, { isLoading: isAddingToGroup }] = useAddStudentToGroupMutation();

  const [students, setStudents] = useState<FlatStudent[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const [selected,          setSelected]          = useState<string[]>([]);
  const [sortKey,           setSortKey]           = useState<SortKey>("");
  const [sortDir,           setSortDir]           = useState<SortDir>("asc");
  const [visibleCols,       setVisibleCols]       = useState<string[]>(ALL_COLUMNS.map((c) => c.key));
  const [columnsAnchor,     setColumnsAnchor]     = useState<null | HTMLElement>(null);
  const [actionMenu,        setActionMenu]        = useState<{ el: HTMLElement; uid: string } | null>(null);
  const [archiveUid,        setArchiveUid]        = useState<string | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const [editDrawerOpen,    setEditDrawerOpen]    = useState(false);
  const [activeStudent,     setActiveStudent]     = useState<FlatStudent | null>(null);
  const [addToGroupOpen,    setAddToGroupOpen]    = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);

  const EMPTY_FILTERS: Filters = {
    search: "", teacher: "", course: "", status: "", financial: "",
    groupCount: "", fromCreated: "", toCreatedDate: "",
  };
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [advancedAnchor, setAdvancedAnchor] = useState<null | HTMLElement>(null);

  // GET /students only returns ACTIVE students unless `status` is sent
  // explicitly (Swagger: status query param, ACTIVE/INACTIVE) — an archived
  // student (toggleStudentStatus -> INACTIVE) otherwise disappears from every
  // list request, filtered or not. The Status filter below is the only UI
  // that can ask for INACTIVE, so it's sent straight through to the query
  // instead of being applied client-side (list rows carry no status field to
  // filter by locally in the first place).
  const { data: studentsData, isLoading: studentsLoading } = useAllStudentsQuery({
    page, limit,
    branchId: selectedBranchId ?? undefined,
    status: filters.status === "active" ? "ACTIVE" : filters.status === "inactive" ? "INACTIVE" : undefined,
  });

  useEffect(() => {
    if (studentsData) setStudents(studentsData.data.map(mapApiStudentToFlat));
  }, [studentsData]);

  // Changing the status filter re-queries the backend with a different
  // result set (see above) — reset to page 1 so the user isn't stranded on a
  // page number that no longer exists for the new filter.
  useEffect(() => {
    setPage(1);
  }, [filters.status]);

  const setFilter = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setFilters((p) => ({ ...p, [key]: val }));

  const clearAll = () => setFilters(EMPTY_FILTERS);

  const hasFilters = Object.values(filters).some(Boolean);

  const TEACHERS_LIST = useMemo(() => {
    const names = new Set<string>();
    studentsData?.data.forEach((s) => (s.teachers ?? []).forEach((tch) => names.add(tch.name)));
    return Array.from(names);
  }, [studentsData]);

  // "Course" reuses FlatStudent.course, which the backend mapper currently
  // fills from the student's (first) group name — students.groups doesn't
  // carry a separate course reference, so this is the closest real field.
  const COURSES_LIST = useMemo(() => {
    const names = new Set<string>();
    students.forEach((s) => { if (s.course && s.course !== "—") names.add(s.course); });
    return Array.from(names);
  }, [students]);

  // AddToGroupModal ochiladigan barcha guruhlar — backenddan (GET /groups),
  // joriy sahifadagi studentlarning guruhlaridan hosil qilingan taxminiy
  // ro'yxat emas.
  const allGroupsOptions = useMemo(
    () => (groupsData?.data ?? []).map((g) => ({ id: g.id, name: g.name })),
    [groupsData]
  );

  // Backend hozircha sahifalash meta'sini qaytarmaydi; shu sababli joriy
  // sahifa hajmidan taxminiy meta hosil qilamiz, chunki bu maydon kelib
  // qolsa (studentsData.meta) to'g'ridan-to'g'ri ishlatiladi.
  const pageMeta = useMemo(() => {
    if (studentsData?.meta) return studentsData.meta;
    const count = studentsData?.data.length ?? 0;
    return {
      total: count,
      page,
      limit,
      totalPages: count < limit ? page : page + 1,
    };
  }, [studentsData, page, limit]);

  const filtered = useMemo(() => {
    return students
      .filter((s) => {
        const search = filters.search.toLowerCase();
        const balance = s.balance ?? 0;
        const financialMatch =
          !filters.financial ||
          (filters.financial === "positive" && balance > 0) ||
          (filters.financial === "negative" && balance < 0) ||
          (filters.financial === "zero" && balance === 0);
        // Status is already applied server-side (see useAllStudentsQuery
        // above) — list rows carry no reliable status field to re-filter by
        // here (mapApiStudentToFlat defaults `active` to true for every list
        // item, since GET /students' list shape doesn't include it), so
        // filtering again client-side would incorrectly hide real INACTIVE
        // results the backend already returned.
        const groupCountMatch =
          !filters.groupCount || String(s.groupsCount ?? 0) === filters.groupCount.trim();
        const createdAt = s.createdAt ? s.createdAt.slice(0, 10) : "";
        const fromMatch = !filters.fromCreated || (createdAt && createdAt >= filters.fromCreated);
        const toMatch = !filters.toCreatedDate || (createdAt && createdAt <= filters.toCreatedDate);
        return (
          (!search || s.name.toLowerCase().includes(search) || s.phone.includes(search)) &&
          (!filters.teacher || s.teacher === filters.teacher) &&
          (!filters.course || s.course === filters.course) &&
          financialMatch && groupCountMatch && fromMatch && toMatch
        );
      })
      .sort((a, b) => {
        if (!sortKey) return 0;
        const av = String(a[sortKey as keyof FlatStudent] ?? "");
        const bv = String(b[sortKey as keyof FlatStudent] ?? "");
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  }, [students, filters, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const allSelected = filtered.length > 0 && filtered.every((s) => selected.includes(s.uid));
  const toggleAll   = () => setSelected(allSelected ? [] : filtered.map((s) => s.uid));
  const toggleOne   = (uid: string) =>
    setSelected((p) => p.includes(uid) ? p.filter((x) => x !== uid) : [...p, uid]);

  // "Delete"/"Archive" on the active list are the same action: PATCH
  // /students/{id}/toggle-status flips the student's status to INACTIVE
  // (moving them out of the active list into Archive) without removing the
  // record. A real DELETE /students/{id} is reserved for the Archive page's
  // permanent-delete action — the backend rejects it outright here while the
  // student still has group memberships or attendance records.
  const handleArchiveConfirm = async () => {
    if (!archiveUid) return;
    setActionError(null);
    try {
      await toggleStudentStatus(archiveUid).unwrap();
      setSelected((p) => p.filter((x) => x !== archiveUid));
      setArchiveUid(null);
      toast.success(t("students.toast.archived"));
    } catch (err) {
      const detail = extractApiError(err);
      const message = detail ? `${t("students.archiveDialog.error")}: ${detail}` : t("students.archiveDialog.error");
      setActionError(message);
      toast.error(message);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    setActionError(null);
    try {
      await Promise.all(selected.map((uid) => toggleStudentStatus(uid).unwrap()));
      setSelected([]);
      toast.success(t("students.toast.archived"));
    } catch (err) {
      const detail = extractApiError(err);
      const message = detail ? `${t("students.archiveDialog.error")}: ${detail}` : t("students.archiveDialog.error");
      setActionError(message);
      toast.error(message);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    setBulkDeleteConfirmOpen(false);
    await handleBulkDelete();
  };

  const handleSaveEdit = async (uid: string, data: { name: string; phone: string }): Promise<boolean> => {
    setActionError(null);
    try {
      await updateStudent({ id: uid, name: data.name, phone: data.phone }).unwrap();
      toast.success(t("students.toast.updated"));
      return true;
    } catch {
      setActionError(t("students.editDrawer.error"));
      toast.error(t("students.editDrawer.error"));
      return false;
    }
  };

  const handleAddToGroup = async ({ groupId, status, paymentStartDate }: AddToGroupPayload): Promise<boolean> => {
    setActionError(null);
    // Backend student-groups' allaqachon a'zo bo'lgan studentni qayta
    // qo'shishga ruxsat bermasligi mumkin — shu sabab tanlanganlar orasidan
    // bu guruhda allaqachon bor bo'lganlarni oldindan chiqarib tashlaymiz.
    const eligibleUids = selected.filter((uid) => {
      const raw = studentsData?.data.find((s) => s.id === uid);
      return !(raw?.groups ?? []).some((g) => g.id === groupId);
    });
    if (eligibleUids.length === 0) {
      toast.error(t("students.addToGroup.toast.alreadyInGroup"));
      return false;
    }
    try {
      await Promise.all(
        eligibleUids.map((uid) =>
          addStudentToGroup({ studentId: uid, groupId, status, paymentStartDate }).unwrap()
        )
      );
      toast.success(t("students.addToGroup.toast.success"));
      setSelected([]);
      setAddToGroupOpen(false);
      return true;
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("students.addToGroup.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
      return false;
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await fetchStudentsExcel({
        search: filters.search || undefined,
        status: filters.status === "active" ? "ACTIVE" : filters.status === "inactive" ? "INACTIVE" : undefined,
        branchId: selectedBranchId ?? undefined,
        page: 1,
        // Backend doesn't reliably return pagination meta for GET /students,
        // so `pageMeta.total` can be capped at the on-screen page size. Use a
        // large fixed limit instead so the export always covers every match.
        limit: 1_000_000,
      }).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "students.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("students.actions.exportError"));
    }
  };

  const openActionMenu = (e: React.MouseEvent<HTMLButtonElement>, uid: string) => {
    e.stopPropagation();
    const student = students.find((s) => s.uid === uid) || null;
    setActiveStudent(student);
    setActionMenu(actionMenu?.uid === uid ? null : { el: e.currentTarget, uid });
  };

  const col = (key: string) => visibleCols.includes(key);

  const columnLabels: Record<string, string> = {
    photo: t("students.table.photo"),
    name: t("students.table.name"),
    phone: t("students.table.phone"),
    groups: t("students.table.groups"),
    teachers: t("students.table.teachers"),
    training: t("students.table.trainingDates"),
    balance: t("students.table.balance"),
    comment: t("students.table.comment"),
  };

  /* ── UI ─────────────────────────────────────────────── */
  return (
    <Box sx={{ p: 3, bgcolor: "var(--color-bg-page)", minHeight: "100vh" }}>

      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
        <Stack direction="row" alignItems="baseline" gap={1.5}>
          <Typography variant="h5" fontWeight={700} fontSize={26} color="var(--color-text-primary)">{t("students.header.title")}</Typography>
          <Typography fontSize={14} color="var(--color-text-secondary)">{t("students.header.quantity", { count: studentsData ? pageMeta.total : filtered.length })}</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" gap={1}>
          <Button
            variant="outlined"
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            startIcon={isExportingExcel ? <CircularProgress size={16} /> : <PiMicrosoftExcelLogoFill size={18} />}
            sx={{
              borderRadius: "8px", px: 2, py: 1.1, fontWeight: 700, fontSize: 13,
              textTransform: "none", borderColor: "var(--color-border)", color: "var(--color-text-secondary)",
            }}
          >
            {t("students.actions.exportExcel")}
          </Button>
          <Button
            variant="contained"
            onClick={() => setAddStudentOpen(true)}
            sx={{
              bgcolor: "#2d4a5a", color: "var(--color-surface)", borderRadius: "8px",
              px: 3, py: 1.1, fontWeight: 700, fontSize: 13, letterSpacing: 0.5,
              textTransform: "uppercase", "&:hover": { bgcolor: "#1e3340" }, boxShadow: "none",
            }}
          >
            {t("students.header.addNew")}
          </Button>
        </Stack>
      </Stack>

      {/* FILTER ROW */}
      <Stack
        direction="row" flexWrap="wrap" gap={1} mb={1.5}
        sx={{ bgcolor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", p: 1.5 }}
      >
        {/* Search */}
        <Box
          sx={{
            display: "flex", alignItems: "center", gap: 0.5,
            border: "1px solid var(--color-border)", borderRadius: "6px",
            px: 1.2, py: 0.6, bgcolor: "var(--color-surface)", minWidth: 220,
          }}
        >
          <IoSearchOutline size={15} color="var(--color-text-muted)" />
          <input
            placeholder={t("students.filters.searchPlaceholder")}
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            style={{ border: "none", outline: "none", fontSize: 13, color: "var(--color-text-secondary)", background: "transparent", width: "100%" }}
          />
          {filters.search && (
            <IoClose size={13} color="var(--color-text-muted)" style={{ cursor: "pointer" }} onClick={() => setFilter("search", "")} />
          )}
        </Box>

        <DropdownFilter
          label={t("students.filters.byCourses")} value={filters.course}
          options={COURSES_LIST.map((c) => ({ value: c, label: c }))}
          onChange={(v) => setFilter("course", v)} onClear={() => setFilter("course", "")}
        />

        <DropdownFilter
          label={t("students.filters.status")} value={filters.status}
          options={[
            { value: "active", label: t("students.filters.statusOptions.active") },
            { value: "inactive", label: t("students.filters.statusOptions.inactive") },
          ]}
          onChange={(v) => setFilter("status", v)} onClear={() => setFilter("status", "")}
        />

        <DropdownFilter
          label={t("students.filters.financialSituation")} value={filters.financial}
          options={[
            { value: "positive", label: t("students.filters.financialOptions.positive") },
            { value: "negative", label: t("students.filters.financialOptions.negative") },
            { value: "zero", label: t("students.filters.financialOptions.zero") },
          ]}
          onChange={(v) => setFilter("financial", v)} onClear={() => setFilter("financial", "")}
        />

        {/* No tags relationship exists on students in the backend yet — kept
            visible for layout parity but disabled rather than faked. */}
        <TextFilterInput
          placeholder={t("students.filters.byTags")}
          value="" onChange={() => {}} disabled
          disabledTitle={t("students.filters.tagsUnavailable")}
          minWidth={130}
        />

        {/* No externalId field exists on students in the backend yet —
            same reasoning as the Tags box above. */}
        <TextFilterInput
          placeholder={t("students.filters.externalId")}
          value="" onChange={() => {}} disabled
          disabledTitle={t("students.filters.externalIdUnavailable")}
          minWidth={130}
        />

        <TextFilterInput
          placeholder={t("students.filters.groupCount")}
          value={filters.groupCount}
          onChange={(v) => setFilter("groupCount", v.replace(/[^0-9]/g, ""))}
          type="number" minWidth={110}
        />

        <DateFilterInput
          placeholder={t("students.filters.fromCreated")}
          value={filters.fromCreated}
          onChange={(v) => setFilter("fromCreated", v)}
        />

        <DateFilterInput
          placeholder={t("students.filters.toCreatedDate")}
          value={filters.toCreatedDate}
          onChange={(v) => setFilter("toCreatedDate", v)}
        />

        {hasFilters && (
          <Button
            size="small" startIcon={<IoClose />} onClick={clearAll} variant="outlined"
            sx={{ borderRadius: "6px", borderColor: "var(--color-border)", color: "var(--color-text-secondary)", fontSize: 12, px: 1.5, textTransform: "none" }}
          >
            {t("students.filters.clearAll")}
          </Button>
        )}
      </Stack>

      {/* COLUMNS + BULK ACTIONS */}
      <Stack direction="row" justifyContent="flex-end" alignItems="center" mb={1.5} gap={1}>
        {selected.length > 0 && (
          <Typography fontSize={13} color="text.secondary" sx={{ mr: "auto" }}>
            {t("students.table.selectedCount", { count: selected.length })}
          </Typography>
        )}
        <Button
          size="small" startIcon={<TbAdjustmentsHorizontal size={14} />} variant="outlined"
          onClick={(e) => setAdvancedAnchor(e.currentTarget)}
          sx={{ borderRadius: "6px", borderColor: filters.teacher ? "#5c7fa3" : "var(--color-border)", color: filters.teacher ? "#5c7fa3" : "var(--color-text-secondary)", fontSize: 12, px: 1.5, textTransform: "none" }}
        >
          {t("students.table.filters")}
        </Button>
        <Menu
          anchorEl={advancedAnchor} open={Boolean(advancedAnchor)}
          onClose={() => setAdvancedAnchor(null)}
          PaperProps={{ sx: { borderRadius: 2, minWidth: 220, mt: 0.5, p: 1.5 } }}
        >
          <Typography fontSize={12} fontWeight={600} color="var(--color-text-secondary)" sx={{ px: 0.5, pb: 1 }}>
            {t("students.filters.advancedFilters")}
          </Typography>
          <DropdownFilter
            label={t("students.filters.byTeacher")} value={filters.teacher}
            options={TEACHERS_LIST.map((tch) => ({ value: tch, label: tch }))}
            onChange={(v) => setFilter("teacher", v)} onClear={() => setFilter("teacher", "")}
          />
        </Menu>
        <Button
          size="small" startIcon={<TbColumns3 size={14} />} variant="outlined"
          onClick={(e) => setColumnsAnchor(e.currentTarget)}
          sx={{ borderRadius: "6px", borderColor: "var(--color-border)", color: "var(--color-text-secondary)", fontSize: 12, px: 1.5, textTransform: "none" }}
        >
          {t("students.table.columns")}
        </Button>
        <Menu
          anchorEl={columnsAnchor} open={Boolean(columnsAnchor)}
          onClose={() => setColumnsAnchor(null)}
          PaperProps={{ sx: { borderRadius: 2, minWidth: 160, mt: 0.5 } }}
        >
          {ALL_COLUMNS.map((c) => (
            <MenuItem
              key={c.key}
              onClick={() => setVisibleCols((p) => p.includes(c.key) ? p.filter((k) => k !== c.key) : [...p, c.key])}
              sx={{ fontSize: 13, gap: 1 }}
            >
              <Checkbox size="small" checked={visibleCols.includes(c.key)} sx={{ p: 0 }} />
              {columnLabels[c.key]}
            </MenuItem>
          ))}
        </Menu>
      </Stack>

      {/* TABLE */}
      <Paper sx={{ borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 4px var(--color-shadow)", border: "1px solid var(--color-border)" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow
                sx={{ "& th": { fontWeight: 600, fontSize: 13, color: "var(--color-text-secondary)", py: 1.5, borderBottom: "1px solid var(--color-border)", bgcolor: "var(--color-surface)" } }}
              >
                <TableCell sx={{ width: 32, pr: 0 }} />
                <TableCell sx={{ width: 32, pl: 0 }}>
                  <Checkbox size="small" checked={allSelected} onChange={toggleAll} sx={{ p: 0 }} />
                </TableCell>
                {col("photo")    && <TableCell>{t("students.table.photo")}</TableCell>}
                {col("name")     && <TableCell><TableSortLabel active={sortKey === "name"} direction={sortDir} onClick={() => handleSort("name")}>{t("students.table.name")}</TableSortLabel></TableCell>}
                {col("phone")    && <TableCell>{t("students.table.phone")}</TableCell>}
                {col("groups")   && <TableCell>{t("students.table.groups")}</TableCell>}
                {col("teachers") && <TableCell>{t("students.table.teachers")}</TableCell>}
                {col("training") && <TableCell>{t("students.table.trainingDates")}</TableCell>}
                {col("balance")  && <TableCell>{t("students.table.balance")}</TableCell>}
                {col("comment")  && <TableCell>{t("students.table.comment")}</TableCell>}
                <TableCell align="right">
                  <Stack direction="row" justifyContent="flex-end" gap={0.5}>
                    {/* Add to group */}
                    <Tooltip title={t("students.table.addToGroup")}>
                      <IconButton
                        size="small"
                        sx={{
                          color: selected.length > 0 ? "#5c7fa3" : "var(--color-text-muted)",
                          "&:hover": { bgcolor: selected.length > 0 ? "var(--color-primary-surface)" : "transparent" },
                        }}
                        onClick={() => { if (selected.length > 0) setAddToGroupOpen(true); }}
                      >
                        <BsPersonPlus size={15} />
                      </IconButton>
                    </Tooltip>

                    {/* Mail */}
                    <Tooltip title={t("students.table.mailSelected")}>
                      <IconButton size="small" sx={{ color: "var(--color-text-muted)" }} onClick={() => { if (selected.length > 0) setSendSmsOpen(true); }}>
                        <MdMail />
                      </IconButton>
                    </Tooltip>

                    {/* Delete selected */}
                    <Tooltip title={t("students.table.deleteSelected")}>
                      <IconButton
                        size="small" sx={{ color: "var(--color-text-muted)" }}
                        onClick={() => setBulkDeleteConfirmOpen(true)}
                      >
                        <MdDelete size={15} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filtered.map((s, i) => {
                const badge      = BADGE_COLORS[s.groupBadgeColor] ?? BADGE_COLORS.blue;
                const isSelected = selected.includes(s.uid);
                return (
                  <TableRow
                    key={s.uid}
                    hover
                    onClick={() => navigate(`/students/${s.uid}`)}
                    sx={{
                      "& td": { borderBottom: "1px solid var(--color-border)", py: 1.4, fontSize: 13 },
                      "&:last-child td": { borderBottom: "none" },
                      bgcolor: isSelected ? "var(--color-primary-surface)" : "var(--color-surface)",
                      "&:hover": { bgcolor: isSelected ? "var(--color-primary-surface)" : "var(--color-surface-hover)", cursor: "pointer" },
                    }}
                  >
                    <TableCell sx={{ color: "var(--color-text-muted)", fontSize: 12, pr: 0, width: 32 }}>{i + 1}.</TableCell>
                    <TableCell sx={{ pl: 0, width: 32 }} onClick={(e) => e.stopPropagation()}>
                      <Checkbox size="small" checked={isSelected} onChange={() => toggleOne(s.uid)} sx={{ p: 0 }} />
                    </TableCell>

                    {col("photo") && (
                      <TableCell>
                        <Avatar sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 700, bgcolor: "#d1d9e0", color: "var(--color-text-secondary)" }}>
                          <FiUser size={16} />
                        </Avatar>
                      </TableCell>
                    )}
                    {col("name") && (
                      <TableCell sx={{ fontWeight: 500, color: "var(--color-text-primary)", minWidth: 160 }}>{s.name}</TableCell>
                    )}
                    {col("phone") && (
                      <TableCell><Typography fontSize={13} color="#5c7fa3">{s.phone}</Typography></TableCell>
                    )}
                    {col("groups") && (
                      <TableCell sx={{ minWidth: 220 }}>
                        <Stack direction="row" alignItems="center" gap={0.5} flexWrap="wrap">
                          <Chip
                            label={s.groupBadge} size="small"
                            sx={{ fontSize: 10, height: 20, fontWeight: 600, bgcolor: badge.bg, color: badge.color, borderRadius: "4px" }}
                          />
                          <Typography fontSize={13} color="var(--color-text-secondary)">{s.groupName}</Typography>
                          <Typography fontSize={12} color="var(--color-text-muted)">({s.groupSchedule.split("• ")[1] || ""})</Typography>
                        </Stack>
                      </TableCell>
                    )}
                    {col("teachers") && (
                      <TableCell sx={{ minWidth: 140, color: "var(--color-text-secondary)" }}>{s.teacher}</TableCell>
                    )}
                    {col("training") && (
                      <TableCell sx={{ minWidth: 120 }}>
                        <Typography fontSize={13} color="var(--color-text-muted)">{formatDate(s.startDate)} —</Typography>
                        <Typography fontSize={13} color="var(--color-text-muted)">{formatDate(s.endDate)}</Typography>
                      </TableCell>
                    )}
                    {col("balance") && (
                      <TableCell>
                        <Typography fontSize={13} fontWeight={500} color={(s.balance ?? 0) < 0 ? "var(--color-danger)" : "var(--color-success)"}>
                          {(s.balance ?? 0).toLocaleString("ru-RU")}
                        </Typography>
                      </TableCell>
                    )}
                    {col("comment") && <TableCell />}

                    {/* ACTIONS */}
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small" onClick={(e) => openActionMenu(e, s.uid)} sx={{ color: "var(--color-text-secondary)" }}>
                        <BsThreeDotsVertical size={15} />
                      </IconButton>
                      <Menu
                        anchorEl={actionMenu?.uid === s.uid ? actionMenu.el : null}
                        open={actionMenu?.uid === s.uid}
                        onClose={() => setActionMenu(null)}
                        PaperProps={{ sx: { borderRadius: 2, minWidth: 170, boxShadow: "0 4px 20px var(--color-shadow)", border: "1px solid var(--color-border)" } }}
                        transformOrigin={{ horizontal: "right", vertical: "top" }}
                        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                      >
                        <MenuItem onClick={() => { setActionMenu(null); setEditDrawerOpen(true); }} sx={{ fontSize: 13, gap: 1.2, py: 1.2, color: "var(--color-text-secondary)" }}>
                          <MdEdit size={16} color="var(--color-text-secondary)" /> {t("students.actions.editStudent")}
                        </MenuItem>
                        {hasPermission("PAYMENTS", "CREATE") && (
                          <>
                            <Divider sx={{ my: 0.5 }} />
                            <MenuItem onClick={() => { setActionMenu(null); setAddPaymentOpen(true); }} sx={{ fontSize: 13, gap: 1.2, py: 1.2, color: "var(--color-success)" }}>
                              <MdPayment size={16} color="var(--color-success)" /> {t("students.actions.addPayment")}
                            </MenuItem>
                          </>
                        )}
                        <Divider sx={{ my: 0.5 }} />
                        <MenuItem onClick={() => { setActionMenu(null); setActionError(null); setArchiveUid(s.uid); }} sx={{ fontSize: 13, gap: 1.2, py: 1.2, color: "var(--color-danger)" }}>
                          <MdDelete size={16} /> {t("students.actions.archive")}
                        </MenuItem>
                      </Menu>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!studentsLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 6, color: "var(--color-text-muted)" }}>
                    {t("students.table.noStudentsFound")}
                  </TableCell>
                </TableRow>
              )}
              {studentsLoading && (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 6, color: "var(--color-text-muted)" }}>
                    {t("students.table.loading")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* PAGINATION */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 3, py: 1.5, borderTop: "1px solid var(--color-border)" }}>
          <Typography fontSize={13} color="text.secondary">
            {studentsData
              ? t("students.pagination.range", {
                  from: pageMeta.total === 0 ? 0 : (pageMeta.page - 1) * pageMeta.limit + 1,
                  to: Math.min(pageMeta.page * pageMeta.limit, pageMeta.total),
                  total: pageMeta.total,
                })
              : t("students.pagination.range", { from: 0, to: 0, total: 0 })}
          </Typography>
          <Stack direction="row" gap={0.5}>
            <Button
              size="small" variant="outlined"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              sx={{ minWidth: 32, px: 1, borderColor: "var(--color-border)", color: "var(--color-text-secondary)", borderRadius: "6px", fontSize: 13 }}
            >
              {"<"}
            </Button>
            <Button
              size="small" variant="outlined"
              disabled={!studentsData || page >= pageMeta.totalPages}
              onClick={() => setPage((p) => (studentsData && p < pageMeta.totalPages ? p + 1 : p))}
              sx={{ minWidth: 32, px: 1, borderColor: "var(--color-border)", color: "var(--color-text-secondary)", borderRadius: "6px", fontSize: 13 }}
            >
              {">"}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* ── MODALS & DRAWERS ─────────────────────────────── */}

      <AddStudent open={addStudentOpen} onClose={() => setAddStudentOpen(false)} />
      <AddPayment open={addPaymentOpen} onClose={() => setAddPaymentOpen(false)} />

      <EditStudentDrawer
        open={editDrawerOpen}
        student={activeStudent}
        onClose={() => setEditDrawerOpen(false)}
        onSave={handleSaveEdit}
        saving={isUpdatingStudent}
        error={actionError}
      />
      <AddToGroupModal
        open={addToGroupOpen}
        onClose={() => setAddToGroupOpen(false)}
        groups={allGroupsOptions}
        selectedCount={selected.length}
        onSubmit={handleAddToGroup}
        isSubmitting={isAddingToGroup}
      />

      <SendSmsModal
        open={sendSmsOpen}
        onClose={() => setSendSmsOpen(false)}
        selectedCount={selected.length}
      />

      {/* Archive dialog — PATCH /students/{id}/toggle-status (status -> INACTIVE).
          This is the active list's only "remove" action: permanent DELETE is
          reserved for the Archive page, since the backend rejects it here
          while the student still has group/attendance records. */}
      <Dialog open={Boolean(archiveUid)} onClose={() => setArchiveUid(null)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{t("students.archiveDialog.title")}</DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color="text.secondary">{t("students.archiveDialog.message")}</Typography>
          {actionError && (
            <Typography fontSize={13} color="error" mt={1.5}>{actionError}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setArchiveUid(null)} disabled={isArchivingStudent} sx={{ color: "var(--color-text-secondary)" }}>{t("students.archiveDialog.cancel")}</Button>
          <Button variant="contained" color="error" disabled={isArchivingStudent} onClick={handleArchiveConfirm} sx={{ borderRadius: 2 }}>{t("students.archiveDialog.confirm")}</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk delete (archive) confirm — same toggle-status mutation, applied to every selected row */}
      <Dialog open={bulkDeleteConfirmOpen} onClose={() => setBulkDeleteConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{t("students.archiveDialog.title")}</DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color="text.secondary">{t("students.archiveDialog.message")}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBulkDeleteConfirmOpen(false)} sx={{ color: "var(--color-text-secondary)" }}>{t("students.archiveDialog.cancel")}</Button>
          <Button variant="contained" color="error" onClick={handleBulkDeleteConfirm} sx={{ borderRadius: 2 }}>{t("students.archiveDialog.confirm")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};