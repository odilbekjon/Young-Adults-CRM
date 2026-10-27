// src/pages/Students.tsx
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useAuth } from "../../hooks/useAuth";
import { usePersistedState } from "../../hooks/usePersistedState";
import { useArchiveStudent } from "../../hooks/useArchiveStudent";
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
import { StudentTagsSelect } from "../../components/StudentTagsSelect";
import { ALL_COLUMNS, BADGE_COLORS } from "../../constants/StudentsTable";
import { useNavigate, useSearchParams } from "react-router-dom";

import { AddStudent } from "../../components/AddStudent";
import { AddPayment } from "../../components/AddPayment";
import {
  useAllStudentsQuery,
  useUpdateStudentMutation,
  useStudentForEditQuery,
  useLazyStudentsExcelQuery,
} from "../../app/api/studentsApi";
import type { StudentFinanceStatus, StudentGender, studentsRequest } from "../../app/api/studentsApi/types";
import { StudentContactFields, EMPTY_CONTACTS, type ContactValues } from "../../components/StudentContactFields/StudentContactFields";
import { toPhoneInput, fromPhoneInput } from "../../utils/formatPhone";
import { runLimited, runLimitedSettled } from "../../utils/runLimited";

// Bulk actions send at most this many requests at once. The server rejects
// more than 3 parallel requests to one endpoint (429) and a worker starts its
// next call the instant the previous answer arrives, so 2 leaves headroom.
const BULK_CONCURRENCY = 2;
import {
  useAllGroupsQuery,
  useAddStudentToGroupMutation,
  useStudentGroupsQuery,
  useLazyStudentGroupsQuery,
  useFreezeStudentGroupMutation,
} from "../../app/api/groupsApi";
import type { StudentGroupStatus } from "../../app/api/groupsApi/types";
import { useCoursesSelectQuery } from "../../app/api/coursesApi";
import { useTeachersSelectQuery } from "../../app/api/teachersApi";
import { useReasonsSelectQuery } from "../../app/api/reasonsApi";
import { useTagsSelectQuery } from "../../app/api/tagsApi";
import { useToast } from "../../Context/ToastContext";
import { DatePickerField } from "../SingleGroup/DatePickerField";
import { RemoveStudentDialog } from "../SingleGroup/RemoveStudentDialog";
import { extractApiError } from "../../utils/extractApiError";
import { downloadExcelBlob } from "../../utils/downloadExcel";
import { useBranch } from "../../Context/BranchContext";
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
  tags: string;
}

// Status / Financial filter values (also accepted from the URL:
// /students?status=<key>&financial=<key>). "inactive" = the archived
// students (GET /students?status=INACTIVE).
const STATUS_OPTION_KEYS = [
  "added_this_month", "signed_offer", "trial", "active", "frozen",
  "without_group", "left_after_trial", "left_active", "inactive",
] as const;
const STATUS_FILTER_KEYS = STATUS_OPTION_KEYS;
const FINANCIAL_FILTER_KEYS = ["debt", "discount", "no_debt", "positive", "paid_month"] as const;
// GET /students `financeStatus` value of each Financial-situation option.
const FINANCE_STATUS_PARAM: Record<string, StudentFinanceStatus> = {
  debt: "DEBTOR", discount: "DISCOUNTED", no_debt: "DEBT_FREE", positive: "POSITIVE_BALANCE", paid_month: "PAID_THIS_MONTH",
};
// Every other filter is a query param of GET /students (server-side search,
// filtering and pagination). The exceptions are the Status options below that
// depend on a student's group memberships — the backend can't filter by
// those, so for them the (already server-narrowed) roster is fetched in full
// and matched against GET /student-groups client-side. Value = the
// membership statuses each option is derived from.
const ALL_MEMBERSHIP_STATUSES: StudentGroupStatus[] = ["PROBATION", "ACTIVE", "FROZEN", "INACTIVE", "DELETED"];
const MEMBERSHIP_STATUSES_OF: Record<string, StudentGroupStatus[]> = {
  trial: ["PROBATION"],
  active: ["ACTIVE"],
  frozen: ["FROZEN"],
  signed_offer: ["ACTIVE", "FROZEN", "INACTIVE", "DELETED"],
  left_after_trial: ALL_MEMBERSHIP_STATUSES,
  left_active: ALL_MEMBERSHIP_STATUSES,
};
const ROSTER_LIMIT = 3000;
const MEMBERSHIP_LIMIT = 1000;
const SEARCH_DEBOUNCE_MS = 350;

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

/* ─── COMPACT FILTER CONTROLS ────────────────────────── */
// Shared look for every control in the filter row: white field, thin grey
// border, small radius, fixed 36px height, 13px text.
const CONTROL_H = 36;
const controlSx = {
  display: "flex", alignItems: "center", gap: 0.75,
  height: CONTROL_H, boxSizing: "border-box", width: "100%", minWidth: 0,
  border: "1px solid var(--color-border)", borderRadius: "6px", px: 1,
  bgcolor: "var(--color-surface)", transition: "border-color 0.15s",
};

// Each control sits in a flex cell: `basis` is roughly its natural width, the
// cell may grow to fill the row and the row wraps (instead of breaking the
// layout) once the cells no longer fit on a single line.
const filterCell = (basis: number, grow = 1) => ({ flex: `${grow} 1 ${basis}px`, minWidth: 0 });

/* ─── DROPDOWN FILTER ────────────────────────────────── */
interface DropdownProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  onClear: () => void;
  // Labels for values that are still accepted (e.g. from an old URL) but no
  // longer offered in the list.
  extraLabels?: Record<string, string>;
}

const DropdownFilter = ({ label, value, options, onChange, onClear, extraLabels }: DropdownProps) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const selectedLabel = value ? options.find((o) => o.value === value)?.label ?? extraLabels?.[value] ?? value : "";
  const open = (el: HTMLElement) => setAnchor(el);
  return (
    <>
      <Box
        role="button" tabIndex={0} aria-haspopup="listbox" title={selectedLabel || label}
        onClick={(e) => open(e.currentTarget)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(e.currentTarget); } }}
        sx={{
          ...controlSx, cursor: "pointer", userSelect: "none",
          borderColor: value ? "#5c7fa3" : "var(--color-border)",
          bgcolor: value ? "var(--color-primary-surface)" : "var(--color-surface)",
          "&:hover": { borderColor: "#5c7fa3" },
          "&:focus-visible": { outline: "none", borderColor: "#5c7fa3" },
        }}
      >
        <Box
          component="span"
          sx={{
            flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            color: value ? "#5c7fa3" : "var(--color-text-secondary)",
          }}
        >
          {selectedLabel || label}
        </Box>
        {value ? (
          <IoClose size={14} color="#5c7fa3" style={{ flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); onClear(); }} />
        ) : (
          <HiChevronDown size={13} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
        )}
      </Box>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        PaperProps={{ sx: { borderRadius: 2, minWidth: Math.max(anchor?.offsetWidth ?? 0, 180), maxWidth: 340, mt: 0.5, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" } }}
      >
        {options.map((o) => (
          <MenuItem
            key={o.value} selected={value === o.value}
            onClick={() => { onChange(o.value); setAnchor(null); }}
            sx={{ fontSize: 13, whiteSpace: "normal" }}
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
}

const TextFilterInput = ({ placeholder, value, onChange, disabled, disabledTitle, type = "text" }: TextFilterProps) => (
  <Tooltip title={disabled ? disabledTitle ?? "" : ""} arrow disableHoverListener={!disabled}>
    <Box
      sx={{
        ...controlSx,
        bgcolor: disabled ? "var(--color-surface-alt)" : "var(--color-surface)",
        opacity: disabled ? 0.6 : 1,
        "&:hover": disabled ? {} : { borderColor: "var(--color-text-muted)" },
        "&:focus-within": { borderColor: "#5c7fa3" },
      }}
    >
      <input
        placeholder={placeholder}
        value={value}
        type={type}
        min={type === "number" ? 0 : undefined}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{ border: "none", outline: "none", fontSize: 13, color: "var(--color-text-secondary)", background: "transparent", width: "100%", minWidth: 0, cursor: disabled ? "not-allowed" : "text" }}
      />
    </Box>
  </Tooltip>
);

/* ─── DATE FILTER BOX (From/To created) ─────────────────── */
// DatePickerField (shared) renders a 40px / 8px-radius field; the overrides
// below bring it to the same 36px / 6px look as the rest of the row and
// tighten its padding so the whole placeholder ("From created date") fits
// without being clipped. Its calendar popup is a portal, so it is unaffected.
const DateFilterInput = ({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (val: string) => void }) => (
  <Box
    sx={{
      width: "100%", minWidth: 0,
      // DatePickerField's wrapper carries an inline `min-width: 160px`, which
      // is wider than the flex cell once the row is squeezed — the field then
      // overflowed its cell and touched its neighbour (From/To glued together).
      // Inline style => needs !important to be overridden.
      "& > div": { minWidth: "0 !important", width: "100%" },
      "& [role='button']": {
        height: `${CONTROL_H}px !important`, borderRadius: "6px !important",
        padding: "0 8px !important", gap: "6px !important",
      },
      "& [role='button'] svg": { width: "14px", height: "14px" },
      "& [role='button'] span": { fontSize: "13px !important" },
    }}
  >
    <DatePickerField value={value} onChange={onChange} placeholder={placeholder} />
  </Box>
);

/* ─── ADD TO GROUP MODAL ─────────────────────────────── */
// Same rule as SingleGroup's "Add student": a student added to a group must
// NOT be active on the spot — the membership is created as PROBATION (never
// ACTIVE, which would start payment accounting) and immediately frozen; staff
// activate it later from the group (Activate asks "since when"). So this
// modal only asks for the group and the "joined on" date.
const pad2 = (n: number) => String(n).padStart(2, "0");
// Local calendar date as YYYY-MM-DD (toISOString() is UTC, which lands on the
// previous day for the first hours after midnight in UTC+5).
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

// POST /student-groups' response envelope isn't documented beyond a 200, so
// the new membership's id is picked up defensively ({data: {id}} or {id}) and
// ignored if the row obviously belongs to a different group (same helper as
// SingleGroup's handleAddStudentSubmit).
const membershipIdFromCreateResponse = (res: unknown, groupId: string): string | undefined => {
  if (!res || typeof res !== "object") return undefined;
  const container = res as Record<string, unknown>;
  const row = (container.data && typeof container.data === "object" && !Array.isArray(container.data)
    ? container.data
    : container) as Record<string, unknown>;
  if (typeof row.groupId === "string" && row.groupId !== groupId) return undefined;
  return typeof row.id === "string" && row.id ? row.id : undefined;
};

export interface AddToGroupPayload {
  groupId: string;
  joinedAt: string;
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
  const [joinedAt, setJoinedAt] = useState(todayIso());

  useEffect(() => {
    if (!open) {
      setGroupId("");
      setJoinedAt(todayIso());
    }
  }, [open]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!groupId || isSubmitting) return;
    const success = await onSubmit({ groupId, joinedAt: joinedAt || todayIso() });
    if (success) { setGroupId(""); setJoinedAt(todayIso()); }
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
            {t("students.addToGroup.joinedAt")}
          </Typography>
          <DatePickerField value={joinedAt} onChange={setJoinedAt} disabled={isSubmitting} />
          <Typography fontSize={12} color="var(--color-text-muted)" mt={0.8}>
            {t("students.addToGroup.frozenHint")}
          </Typography>
        </Box>

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
  onSave: (uid: string, data: { name: string; phone: string; gender: StudentGender | undefined; birthdate: string; tagIds: string[]; contacts: ContactValues }) => Promise<boolean>;
  saving?: boolean;
  error?: string | null;
}) => {
  const { t } = useTranslation();
  const [name,   setName]   = useState("");
  const [phone,  setPhone]  = useState("");
  const [dob,    setDob]    = useState("");
  const [gender, setGender] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [contacts, setContacts] = useState<ContactValues>(EMPTY_CONTACTS);

  // The list row only knows name/phone/tags — GET /students/{id}/for-edit
  // supplies the rest (birthdate, gender, contacts) when the drawer opens.
  const { data: forEditData } = useStudentForEditQuery(student?.uid ?? "", { skip: !open || !student });
  const forEdit = forEditData?.data;

  React.useEffect(() => {
    if (!open || !student) return;
    setName(forEdit?.name || student.name);
    setPhone(toPhoneInput(forEdit?.phone || student.phone));
    setDob(forEdit?.birthdate ? forEdit.birthdate.slice(0, 10) : "");
    setGender(forEdit?.gender === "FEMALE" ? "female" : forEdit?.gender === "MALE" ? "male" : "");
    setTagIds(forEdit?.tagIds?.length ? forEdit.tagIds : student.tagIds ?? []);
    setContacts({
      parentPhone: forEdit?.parentPhone ?? "", passport: forEdit?.passport ?? "", parentName: forEdit?.parentName ?? "", email: forEdit?.email ?? "",
      telegram: forEdit?.telegram ?? "", schoolName: forEdit?.schoolName ?? "", location: forEdit?.location ?? "", instagram: forEdit?.instagram ?? "",
    });
  }, [open, student, forEdit]);

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
          <StudentContactFields values={contacts} onChange={(id, value) => setContacts((p) => ({ ...p, [id]: value }))} />
        </Box>

        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="var(--color-text-secondary)" mb={1}>{t("students.editDrawer.tags", { defaultValue: "Tags" })}</Typography>
          <StudentTagsSelect value={tagIds} onChange={setTagIds} placeholder={t("students.editDrawer.tagsPlaceholder", { defaultValue: "Add new tags" })} />
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
          onClick={async () => { if (!student) return; const ok = await onSave(student.uid, { name, phone: fromPhoneInput(phone), gender: gender === "female" ? "FEMALE" : gender === "male" ? "MALE" : undefined, birthdate: dob, tagIds, contacts }); if (ok) onClose(); }}
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

  const [page, setPage] = usePersistedState("students:page", 1);
  const limit = 20;
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);
  const { branchLabel } = useBranch();
  const [updateStudent,{ isLoading: isUpdatingStudent }] = useUpdateStudentMutation();
  const { archiveStudent: archiveStudentFlow, deleteStudent: deleteStudentFlow } = useArchiveStudent();
  const [fetchMemberships] = useLazyStudentGroupsQuery();
  const [freezeStudentGroup] = useFreezeStudentGroupMutation();
  const [isArchiving, setIsArchiving] = useState(false);
  const { data: reasonOptions } = useReasonsSelectQuery({ status: "ACTIVE", page: 1, limit: 200 });
  // GET /tags/select?type=STUDENT — real, admin-managed tags for the "Tags"
  // filter, replacing the disabled placeholder (students had no tags
  // relationship to filter by until this Tags feature existed).
  const { data: tagOptions } = useTagsSelectQuery({ type: "STUDENT" });
  const [fetchStudentsExcel, { isFetching: isExportingExcel }] = useLazyStudentsExcelQuery();
  // GET /courses/select + GET /teachers/select — the complete lists for the
  // "By courses" / "By teacher" filters (they used to be derived from the
  // students on the current page, so most options never appeared).
  const { data: courseOptions } = useCoursesSelectQuery();
  const { data: teacherOptions } = useTeachersSelectQuery({ branchId: selectedBranchId ?? "all" });
  // GET /groups is paginated (100 per page): pages 2-3 are only requested when
  // the previous page came back full. The group list serves the Add-to-group
  // picker and the course / lesson time shown in the Groups column.
  const GROUPS_PAGE = 100;
  const { data: groupsPage1 } = useAllGroupsQuery({ page: 1, limit: GROUPS_PAGE });
  const { data: groupsPage2 } = useAllGroupsQuery({ page: 2, limit: GROUPS_PAGE }, { skip: (groupsPage1?.data.length ?? 0) < GROUPS_PAGE });
  const { data: groupsPage3 } = useAllGroupsQuery({ page: 3, limit: GROUPS_PAGE }, { skip: (groupsPage2?.data.length ?? 0) < GROUPS_PAGE });
  const allGroupRows = useMemo(
    () => [...(groupsPage1?.data ?? []), ...(groupsPage2?.data ?? []), ...(groupsPage3?.data ?? [])],
    [groupsPage1, groupsPage2, groupsPage3],
  );
  const [addStudentToGroup] = useAddStudentToGroupMutation();
  const [isAddingToGroup, setIsAddingToGroup] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);

  const [selected,          setSelected]          = useState<string[]>([]);
  const [sortKey,           setSortKey]           = usePersistedState<SortKey>("students:sortKey", "");
  const [sortDir,           setSortDir]           = usePersistedState<SortDir>("students:sortDir", "asc");
  const [visibleCols,       setVisibleCols]       = usePersistedState<string[]>("students:visibleCols", ALL_COLUMNS.map((c) => c.key));
  const [columnsAnchor,     setColumnsAnchor]     = useState<null | HTMLElement>(null);
  const [actionMenu,        setActionMenu]        = useState<{ el: HTMLElement; uid: string } | null>(null);
  const [archiveUid,        setArchiveUid]        = useState<string | null>(null);
  const [archiveReasonId,   setArchiveReasonId]   = useState("");
  const [archiveComment,    setArchiveComment]    = useState("");
  // Dialog switch: false = archive the student, true = delete the student.
  const [archiveDeleteMode, setArchiveDeleteMode] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const [editDrawerOpen,    setEditDrawerOpen]    = useState(false);
  const [activeStudent,     setActiveStudent]     = useState<FlatStudent | null>(null);
  const [addToGroupOpen,    setAddToGroupOpen]    = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);

  const EMPTY_FILTERS: Filters = {
    search: "", teacher: "", course: "", status: "", financial: "",
    groupCount: "", fromCreated: "", toCreatedDate: "", tags: "",
  };
  // Read once on mount so a link like /students?status=active opens
  // pre-filtered — same "read once into initial state" convention already
  // used by Finance > All Payments for its Dashboard-driven date range.
  const [searchParams] = useSearchParams();
  const initialStatusParam = searchParams.get("status") ?? "";
  const initialFinancialParam = searchParams.get("financial") ?? "";
  const urlStatus = (STATUS_FILTER_KEYS as readonly string[]).includes(initialStatusParam) ? initialStatusParam : "";
  const urlFinancial = (FINANCIAL_FILTER_KEYS as readonly string[]).includes(initialFinancialParam) ? initialFinancialParam : "";
  // Filters are kept across a browser refresh; a link that carries its own
  // status/financial (e.g. from the Dashboard) wins over the saved copy.
  const [filters, setFilters] = usePersistedState<Filters>(
    "students:filters",
    { ...EMPTY_FILTERS, status: urlStatus, financial: urlFinancial },
    Boolean(urlStatus || urlFinancial),
  );
  const [advancedAnchor, setAdvancedAnchor] = useState<null | HTMLElement>(null);

  // Search, course, teacher, tag, finance status, groups count and the created
  // date range are query params of GET /students, so the backend filters and
  // paginates: the table is always one page of one request, and the total
  // comes from the response's `meta`. "Added this month" is a created-date
  // range and "Without group" is groupsCount=0.
  //
  // The only filters the backend can't apply are the Status options in
  // MEMBERSHIP_STATUSES_OF (they depend on student-group memberships). For
  // those the roster — already narrowed by every filter above — is fetched in
  // full and matched against GET /student-groups client-side ("roster mode"),
  // so the result is still the real set, not a page-scoped approximation.
  const membershipStatuses = MEMBERSHIP_STATUSES_OF[filters.status];
  const rosterMode = Boolean(membershipStatuses);
  // Students who left a group are usually archived (INACTIVE), and GET
  // /students hides those unless `status=INACTIVE` is sent — so the "left"
  // options also pull the INACTIVE list and merge it in.
  const includeArchived = filters.status === "left_after_trial" || filters.status === "left_active";

  // Current month so far (the "Added this month" option).
  const monthRange = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
    return { start: `${ym}-01`, end: `${ym}-${pad2(now.getDate())}` };
  }, []);
  const addedThisMonth = filters.status === "added_this_month";
  const startDate = addedThisMonth && monthRange.start > filters.fromCreated ? monthRange.start : filters.fromCreated;
  const endDate = addedThisMonth && (!filters.toCreatedDate || monthRange.end < filters.toCreatedDate) ? monthRange.end : filters.toCreatedDate;
  const groupsCount = filters.groupCount.trim() ? Number(filters.groupCount) : filters.status === "without_group" ? 0 : undefined;

  // The search box is sent debounced (one request per pause, not per
  // keystroke); the page goes back to 1 in the same update as the new term.
  const [searchTerm, setSearchTerm] = useState(filters.search.trim());
  useEffect(() => {
    const term = filters.search.trim();
    if (term === searchTerm) return;
    const handle = setTimeout(() => { setSearchTerm(term); setPage(1); }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [filters.search, searchTerm, setPage]);

  // Also what the Excel export sends, so the file matches the table.
  const listFilters: studentsRequest = {
    branchId: selectedBranchId ?? undefined,
    search: searchTerm || undefined,
    // GET /students only returns ACTIVE students unless `status` is sent
    // explicitly (Swagger: status query param, ACTIVE/INACTIVE) — an archived
    // student (toggleStudentStatus -> INACTIVE) otherwise disappears from every
    // list request, filtered or not.
    status: filters.status === "active" ? "ACTIVE" : filters.status === "inactive" ? "INACTIVE" : undefined,
    tagId: filters.tags || undefined,
    courseId: filters.course || undefined,
    teacherId: filters.teacher || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    financeStatus: FINANCE_STATUS_PARAM[filters.financial],
    groupsCount,
  };

  // RTK keeps returning the previous args' `data` while a new query loads, so
  // the current page stays on screen until the next one arrives. The page and
  // the roster are separate queries so one never shows the other's rows.
  const { data: pageData, isLoading: pageLoading, isFetching: pageFetching } = useAllStudentsQuery(
    { ...listFilters, page, limit },
    { skip: rosterMode },
  );
  const { data: rosterData, isLoading: rosterLoading, isFetching: rosterFetching } = useAllStudentsQuery(
    { ...listFilters, page: 1, limit: ROSTER_LIMIT },
    { skip: !rosterMode },
  );
  const { data: archivedRosterData, isLoading: archivedLoading } = useAllStudentsQuery(
    { ...listFilters, status: "INACTIVE", page: 1, limit: ROSTER_LIMIT },
    { skip: !includeArchived },
  );

  // Student-group memberships by status — GET /student-groups accepts a
  // `status` filter (same calls Dashboard uses), one request per status so
  // each stays within its own row cap. Only the statuses the chosen option is
  // derived from are fetched.
  const branchArg = selectedBranchId ?? undefined;
  const membershipArgs = { branchId: branchArg, limit: MEMBERSHIP_LIMIT };
  const skipMembership = (status: StudentGroupStatus) => ({ skip: !membershipStatuses?.includes(status) });
  const { data: probationMs, isLoading: probationLoading } = useStudentGroupsQuery({ ...membershipArgs, status: "PROBATION" }, skipMembership("PROBATION"));
  const { data: activeMs, isLoading: activeLoading } = useStudentGroupsQuery({ ...membershipArgs, status: "ACTIVE" }, skipMembership("ACTIVE"));
  const { data: frozenMs, isLoading: frozenLoading } = useStudentGroupsQuery({ ...membershipArgs, status: "FROZEN" }, skipMembership("FROZEN"));
  const { data: inactiveMs, isLoading: inactiveLoading } = useStudentGroupsQuery({ ...membershipArgs, status: "INACTIVE" }, skipMembership("INACTIVE"));
  const { data: deletedMs, isLoading: deletedLoading } = useStudentGroupsQuery({ ...membershipArgs, status: "DELETED" }, skipMembership("DELETED"));

  // Membership-backed options need their data before they can say anything
  // meaningful — show nothing (the table shows "Loading") until it arrives
  // instead of briefly listing everyone.
  const rosterPending =
    rosterLoading || probationLoading || activeLoading || frozenLoading || inactiveLoading || deletedLoading ||
    (includeArchived && archivedLoading);
  const hasData = rosterMode ? !rosterPending : pageData !== undefined;
  const isListLoading = rosterMode ? rosterPending : pageLoading;
  const isListRefreshing = hasData && (rosterMode ? rosterFetching : pageFetching);

  // Student-id sets derived from the memberships above, by Status option.
  //  - trial / active / frozen: has a PROBATION / ACTIVE / FROZEN membership.
  //  - signed_offer ("signed offer" proxy): has ever had billing start — an
  //    ACTIVE/FROZEN membership, or an ended one that still carries a
  //    paymentStartDate (trial memberships never get one).
  //  - left_active: all memberships ended, at least one of them had been
  //    activated (paymentStartDate set).
  //  - left_after_trial: all memberships ended and none was ever activated.
  const membershipSets = useMemo(() => {
    const trial = new Set<string>();
    const active = new Set<string>();
    const frozen = new Set<string>();
    const activated = new Set<string>();
    const endedActivated = new Set<string>();
    const endedTrial = new Set<string>();

    (probationMs?.rows ?? []).forEach((m) => { trial.add(m.studentId); });
    (activeMs?.rows ?? []).forEach((m) => { active.add(m.studentId); activated.add(m.studentId); });
    (frozenMs?.rows ?? []).forEach((m) => { frozen.add(m.studentId); activated.add(m.studentId); });
    [...(inactiveMs?.rows ?? []), ...(deletedMs?.rows ?? [])].forEach((m) => {
      if (m.paymentStartDate) { endedActivated.add(m.studentId); activated.add(m.studentId); }
      else endedTrial.add(m.studentId);
    });

    const live = new Set<string>([...trial, ...active, ...frozen]);
    const sets: Record<string, Set<string>> = {
      trial, active, frozen,
      signed_offer: activated,
      left_active: new Set([...endedActivated].filter((id) => !live.has(id))),
      left_after_trial: new Set([...endedTrial].filter((id) => !live.has(id) && !activated.has(id))),
    };
    return sets;
  }, [probationMs, activeMs, frozenMs, inactiveMs, deletedMs]);

  // Roster mode: the students whose memberships match the chosen option.
  const rosterMatches = useMemo(() => {
    if (!rosterMode || rosterPending) return [];
    const base = rosterData?.data ?? [];
    const seen = new Set(base.map((s) => s.id));
    const archived = includeArchived ? (archivedRosterData?.data ?? []).filter((s) => !seen.has(s.id)) : [];
    return [...base, ...archived].filter((s) => membershipSets[filters.status].has(s.id));
  }, [rosterMode, rosterPending, rosterData, archivedRosterData, includeArchived, membershipSets, filters.status]);

  // Rows the table works with: the current server page, or the whole roster
  // match (paginated below).
  const rawRows = useMemo(() => (rosterMode ? rosterMatches : pageData?.data ?? []), [rosterMode, rosterMatches, pageData]);
  const rawById = useMemo(() => new Map(rawRows.map((s) => [s.id, s])), [rawRows]);

  // Sorting only reorders the rows in hand (the page, or the roster match) —
  // the backend has no sort param.
  const sortedRows = useMemo(() => {
    const flat = rawRows.map(mapApiStudentToFlat);
    if (!sortKey) return flat;
    return flat.sort((a, b) => {
      const av = String(a[sortKey as keyof FlatStudent] ?? "");
      const bv = String(b[sortKey as keyof FlatStudent] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [rawRows, sortKey, sortDir]);

  // Backend hozircha sahifalash meta'sini qaytarmasligi mumkin; shu sababli
  // joriy sahifa hajmidan taxminiy meta hosil qilamiz, chunki bu maydon kelib
  // qolsa (pageData.meta) to'g'ridan-to'g'ri ishlatiladi. In roster mode the
  // total/totalPages describe the client-side-paginated match instead.
  const pageMeta = useMemo(() => {
    if (rosterMode) {
      return {
        total: sortedRows.length,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(sortedRows.length / limit)),
      };
    }
    if (pageData?.meta) return pageData.meta;
    const count = pageData?.data.length ?? 0;
    return {
      total: count,
      page,
      limit,
      totalPages: count < limit ? page : page + 1,
    };
  }, [rosterMode, sortedRows, pageData, page, limit]);

  // Server mode: `sortedRows` already is the page. Roster mode: sliced to the
  // current page, so "select all" only selects what's visible.
  const pageRows = useMemo(
    () => (rosterMode ? sortedRows.slice((page - 1) * limit, page * limit) : sortedRows),
    [rosterMode, sortedRows, page, limit]
  );

  // A page saved before a refresh, or the last row of the last page being
  // archived, can leave `page` past the end.
  useEffect(() => {
    const lastPage = Math.max(1, pageMeta.totalPages);
    if (hasData && page > lastPage) setPage(lastPage);
  }, [hasData, page, pageMeta.totalPages, setPage]);

  // The checkboxes only cover the rows on screen: another page, filter set or
  // branch drops them.
  const queryKey = JSON.stringify([listFilters, filters.status]);
  useEffect(() => {
    setSelected((p) => (p.length > 0 ? [] : p));
  }, [page, queryKey]);

  // The globally-selected branch re-queries the backend with a different
  // result set — back to page 1. Compared against the previous value (not run
  // on mount) so the page restored after a refresh isn't thrown back to 1.
  const prevBranchId = useRef(selectedBranchId);
  useEffect(() => {
    if (prevBranchId.current === selectedBranchId) return;
    prevBranchId.current = selectedBranchId;
    setPage(1);
  }, [selectedBranchId, setPage]);

  // A changed filter starts over from page 1. (The search box is the
  // exception: it resets the page once the debounced term is applied.)
  const setFilter = <K extends keyof Filters>(key: K, val: Filters[K]) => {
    setFilters((p) => ({ ...p, [key]: val }));
    setPage(1);
  };
  const setSearch = (value: string) => setFilters((p) => ({ ...p, search: value }));

  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setSearchTerm("");
    setPage(1);
  };

  const hasFilters = Object.values(filters).some(Boolean);

  const TEACHERS_LIST = useMemo(
    () => (teacherOptions ?? []).map((tch) => ({ value: tch.id, label: tch.name })),
    [teacherOptions],
  );
  const COURSES_LIST = useMemo(
    () => (courseOptions ?? []).map((c) => ({ value: c.id, label: c.name })),
    [courseOptions],
  );

  // AddToGroupModal ochiladigan barcha guruhlar — backenddan (GET /groups),
  // joriy sahifadagi studentlarning guruhlaridan hosil qilingan taxminiy
  // ro'yxat emas.
  const allGroupsOptions = useMemo(
    () => allGroupRows.map((g) => ({ id: g.id, name: g.name })),
    [allGroupRows]
  );
  const groupById = useMemo(() => new Map(allGroupRows.map((g) => [g.id, g])), [allGroupRows]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const allSelected = pageRows.length > 0 && pageRows.every((s) => selected.includes(s.uid));
  const toggleAll   = () => setSelected(allSelected ? [] : pageRows.map((s) => s.uid));
  const toggleOne   = (uid: string) =>
    setSelected((p) => p.includes(uid) ? p.filter((x) => x !== uid) : [...p, uid]);

  const resetArchiveState = () => {
    setArchiveUid(null);
    setArchiveReasonId("");
    setArchiveComment("");
    setArchiveDeleteMode(false);
  };

  // Archives a student through the shared flow (see useArchiveStudent): ends
  // every live group membership, then POST /students/{id}/status INACTIVE
  // with the picked reasonId/comment.
  const archiveStudent = async (studentId: string, reasonId?: string, comment?: string) => {
    await archiveStudentFlow({ studentId, reasonId, comment });
  };

  const handleArchiveConfirm = async () => {
    if (!archiveUid || isArchiving) return;
    setActionError(null);
    setIsArchiving(true);
    try {
      if (archiveDeleteMode) await deleteStudentFlow({ studentId: archiveUid, reasonId: archiveReasonId, comment: archiveComment });
      else await archiveStudent(archiveUid, archiveReasonId, archiveComment);
      setSelected((p) => p.filter((x) => x !== archiveUid));
      resetArchiveState();
      toast.success(t(archiveDeleteMode ? "students.toast.deleted" : "students.toast.archived"));
    } catch (err) {
      const detail = extractApiError(err);
      const message = detail ? `${t("students.archiveDialog.error")}: ${detail}` : t("students.archiveDialog.error");
      setActionError(message);
      toast.error(message);
    } finally {
      setIsArchiving(false);
    }
  };

  // Bulk "delete selected" = the same archive flow for every selected row
  // (no reason picker in the bulk dialog). Replaces the blind
  // PATCH /students/{id}/toggle-status, which left memberships alive and would
  // have flipped an already-archived student (Status filter "Inactive") back
  // to ACTIVE.
  const handleBulkDelete = async () => {
    if (selected.length === 0 || isArchiving) return;
    setActionError(null);
    setIsArchiving(true);
    const failed: string[] = [];
    let firstError: unknown = null;
    const settled = await runLimitedSettled(selected, BULK_CONCURRENCY, (uid) => archiveStudent(uid));
    settled.forEach((res, i) => {
      if (res.status === "rejected") {
        failed.push(selected[i]);
        if (firstError === null) firstError = res.reason;
      }
    });
    setIsArchiving(false);
    setSelected(failed);
    if (failed.length === 0) {
      toast.success(t("students.toast.archived"));
      return;
    }
    const detail = extractApiError(firstError);
    const base = failed.length < selected.length
      ? t("students.toast.archivePartial", { done: selected.length - failed.length, total: selected.length })
      : t("students.archiveDialog.error");
    const message = detail ? `${base}: ${detail}` : base;
    setActionError(message);
    toast.error(message);
  };

  const handleBulkDeleteConfirm = async () => {
    setBulkDeleteConfirmOpen(false);
    await handleBulkDelete();
  };

  const handleSaveEdit = async (uid: string, data: { name: string; phone: string; gender: StudentGender | undefined; birthdate: string; tagIds: string[]; contacts: ContactValues }): Promise<boolean> => {
    setActionError(null);
    try {
      // Empty contact fields are left out (a multipart empty string would be stored as a value).
      const contacts = Object.fromEntries(Object.entries(data.contacts).map(([k, v]) => [k, v.trim() || undefined]));
      await updateStudent({
        id: uid, name: data.name, phone: data.phone || undefined, gender: data.gender,
        birthdate: data.birthdate || undefined, tagIds: data.tagIds.length ? data.tagIds : undefined, ...contacts,
      }).unwrap();
      toast.success(t("students.toast.updated"));
      return true;
    } catch {
      setActionError(t("students.editDrawer.error"));
      toast.error(t("students.editDrawer.error"));
      return false;
    }
  };

  const handleAddToGroup = async ({ groupId, joinedAt }: AddToGroupPayload): Promise<boolean> => {
    setActionError(null);
    // Backend student-groups' allaqachon a'zo bo'lgan studentni qayta
    // qo'shishga ruxsat bermasligi mumkin — shu sabab tanlanganlar orasidan
    // bu guruhda allaqachon bor bo'lganlarni oldindan chiqarib tashlaymiz.
    const eligibleUids = selected.filter((uid) => {
      const raw = rawById.get(uid);
      return !(raw?.groups ?? []).some((g) => g.id === groupId);
    });
    if (eligibleUids.length === 0) {
      toast.error(t("students.addToGroup.toast.alreadyInGroup"));
      return false;
    }
    setIsAddingToGroup(true);
    // Same flow as SingleGroup's handleAddStudentSubmit: POST /student-groups
    // as PROBATION (never ACTIVE — that would start payment accounting; no
    // paymentStartDate) with joinedAt, then POST /student-groups/{id}/freeze
    // (startDate = joinedAt) so the student lands FROZEN. Staff activate them
    // later ("since when" is asked then).
    //
    // A couple of students at a time, each going straight from create to
    // freeze, so the requests never pile up on one endpoint and the cache
    // refetches (every mutation invalidates group/student lists) happen once
    // the whole batch is done instead of between its steps.
    const freeze = async (membershipId: string): Promise<boolean> => {
      try {
        await freezeStudentGroup({ id: membershipId, startDate: joinedAt }).unwrap();
        return true;
      } catch {
        // The student WAS added — only the follow-up freeze failed.
        return false;
      }
    };
    const created = await runLimitedSettled(eligibleUids, BULK_CONCURRENCY, async (studentId) => {
      const res = await addStudentToGroup({ studentId, groupId, status: "PROBATION", joinedAt }).unwrap();
      const membershipId = membershipIdFromCreateResponse(res, groupId);
      if (!membershipId) return "unknownMembership" as const;
      return (await freeze(membershipId)) ? ("frozen" as const) : ("notFrozen" as const);
    });

    const failed: { uid: string; error: unknown }[] = [];
    const added: string[] = [];
    const unknownMembership: string[] = [];
    let notFrozen = 0;
    created.forEach((res, i) => {
      const uid = eligibleUids[i];
      if (res.status === "rejected") {
        failed.push({ uid, error: res.reason });
        return;
      }
      added.push(uid);
      if (res.value === "notFrozen") notFrozen += 1;
      if (res.value === "unknownMembership") unknownMembership.push(uid);
    });

    // When the create response doesn't name the new membership, one look-up
    // of the group's trial memberships finds it for all those students.
    if (unknownMembership.length > 0) {
      const newest = new Map<string, string>();
      try {
        const found = await fetchMemberships({ groupId, status: "PROBATION", limit: MEMBERSHIP_LIMIT }).unwrap();
        // Oldest first, so a student's newest membership is the one kept.
        [...found.rows]
          .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""))
          .forEach((m) => newest.set(m.studentId, m.id));
      } catch {
        // Those students just count as not frozen below.
      }
      const frozen = await runLimited(unknownMembership, BULK_CONCURRENCY, async (uid) => {
        const membershipId = newest.get(uid);
        return membershipId ? freeze(membershipId) : false;
      });
      notFrozen += frozen.filter((ok) => !ok).length;
    }
    setIsAddingToGroup(false);

    if (added.length > 0) setSelected((p) => p.filter((uid) => !added.includes(uid)));

    if (failed.length === 0) {
      toast.success(t("students.addToGroup.toast.success"));
      if (notFrozen > 0) toast.error(t("students.addToGroup.toast.freezeError"));
      setAddToGroupOpen(false);
      return true;
    }
    const detail = extractApiError(failed[0].error);
    const base = added.length > 0
      ? t("students.addToGroup.toast.partialError", { done: added.length, total: eligibleUids.length })
      : t("students.addToGroup.toast.error");
    // Who is left selected for another try, and what the server said.
    const names = failed.map((f) => rawById.get(f.uid)?.name).filter(Boolean);
    const shown = names.slice(0, 3).join(", ") + (names.length > 3 ? ` +${names.length - 3}` : "");
    const message = detail ? `${base}: ${detail}` : base;
    toast.error(shown ? `${message}. ${t("students.addToGroup.toast.failedStudents", { names: shown })}` : message);
    if (notFrozen > 0) toast.error(t("students.addToGroup.toast.freezeError"));
    return false;
  };

  const handleExportExcel = async () => {
    try {
      // The same server filters as the table (the membership-based Status
      // options are the one thing the backend can't filter by).
      const blob = await fetchStudentsExcel({
        ...listFilters,
        page: 1,
        // Backend doesn't reliably return pagination meta for GET /students,
        // so `pageMeta.total` can be capped at the on-screen page size. Use a
        // large fixed limit instead so the export always covers every match.
        limit: 1_000_000,
      }).unwrap();
      downloadExcelBlob(blob, "students", branchLabel);
    } catch {
      toast.error(t("students.actions.exportError"));
    }
  };

  const openActionMenu = (e: React.MouseEvent<HTMLButtonElement>, uid: string) => {
    e.stopPropagation();
    const student = pageRows.find((s) => s.uid === uid) || null;
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
          <Typography fontSize={14} color="var(--color-text-secondary)">{t("students.header.quantity", { count: hasData ? pageMeta.total : 0 })}</Typography>
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

      {/* FILTER ROW — one compact horizontal row of 36px controls; each sits
          in a flex cell so the row fills the width on desktop and wraps
          cleanly (never overlaps/clips) on narrower screens. */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1, alignItems: "center" }}>
        {/* Search */}
        <Box sx={filterCell(190, 2)}>
          <Box sx={{ ...controlSx, "&:hover": { borderColor: "var(--color-text-muted)" }, "&:focus-within": { borderColor: "#5c7fa3" } }}>
            <IoSearchOutline size={15} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
            <input
              placeholder={t("students.filters.searchPlaceholder")}
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: 13, color: "var(--color-text-secondary)", background: "transparent", width: "100%", minWidth: 0 }}
            />
            {filters.search && (
              <IoClose size={13} color="var(--color-text-muted)" style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => setSearch("")} />
            )}
          </Box>
        </Box>

        <Box sx={filterCell(105)}>
          <DropdownFilter
            label={t("students.filters.byCourses")} value={filters.course}
            options={COURSES_LIST}
            onChange={(v) => setFilter("course", v)} onClear={() => setFilter("course", "")}
          />
        </Box>

        <Box sx={filterCell(95)}>
          <DropdownFilter
            label={t("students.filters.status")} value={filters.status}
            options={STATUS_OPTION_KEYS.map((k) => ({ value: k, label: t(`students.filters.statusOptions.${k}`) }))}
            extraLabels={{ inactive: t("students.filters.statusOptions.inactive") }}
            onChange={(v) => setFilter("status", v)} onClear={() => setFilter("status", "")}
          />
        </Box>

        <Box sx={filterCell(160)}>
          <DropdownFilter
            label={t("students.filters.financialSituation")} value={filters.financial}
            options={FINANCIAL_FILTER_KEYS.map((k) => ({ value: k, label: t(`students.filters.financialOptions.${k}`) }))}
            onChange={(v) => setFilter("financial", v)} onClear={() => setFilter("financial", "")}
          />
        </Box>

        <Box sx={filterCell(90)}>
          <DropdownFilter
            label={t("students.filters.byTags")}
            value={filters.tags}
            options={(tagOptions ?? []).map((tag) => ({ value: tag.id, label: tag.name }))}
            onChange={(v) => setFilter("tags", v)}
            onClear={() => setFilter("tags", "")}
          />
        </Box>

        {/* No externalId field exists on students in the backend yet —
            same reasoning as the Tags box above. */}
        <Box sx={filterCell(100)}>
          <TextFilterInput
            placeholder={t("students.filters.externalId")}
            value="" onChange={() => {}} disabled
            disabledTitle={t("students.filters.externalIdUnavailable")}
          />
        </Box>

        <Box sx={filterCell(100)}>
          <TextFilterInput
            placeholder={t("students.filters.groupCount")}
            value={filters.groupCount}
            onChange={(v) => setFilter("groupCount", v.replace(/[^0-9]/g, ""))}
            type="number"
          />
        </Box>

        <Box sx={filterCell(155)}>
          <DateFilterInput
            placeholder={t("students.filters.fromCreated")}
            value={filters.fromCreated}
            onChange={(v) => setFilter("fromCreated", v)}
          />
        </Box>

        <Box sx={filterCell(155)}>
          <DateFilterInput
            placeholder={t("students.filters.toCreatedDate")}
            value={filters.toCreatedDate}
            onChange={(v) => setFilter("toCreatedDate", v)}
          />
        </Box>

        {hasFilters && (
          <Button
            size="small" startIcon={<IoClose />} onClick={clearAll} variant="outlined"
            sx={{ height: CONTROL_H, borderRadius: "6px", borderColor: "var(--color-border)", color: "var(--color-text-secondary)", fontSize: 12, px: 1.5, textTransform: "none", whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {t("students.filters.clearAll")}
          </Button>
        )}
      </Box>

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
            options={TEACHERS_LIST}
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
        <TableContainer sx={{ opacity: isListRefreshing ? 0.6 : 1, transition: "opacity 0.15s" }}>
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
              {pageRows.map((s, i) => {
                const badge      = BADGE_COLORS[s.groupBadgeColor] ?? BADGE_COLORS.blue;
                const isSelected = selected.includes(s.uid);
                // List rows only carry the group's name — course and lesson time come from GET /groups.
                const rowGroup  = groupById.get(rawById.get(s.uid)?.groups?.[0]?.id ?? "");
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
                        <Avatar sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 700, bgcolor: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}>
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
                          {rowGroup?.course?.name && (
                            <Chip
                              label={rowGroup.course.name} size="small"
                              sx={{ fontSize: 10, height: 20, fontWeight: 600, bgcolor: badge.bg, color: badge.color, borderRadius: "4px" }}
                            />
                          )}
                          <Typography fontSize={13} color="var(--color-text-secondary)">{s.groupName}</Typography>
                          {rowGroup?.time && <Typography fontSize={12} color="var(--color-text-muted)">({rowGroup.time})</Typography>}
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
                    {col("comment") && (
                      <TableCell sx={{ minWidth: 160, maxWidth: 260 }}>
                        {s.comment ? (
                          <Tooltip title={<span style={{ whiteSpace: "pre-wrap" }}>{s.comment}</span>} arrow placement="top">
                            <Typography
                              fontSize={13}
                              color="var(--color-text-secondary)"
                              sx={{
                                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                                overflow: "hidden", wordBreak: "break-word", whiteSpace: "pre-wrap",
                              }}
                            >
                              {s.comment}
                            </Typography>
                          </Tooltip>
                        ) : null}
                      </TableCell>
                    )}

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
                        <MenuItem onClick={() => { setActionMenu(null); setActionError(null); setArchiveReasonId(""); setArchiveComment(""); setArchiveUid(s.uid); }} sx={{ fontSize: 13, gap: 1.2, py: 1.2, color: "var(--color-danger)" }}>
                          <MdDelete size={16} /> {t("students.actions.archive")}
                        </MenuItem>
                      </Menu>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!isListLoading && pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 6, color: "var(--color-text-muted)" }}>
                    {t("students.table.noStudentsFound")}
                  </TableCell>
                </TableRow>
              )}
              {isListLoading && (
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
            {hasData
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
              disabled={!hasData || page >= pageMeta.totalPages}
              onClick={() => setPage((p) => (hasData && p < pageMeta.totalPages ? p + 1 : p))}
              sx={{ minWidth: 32, px: 1, borderColor: "var(--color-border)", color: "var(--color-text-secondary)", borderRadius: "6px", fontSize: 13 }}
            >
              {">"}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* ── MODALS & DRAWERS ─────────────────────────────── */}

      <AddStudent open={addStudentOpen} onClose={() => setAddStudentOpen(false)} />
      <AddPayment
        open={addPaymentOpen}
        onClose={() => setAddPaymentOpen(false)}
        lockedStudent={activeStudent ? {
          id: activeStudent.uid,
          name: activeStudent.name,
          phone: activeStudent.phone,
          balance: activeStudent.balance,
        } : undefined}
      />

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
        studentIds={selected}
      />

      {/* Delete/archive dialog — optional reason + an "Archive" vs "Delete
          student" toggle (RemoveStudentDialog, shared with SingleGroup).
          Archive: memberships ended + POST /students/{id}/status -> INACTIVE
          (reason recorded, shows up on the Archive page). Delete: the same,
          then DELETE /students/{id} (see useArchiveStudent). */}
      <RemoveStudentDialog
        open={Boolean(archiveUid)}
        onClose={resetArchiveState}
        onConfirm={handleArchiveConfirm}
        reasonId={archiveReasonId}
        onReasonIdChange={setArchiveReasonId}
        reasons={reasonOptions ?? []}
        comment={archiveComment}
        onCommentChange={setArchiveComment}
        recalculate={false}
        onRecalculateChange={() => {}}
        scope="all"
        onScopeChange={() => {}}
        showGroupScope={false}
        archiveLabel={t("students.removeDialog.archiveLabel")}
        showDeleteToggle
        deleteMode={archiveDeleteMode}
        onDeleteModeChange={setArchiveDeleteMode}
        loading={isArchiving}
      />

      {/* Bulk archive confirm — same archive flow (memberships ended, then account archived) for every selected row */}
      <Dialog open={bulkDeleteConfirmOpen} onClose={() => setBulkDeleteConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{t("students.archiveDialog.title")}</DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color="text.secondary">{t("students.archiveDialog.message")}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBulkDeleteConfirmOpen(false)} disabled={isArchiving} sx={{ color: "var(--color-text-secondary)" }}>{t("students.archiveDialog.cancel")}</Button>
          <Button variant="contained" color="error" disabled={isArchiving} onClick={handleBulkDeleteConfirm} sx={{ borderRadius: 2 }}>{t("students.archiveDialog.confirm")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};