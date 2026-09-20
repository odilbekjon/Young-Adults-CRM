// src/pages/groups/Groups.tsx
// Branch filtering useBranch() orqali avtomatik ishlaydi

import {
  Box, Button, Chip, CircularProgress,
  Divider, IconButton, Menu, MenuItem, Paper, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
  TextField, Tooltip, Typography, Drawer,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import { GoPlus }                        from "react-icons/go";
import { MdEdit, MdSms, MdUnarchive, MdDelete } from "react-icons/md";
import { BsThreeDotsVertical }           from "react-icons/bs";
import { PiMicrosoftExcelLogoFill }      from "react-icons/pi";
import { IoClose }                       from "react-icons/io5";
import { TbAdjustmentsHorizontal, TbColumns3, TbCalendar } from "react-icons/tb";
import { HiChevronDown }                 from "react-icons/hi";
import { useEffect, useMemo, useRef, useState }     from "react";
import { useNavigate }                   from "react-router-dom";
import { useTranslation }                from "react-i18next";
import { useSelector }                   from "react-redux";

import {
  useAllGroupsQuery, useCreateGroupMutation, useUpdateGroupMutation,
  useToggleGroupStatusMutation, useLazyGroupsExcelQuery,
} from "../../app/api/groupsApi";
import type { Group, GroupDay } from "../../app/api/groupsApi/types";
import { useAllCoursesQuery } from "../../app/api/coursesApi";
import { useAllRoomsQuery } from "../../app/api/roomsApi";
import { useAllBranchesQuery } from "../../app/api/branchesApi";
import { useTeachersSelectQuery } from "../../app/api/teachersApi";
import type { RootState } from "../../app/store";
import { useBranch } from "../../Context/BranchContext";
import { useToast } from "../../Context/ToastContext";
import { Calendar } from "../SingleGroup/Calendar";
import { DatePickerField } from "../SingleGroup/DatePickerField";
import { TimeSelectField } from "../SingleGroup/TimeSelectField";
import { SendSmsModal } from "../../components/SendSmsModal/SendSmsModal";
import { extractApiError, formatTrainingDate, addMonthsToIsoDate, classifyDays, classifyDayList, DAYS_PRESETS } from "../../utils";

/* ─── types ─────────────────────────────────────────────── */
type SortKey = keyof GroupRow | "";
type SortDir = "asc" | "desc";

interface GroupRow {
  id: string;
  name: string;
  courseId: string;
  course: string;
  roomId: string;
  room: string;
  teacherIds: string[];
  teacherNames: string[];
  teacher: string;
  days: string;
  dayList: GroupDay[];
  lessonStartTime: string;
  weekOfStudy: string;
  startDate: string;
  endDate: string;
  studentCount: number;
  studentIds: string[];
  status: string;
  tags: string[];
  createdAt: string;
}

interface Filters {
  status: string;
  teacher: string;
  course: string;
  days: string;
  tags: string[];
  startDate: string;
  endDate: string;
}

interface FormState {
  name: string;
  courseId: string;
  teacherIds: string[];
  roomId: string;
  days: GroupDay[];
  time: string;
  trainingStart: string;
  trainingEnd: string;
}

/* ─── static ─────────────────────────────────────────────── */
const TAGS = ["New", "Popular", "VIP", "Trial"];
const WEEKDAY_VALUES: GroupDay[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const ALL_COLUMNS = [
  { key: "course",       label: "Course" },
  { key: "teacher",      label: "Teacher" },
  { key: "days",         label: "Days" },
  { key: "training",     label: "Training dates" },
  { key: "week",         label: "Week of study" },
  { key: "room",         label: "Room" },
  { key: "tags",         label: "Tags" },
  { key: "studentCount", label: "Students" },
];

const EMPTY_FORM: FormState = {
  name: "", courseId: "", teacherIds: [], roomId: "", days: [],
  time: "", trainingStart: "", trainingEnd: "",
};

/* ─── shared input sx ────────────────────────────────────── */
const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "6px",
    fontSize: 13,
    bgcolor: "white",
    "& fieldset": { borderColor: "#d0d5dd" },
    "&:hover fieldset": { borderColor: "#a0aec0" },
    "&.Mui-focused fieldset": { borderColor: "#5c7fa3" },
  },
};

/* ─── helpers ────────────────────────────────────────────── */
// GroupRow.days holds a display string ("Even days"/"Odd days") or the raw
// daysType value itself (MIXED/OTHER) — map it back to the backend's
// daysType enum for the GET /groups/excel filter. Unrecognized values are
// dropped rather than guessed.
const toDaysType = (days: string): string | undefined => {
  if (days === "Even days") return "EVEN";
  if (days === "Odd days") return "ODD";
  if (days === "MIXED" || days === "OTHER") return days;
  // "Weekend days"/"Every day"/"Other" are derived client-side from the
  // concrete day list (see classifyDays) — the backend's daysType enum has
  // no equivalent value for them, so no daysType filter is sent for GET
  // /groups/excel in that case (other filters, e.g. status/date, still apply).
  return undefined;
};

const deriveTags = (g: Group): string[] => {
  const tags: string[] = [];
  const studentCount = g.students?.length ?? 0;
  const isNew = g.createdAt && Date.now() - new Date(g.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000;
  if (isNew)                tags.push("New");
  if (studentCount >= 8)    tags.push("Popular");
  if (studentCount >= 10)   tags.push("VIP");
  if (studentCount <= 4)    tags.push("Trial");
  return [...new Set(tags)];
};

const toGroupRow = (g: Group): GroupRow => ({
  id: g.id,
  name: g.name,
  courseId: g.courseId,
  course: g.course?.name ?? "—",
  roomId: g.roomId ?? "",
  room: g.room?.name ?? "—",
  teacherIds: g.teachers?.map((t) => t.id) ?? [],
  teacherNames: g.teachers?.map((t) => t.name) ?? [],
  teacher: g.teachers?.map((t) => t.name).join(", ") || "—",
  days: classifyDays(g.daysType, g.days ?? []),
  dayList: g.days ?? [],
  lessonStartTime: g.time ?? "",
  weekOfStudy: g.weekOfStudy ?? "",
  startDate: g.trainingStart ?? "",
  endDate: g.trainingEnd ?? "",
  studentCount: g.students?.length ?? 0,
  studentIds: g.students?.map((s) => s.id) ?? [],
  status: g.status,
  tags: deriveTags(g),
  createdAt: g.createdAt,
});

const matchesFilters = (g: GroupRow, filters: Filters): boolean => {
  if (filters.status  && g.status !== filters.status) return false;
  if (filters.teacher && !g.teacherNames.includes(filters.teacher)) return false;
  if (filters.course  && g.course !== filters.course)  return false;
  if (filters.days    && g.days   !== filters.days)     return false;
  if (filters.tags.length > 0 && !filters.tags.some((t) => g.tags.includes(t))) return false;
  if (filters.startDate && g.startDate && g.startDate < filters.startDate) return false;
  if (filters.endDate   && g.endDate   && g.endDate   > filters.endDate)   return false;
  return true;
};

/* ─── DropdownFilter ─────────────────────────────────────── */
interface DropdownProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  onClear?: () => void;
  minWidth?: number;
}
const DropdownFilter = ({ label, value, options, onChange, onClear, minWidth = 200 }: DropdownProps) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);
  return (
    <>
      <Button
        variant="outlined"
        size="small"
        endIcon={<HiChevronDown style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          borderRadius: "8px",
          borderColor: value ? "primary.main" : "#d0d5dd",
          color: value ? "primary.main" : "#667085",
          bgcolor: value ? "#eff8ff" : "white",
          fontWeight: 400, fontSize: 13, px: 1.5, py: 0.9,
          minWidth, justifyContent: "space-between",
          textTransform: "none",
          "&:hover": { borderColor: "primary.main", bgcolor: "#eff8ff" },
        }}
      >
        {value ? (
          <Stack direction="row" alignItems="center" gap={0.5} flex={1} justifyContent="space-between">
            <span>{options.find((o) => o.value === value)?.label || value}</span>
            <IoClose size={14} onClick={(e) => { e.stopPropagation(); onClear?.(); }} />
          </Stack>
        ) : <span style={{ flex: 1, textAlign: "left" }}>{label}</span>}
      </Button>
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        PaperProps={{ sx: { borderRadius: 2, minWidth, mt: 0.5 } }}
      >
        {options.map((o) => (
          <MenuItem
            key={o.value}
            selected={value === o.value}
            onClick={() => { onChange(o.value); setAnchor(null); }}
            sx={{ fontSize: 13, fontWeight: value === o.value ? 700 : 400, color: value === o.value ? "primary.main" : "inherit" }}
          >
            {o.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

/* ─── DateFilter ─────────────────────────────────────────── */
interface DateFilterProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  minWidth?: number;
}
const DateFilter = ({ label, value, onChange, onClear, minWidth = 200 }: DateFilterProps) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <Button
        variant="outlined"
        size="small"
        startIcon={<TbCalendar size={14} />}
        onClick={() => setOpen((p) => !p)}
        sx={{
          borderRadius: "8px",
          borderColor: value ? "primary.main" : "#d0d5dd",
          color: value ? "primary.main" : "#667085",
          bgcolor: value ? "#eff8ff" : "white",
          fontSize: 13, fontWeight: 400, px: 1.5, py: 0.9,
          minWidth, justifyContent: "flex-start",
          textTransform: "none",
          position: "relative",
          "&:hover": { borderColor: "primary.main", bgcolor: "#eff8ff" },
        }}
      >
        {value ? (
          <Stack direction="row" alignItems="center" gap={0.5}>
            <span>{formatTrainingDate(value)}</span>
            <IoClose
              size={14}
              onClick={(e) => { e.stopPropagation(); onClear(); }}
            />
          </Stack>
        ) : label}
      </Button>
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 8px)", left: 0,
            width: 300, background: "#fff", border: "1px solid #eee",
            borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
            padding: 16, zIndex: 50,
          }}
        >
          <Calendar
            value={value ? new Date(`${value}T00:00:00`) : null}
            onChange={(d) => {
              const y = d.getFullYear();
              const m = (d.getMonth() + 1).toString().padStart(2, "0");
              const day = d.getDate().toString().padStart(2, "0");
              onChange(`${y}-${m}-${day}`);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

/* ─── Groups ─────────────────────────────────────────────── */
export const Groups = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  const { branch: selectedBranch, branchLabel } = useBranch();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const { data: groupsData, isLoading: groupsLoading, isError: groupsError } = useAllGroupsQuery({ page: 1, limit: 100 });
  const { data: coursesData } = useAllCoursesQuery();
  const { data: roomsData } = useAllRoomsQuery();
  const { data: branchesData } = useAllBranchesQuery();
  // GET /teachers/select — the dropdown-specific endpoint for group create/
  // edit's teacher picker (requires branchId; "all" when no branch is
  // active), distinct from GET /teachers used by the Teachers management
  // page. Using the management list here previously left the picker empty
  // because its client-side branch-name filter depended on a `branches`
  // shape that endpoint doesn't reliably return.
  const { data: teacherOptions } = useTeachersSelectQuery({ branchId: selectedBranchId ?? "all" });

  const [createGroup, { isLoading: isCreating }] = useCreateGroupMutation();
  const [updateGroup, { isLoading: isUpdating }] = useUpdateGroupMutation();
  const [toggleGroupStatus] = useToggleGroupStatusMutation();
  const [fetchGroupsExcel, { isFetching: isExportingExcel }] = useLazyGroupsExcelQuery();

  const WEEKDAY_LABELS: Record<GroupDay, string> = {
    MONDAY:    t("groups.weekdays.monday"),
    TUESDAY:   t("groups.weekdays.tuesday"),
    WEDNESDAY: t("groups.weekdays.wednesday"),
    THURSDAY:  t("groups.weekdays.thursday"),
    FRIDAY:    t("groups.weekdays.friday"),
    SATURDAY:  t("groups.weekdays.saturday"),
    SUNDAY:    t("groups.weekdays.sunday"),
  };

  const STATUS_LABELS: Record<string, string> = {
    ACTIVE:    t("groups.options.status.active"),
    ARCHIVE:   t("groups.options.status.archive"),
    COMPLETED: t("groups.options.status.completed"),
  };

  const TAG_LABELS: Record<string, string> = {
    New:     t("groups.options.tags.new"),
    Popular: t("groups.options.tags.popular"),
    VIP:     t("groups.options.tags.vip"),
    Trial:   t("groups.options.tags.trial"),
  };

  const FILTER_TOGGLES: { key: string; label: string }[] = [
    { key: "status",  label: t("groups.filters.panel.groupStatus") },
    { key: "teacher", label: t("groups.filters.panel.teachers") },
    { key: "course",  label: t("groups.filters.panel.courses") },
    { key: "days",    label: t("groups.filters.panel.days") },
    { key: "tags",    label: t("groups.filters.panel.tags") },
    { key: "date",    label: t("groups.filters.panel.date") },
  ];

  const COLUMN_LABELS: Record<string, string> = {
    course:       t("groups.table.course"),
    teacher:      t("groups.table.teacher"),
    days:         t("groups.table.days"),
    training:     t("groups.table.trainingDates"),
    week:         t("groups.table.weekOfStudy"),
    room:         t("groups.table.room"),
    tags:         t("groups.table.tags"),
    studentCount: t("groups.table.students"),
  };

  // Group javobida course/room ichida faqat branchId keladi (kengaytirilgan
  // branch obyekti yo'q), shu sabab filial nomini id orqali map qilamiz.
  const branchNameById = useMemo(
    () => Object.fromEntries((branchesData?.data ?? []).map((b) => [b.id, b.name])),
    [branchesData]
  );

  const branchFilteredGroups = useMemo(
    () => (groupsData?.data ?? []).filter((g) => {
      if (selectedBranch === "all") return true;
      const branchName = branchNameById[g.course?.branchId ?? ""] ?? (g.room ? branchNameById[g.room.branchId] : undefined);
      return branchName === selectedBranch;
    }),
    [groupsData, selectedBranch, branchNameById]
  );

  const allGroups: GroupRow[] = useMemo(
    () => branchFilteredGroups.map(toGroupRow),
    [branchFilteredGroups]
  );

  const activeCourses = (coursesData?.data ?? [])
    .filter((c) => c.status === "ACTIVE")
    .filter((c) => selectedBranch === "all" || c.branch?.name === selectedBranch);
  const activeRooms = (roomsData?.data ?? [])
    .filter((r) => r.status === "ACTIVE")
    .filter((r) => selectedBranch === "all" || r.branch?.name === selectedBranch);
  const activeTeachers = teacherOptions ?? [];

  const COURSES  = [...new Set(allGroups.map((g) => g.course).filter(Boolean))];
  const TEACHERS = [...new Set(allGroups.flatMap((g) => g.teacherNames))];
  const DAY_FILTER_OPTIONS = [
    { value: "Odd days",     label: t("groups.options.days.odd") },
    { value: "Even days",    label: t("groups.options.days.even") },
    { value: "Weekend days", label: t("groups.options.days.weekend") },
    { value: "Every day",    label: t("groups.options.days.every") },
    { value: "Other",        label: t("groups.options.days.other") },
  ];
  const STATUS_OPTIONS = useMemo(
    () => [...new Set(allGroups.map((g) => g.status).filter(Boolean))].map((s) => ({ value: s, label: STATUS_LABELS[s] ?? s })),
    [allGroups] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [open,              setOpen]              = useState(false);
  const [editingId,         setEditingId]         = useState<string | null>(null);
  const [form,              setForm]              = useState<FormState>(EMPTY_FORM);
  const [daysMode,          setDaysMode]          = useState<string>("");
  const [formErrors,        setFormErrors]        = useState<{ name?: string; course?: string }>({});
  const [saveError,         setSaveError]         = useState<string | null>(null);
  const [actionMenuAnchor,  setActionMenuAnchor]  = useState<{ el: HTMLElement; id: string } | null>(null);
  const [deleteConfirmId,   setDeleteConfirmId]   = useState<string | null>(null);
  const [smsGroupId,        setSmsGroupId]        = useState<string | null>(null);
  const [sortKey,           setSortKey]           = useState<SortKey>("");
  const [sortDir,           setSortDir]           = useState<SortDir>("asc");
  const [visibleCols,       setVisibleCols]       = useState<string[]>(ALL_COLUMNS.map((c) => c.key));
  const [columnsAnchor,     setColumnsAnchor]     = useState<null | HTMLElement>(null);
  const [filters,           setFilters]           = useState<Filters>({
    status: "", teacher: "", course: "", days: "", tags: [], startDate: "", endDate: "",
  });
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [visibleFilters,   setVisibleFilters]   = useState<string[]>(["status", "teacher", "course", "days", "tags", "date"]);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const clearAllFilters = () =>
    setFilters({ status: "", teacher: "", course: "", days: "", tags: [], startDate: "", endDate: "" });

  const hasActiveFilters = Object.values(filters).some((v) =>
    Array.isArray(v) ? v.length > 0 : Boolean(v)
  );

  const filteredGroups = useMemo(() => {
    const list = allGroups.filter((g) => matchesFilters(g, filters));
    if (!sortKey) return list;
    return [...list].sort((a, b) => {
      if (sortKey === "studentCount") {
        return sortDir === "asc" ? a.studentCount - b.studentCount : b.studentCount - a.studentCount;
      }
      const av = String(a[sortKey as keyof GroupRow] ?? "");
      const bv = String(b[sortKey as keyof GroupRow] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [allGroups, filters, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleExportExcel = async () => {
    // GET /groups/excel only accepts a status of ACTIVE/INACTIVE — the app's
    // own status domain (ACTIVE/ARCHIVE/COMPLETED) is wider, so only ACTIVE
    // is forwarded as-is; other selections are left unfiltered rather than
    // risking a 400 from an unsupported enum value.
    const courseId = activeCourses.find((c) => c.name === filters.course)?.id;
    const teacherId = activeTeachers.find((tc) => tc.name === filters.teacher)?.id;
    try {
      const blob = await fetchGroupsExcel({
        status: filters.status === "ACTIVE" ? filters.status : undefined,
        branchId: selectedBranchId ?? undefined,
        courseId,
        teacherId,
        daysType: filters.days ? toDaysType(filters.days) : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        page: 1,
        // A large fixed limit instead of relying on `meta.total`/the on-screen
        // list (which is fetched with a hardcoded limit: 100) — this always
        // asks the backend for every matching record.
        limit: 1_000_000,
      }).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "groups.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("groups.actions.exportError"));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Course.months (duration in months) + trainingStart -> trainingEnd,
  // recomputed whenever either changes (course.months isn't guaranteed to be
  // set for every course — those quietly leave trainingEnd untouched rather
  // than clearing whatever the user may have entered manually).
  const recalcEndDate = (courseId: string, startDate: string) => {
    if (!startDate) return;
    const months = activeCourses.find((c) => c.id === courseId)?.months;
    if (!months) return;
    const end = addMonthsToIsoDate(startDate, months);
    if (end) setForm((prev) => ({ ...prev, trainingEnd: end }));
  };

  const handleCourseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const courseId = e.target.value;
    setForm((prev) => ({ ...prev, courseId }));
    recalcEndDate(courseId, form.trainingStart);
  };

  const handleStartDateChange = (iso: string) => {
    setForm((prev) => ({ ...prev, trainingStart: iso }));
    recalcEndDate(form.courseId, iso);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDaysMode("");
    setFormErrors({});
    setSaveError(null);
    setOpen(true);
  };

  const handleOpenEdit = (group: GroupRow) => {
    setEditingId(group.id);
    setForm({
      name: group.name,
      courseId: group.courseId,
      teacherIds: group.teacherIds,
      roomId: group.roomId,
      days: group.dayList,
      time: group.lessonStartTime,
      trainingStart: group.startDate,
      trainingEnd: group.endDate,
    });
    setDaysMode(classifyDayList(group.dayList));
    setFormErrors({});
    setSaveError(null);
    setOpen(true);
    setActionMenuAnchor(null);
  };

  const validate = () => {
    const errs: { name?: string; course?: string } = {};
    if (!form.name.trim()) errs.name = t("groups.form.errors.name");
    if (!form.courseId)    errs.course = t("groups.form.errors.course");
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaveError(null);
    const payload = {
      name: form.name.trim(),
      courseId: form.courseId,
      teacherIds: form.teacherIds.length ? form.teacherIds : undefined,
      roomId: form.roomId || undefined,
      days: form.days.length ? form.days : undefined,
      time: form.time || undefined,
      trainingStart: form.trainingStart || undefined,
      trainingEnd: form.trainingEnd || undefined,
    };
    try {
      if (editingId !== null) {
        await updateGroup({ id: editingId, ...payload }).unwrap();
        toast.success(t("groups.toast.updated"));
      } else {
        await createGroup(payload).unwrap();
        toast.success(t("groups.toast.created"));
      }
      setOpen(false);
    } catch (err) {
      const detail = extractApiError(err);
      console.error("Group save failed:", err);
      const message = detail ? `${t("groups.form.errors.save")}: ${detail}` : t("groups.form.errors.save");
      setSaveError(message);
      toast.error(message);
    }
  };

  // The active list's "Delete" is really an archive: PATCH
  // /groups/{id}/toggle-status (Swagger, same endpoint SingleGroup's own
  // "toggle status" button already uses) flips the group between ACTIVE and
  // ARCHIVE without touching its students/teachers/attendance. A real DELETE
  // /groups/{id} is not exposed from here — the backend rejects it outright
  // while any of those still reference the group, which is true for nearly
  // every real group.
  const handleToggleStatus = async (id: string) => {
    setActionMenuAnchor(null);
    try {
      await toggleGroupStatus(id).unwrap();
      toast.success(t("groups.toast.statusToggled"));
    } catch (err) {
      const detail = extractApiError(err);
      const message = detail ? `${t("groups.toast.statusToggleError")}: ${detail}` : t("groups.toast.statusToggleError");
      toast.error(message);
    }
  };

  const col = (key: string) => visibleCols.includes(key);

  /* ── UI ─────────────────────────────────────────────────── */
  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" alignItems="baseline" gap={1.5}>
          <Typography variant="h5" fontWeight={700} fontSize={26}>{t("groups.pageTitle")}</Typography>
          <Typography fontSize={14} color="text.secondary">
            {t("groups.summary", { branch: branchLabel, count: filteredGroups.length })}
          </Typography>
        </Stack>
        <Button
          startIcon={<GoPlus />}
          variant="contained"
          onClick={handleOpenAdd}
          sx={{
            borderRadius: "12px", px: 3, py: 1.2, fontWeight: 700, fontSize: 13,
            textTransform: "uppercase", letterSpacing: 0.5,
            bgcolor: "#1a3a4a", "&:hover": { bgcolor: "#122a38" }, boxShadow: "none",
          }}
        >
          {t("groups.actions.addNew")}
        </Button>
      </Stack>

      {/* FILTERS — always visible */}
      <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1.5} mb={1.5}>
        {visibleFilters.includes("status") && (
          <DropdownFilter
            label={t("groups.filters.status")}
            value={filters.status}
            options={STATUS_OPTIONS}
            onChange={(v) => setFilter("status", v)}
            onClear={() => setFilter("status", "")}
          />
        )}
        {visibleFilters.includes("teacher") && (
          <DropdownFilter
            label={t("groups.filters.teacher")}
            value={filters.teacher}
            options={TEACHERS.map((tc) => ({ value: tc, label: tc }))}
            onChange={(v) => setFilter("teacher", v)}
            onClear={() => setFilter("teacher", "")}
          />
        )}
        {visibleFilters.includes("course") && (
          <DropdownFilter
            label={t("groups.filters.courses")}
            value={filters.course}
            options={COURSES.map((c) => ({ value: c, label: c }))}
            onChange={(v) => setFilter("course", v)}
            onClear={() => setFilter("course", "")}
          />
        )}
        {visibleFilters.includes("days") && (
          <DropdownFilter
            label={t("groups.filters.days")}
            value={filters.days}
            options={DAY_FILTER_OPTIONS}
            onChange={(v) => setFilter("days", v)}
            onClear={() => setFilter("days", "")}
          />
        )}
        {visibleFilters.includes("tags") && (
          <DropdownFilter
            label={t("groups.filters.tags")}
            value={filters.tags[0] || ""}
            options={TAGS.map((tag) => ({ value: tag, label: TAG_LABELS[tag] ?? tag }))}
            onChange={(v) => setFilter("tags", [v])}
            onClear={() => setFilter("tags", [])}
          />
        )}
        {visibleFilters.includes("date") && (
          <>
            <DateFilter
              label={t("groups.filters.startDate")}
              value={filters.startDate}
              onChange={(v) => setFilter("startDate", v)}
              onClear={() => setFilter("startDate", "")}
            />
            <DateFilter
              label={t("groups.filters.endDate")}
              value={filters.endDate}
              onChange={(v) => setFilter("endDate", v)}
              onClear={() => setFilter("endDate", "")}
            />
          </>
        )}
        {hasActiveFilters && (
          <IconButton
            size="small"
            onClick={clearAllFilters}
            title={t("groups.filters.clearAll")}
            sx={{ border: "1px solid #d0d5dd", borderRadius: "8px", color: "#667085" }}
          >
            <IoClose size={16} />
          </IconButton>
        )}
      </Stack>

      {/* FILTERS / COLUMNS toolbar */}
      <Stack direction="row" justifyContent="flex-end" gap={1} mb={1.5}>
        <Box sx={{ position: "relative" }}>
          <Button
            size="small"
            startIcon={<TbAdjustmentsHorizontal size={15} />}
            variant="outlined"
            onClick={() => setShowFiltersPanel((p) => !p)}
            sx={{
              borderRadius: "8px",
              borderColor: showFiltersPanel ? "primary.main" : "#d0d5dd",
              color: showFiltersPanel ? "primary.main" : "#667085",
              bgcolor: showFiltersPanel ? "#eff8ff" : "white",
              fontSize: 12, fontWeight: 500, px: 1.5, textTransform: "none",
            }}
          >
            {t("groups.filters.filtersButton")}
          </Button>
          {showFiltersPanel && (
            <Paper
              variant="outlined"
              sx={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 20,
                borderRadius: 2, borderColor: "#e5e7eb", p: 2, width: 300,
                boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
              }}
            >
              <Typography fontWeight={600} fontSize={13} color="#344054" mb={1.5}>
                {t("groups.filters.filtersButton")}
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {FILTER_TOGGLES.map((f) => {
                  const checked = visibleFilters.includes(f.key);
                  return (
                    <Box
                      key={f.key}
                      onClick={() =>
                        setVisibleFilters((prev) =>
                          prev.includes(f.key) ? prev.filter((k) => k !== f.key) : [...prev, f.key]
                        )
                      }
                      sx={{
                        display: "flex", alignItems: "center", gap: 1, cursor: "pointer",
                        border: "1px solid", borderColor: checked ? "primary.main" : "#d0d5dd",
                        borderRadius: "8px", px: 1.2, py: 0.6, bgcolor: checked ? "#eff8ff" : "white",
                      }}
                    >
                      <Box
                        sx={{
                          width: 14, height: 14, borderRadius: 0.5, border: "2px solid",
                          borderColor: checked ? "primary.main" : "#d0d5dd",
                          bgcolor: checked ? "primary.main" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}
                      >
                        {checked && <Box sx={{ width: 7, height: 7, bgcolor: "white", borderRadius: 0.25 }} />}
                      </Box>
                      <Typography fontSize={12} color={checked ? "primary.main" : "#344054"}>{f.label}</Typography>
                    </Box>
                  );
                })}
              </Stack>
            </Paper>
          )}
        </Box>
        <Button
          size="small"
          startIcon={<TbColumns3 size={15} />}
          variant="outlined"
          onClick={(e) => setColumnsAnchor(e.currentTarget)}
          sx={{
            borderRadius: "8px", borderColor: "#d0d5dd", color: "#667085",
            fontSize: 12, fontWeight: 500, px: 1.5, textTransform: "none",
          }}
        >
          {t("groups.filters.columns")}
        </Button>
        <Menu
          anchorEl={columnsAnchor}
          open={Boolean(columnsAnchor)}
          onClose={() => setColumnsAnchor(null)}
          PaperProps={{ sx: { borderRadius: 2, minWidth: 160, mt: 0.5 } }}
        >
          {ALL_COLUMNS.map((c) => (
            <MenuItem
              key={c.key}
              onClick={() =>
                setVisibleCols((prev) =>
                  prev.includes(c.key)
                    ? prev.filter((k) => k !== c.key)
                    : [...prev, c.key]
                )
              }
              sx={{ fontSize: 13, gap: 1 }}
            >
              <Box
                sx={{
                  width: 16, height: 16, borderRadius: 0.5, border: "2px solid",
                  borderColor: visibleCols.includes(c.key) ? "primary.main" : "#d0d5dd",
                  bgcolor: visibleCols.includes(c.key) ? "primary.main" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                {visibleCols.includes(c.key) && (
                  <Box sx={{ width: 8, height: 8, bgcolor: "white", borderRadius: 0.25 }} />
                )}
              </Box>
              {COLUMN_LABELS[c.key] ?? c.label}
            </MenuItem>
          ))}
        </Menu>
      </Stack>

      {/* TABLE */}
      <Box>
        {groupsLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!groupsLoading && groupsError && (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography color="error" fontSize={14}>{t("groups.loadError")}</Typography>
          </Box>
        )}

        {!groupsLoading && !groupsError && (
        <TableContainer>
          <Table sx={{ borderCollapse: "separate", borderSpacing: "0 10px" }}>
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    fontWeight: 600, fontSize: 13, color: "#374151",
                    py: 1.5, border: "none",
                  },
                }}
              >
                <TableCell sx={{ width: 40 }} />
                <TableCell>
                  <TableSortLabel
                    active={sortKey === "name"}
                    direction={sortDir}
                    onClick={() => handleSort("name")}
                  >
                    {t("groups.table.group")}
                  </TableSortLabel>
                </TableCell>
                {col("course")       && <TableCell><TableSortLabel active={sortKey === "course"}       direction={sortDir} onClick={() => handleSort("course")}>{t("groups.table.course")}</TableSortLabel></TableCell>}
                {col("teacher")      && <TableCell><TableSortLabel active={sortKey === "teacher"}      direction={sortDir} onClick={() => handleSort("teacher")}>{t("groups.table.teacher")}</TableSortLabel></TableCell>}
                {col("days")         && <TableCell><TableSortLabel active={sortKey === "days"}         direction={sortDir} onClick={() => handleSort("days")}>{t("groups.table.days")}</TableSortLabel></TableCell>}
                {col("training")     && <TableCell><TableSortLabel active={sortKey === "startDate"}    direction={sortDir} onClick={() => handleSort("startDate")}>{t("groups.table.trainingDates")}</TableSortLabel></TableCell>}
                {col("week")         && <TableCell>{t("groups.table.weekOfStudy")}</TableCell>}
                {col("room")         && <TableCell>{t("groups.table.room")}</TableCell>}
                {col("tags")         && <TableCell>{t("groups.table.tags")}</TableCell>}
                {col("studentCount") && <TableCell><TableSortLabel active={sortKey === "studentCount"} direction={sortDir} onClick={() => handleSort("studentCount")}>{t("groups.table.students")}</TableSortLabel></TableCell>}
                <TableCell align="right">{t("groups.table.actions")}</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredGroups.map((g, i) => (
                <TableRow
                  key={g.id}
                  hover
                  onClick={() => navigate(`/groups/${g.id}`)}
                  sx={{
                    cursor: "pointer",
                    bgcolor: "white",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    "& td": { border: "none", py: 1.8, fontSize: 13 },
                    "& td:first-of-type": { borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
                    "& td:last-of-type": { borderTopRightRadius: 12, borderBottomRightRadius: 12 },
                    "&:hover": { bgcolor: "#f9fafb" },
                  }}
                >
                  <TableCell sx={{ color: "#9ca3af", fontSize: 12 }}>{i + 1}.</TableCell>
                  <TableCell sx={{ fontWeight: 500, color: "#111827" }}>{g.name}</TableCell>
                  {col("course")       && <TableCell>{g.course}</TableCell>}
                  {col("teacher")      && <TableCell>{g.teacher}</TableCell>}
                  {col("days")         && (
                    <TableCell>
                      <Box>{g.days}</Box>
                      <Box sx={{ color: "#9ca3af", fontSize: 12 }}>{g.lessonStartTime}</Box>
                    </TableCell>
                  )}
                  {col("training")     && (
                    <TableCell>
                      <Box>{formatTrainingDate(g.startDate)} —</Box>
                      <Box>{formatTrainingDate(g.endDate)}</Box>
                    </TableCell>
                  )}
                  {col("week")         && <TableCell>{g.weekOfStudy || "—"}</TableCell>}
                  {col("room")         && <TableCell>{g.room}</TableCell>}
                  {col("tags")         && (
                    <TableCell>
                      <Stack direction="row" flexWrap="wrap" gap={0.5}>
                        {g.tags.map((tag) => (
                          <Chip
                            key={tag} label={TAG_LABELS[tag] ?? tag} size="small"
                            sx={{ fontSize: 10, height: 20, bgcolor: "#f3f4f6", color: "#374151" }}
                          />
                        ))}
                      </Stack>
                    </TableCell>
                  )}
                  {col("studentCount") && <TableCell sx={{ fontWeight: 500 }}>{g.studentCount}</TableCell>}

                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      size="small"
                      onClick={(e) =>
                        setActionMenuAnchor(
                          actionMenuAnchor?.id === g.id
                            ? null
                            : { el: e.currentTarget, id: g.id }
                        )
                      }
                      sx={{ color: "#6b7280" }}
                    >
                      <BsThreeDotsVertical size={15} />
                    </IconButton>
                    <Menu
                      anchorEl={actionMenuAnchor?.id === g.id ? actionMenuAnchor.el : null}
                      open={actionMenuAnchor?.id === g.id}
                      onClose={() => setActionMenuAnchor(null)}
                      PaperProps={{
                        sx: { borderRadius: 2, minWidth: 130, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" },
                      }}
                      transformOrigin={{ horizontal: "right", vertical: "top" }}
                      anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                    >
                      <MenuItem onClick={() => handleOpenEdit(g)} sx={{ fontSize: 13, gap: 1 }}>
                        <MdEdit size={15} /> {t("groups.actions.edit")}
                      </MenuItem>
                      <MenuItem
                        onClick={() => { setSmsGroupId(g.id); setActionMenuAnchor(null); }}
                        sx={{ fontSize: 13, gap: 1 }}
                      >
                        <MdSms size={15} /> {t("groups.actions.sms")}
                      </MenuItem>
                      <Divider sx={{ my: 0.5 }} />
                      <MenuItem
                        onClick={() => {
                          if (g.status === "ACTIVE") {
                            setDeleteConfirmId(g.id);
                            setActionMenuAnchor(null);
                          } else {
                            handleToggleStatus(g.id);
                          }
                        }}
                        sx={{ fontSize: 13, gap: 1, color: g.status === "ACTIVE" ? "#d32f2f" : undefined }}
                      >
                        {g.status === "ACTIVE"
                          ? <><MdDelete size={15} /> {t("groups.deleteDialog.confirm")}</>
                          : <><MdUnarchive size={15} /> {t("groups.actions.activate")}</>}
                      </MenuItem>
                    </Menu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredGroups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 6, color: "#9ca3af" }}>
                    {t("groups.table.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        )}
      </Box>

      {/* EXCEL */}
      <Tooltip title={t("groups.actions.exportExcel")} placement="left">
        <span style={{ position: "fixed", bottom: 28, right: 28 }}>
          <IconButton
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            sx={{
              bgcolor: "white", color: "#217346",
              width: 40, height: 40,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              border: "1px solid #e5e7eb",
              "&:hover": { bgcolor: "#f0fdf4" },
            }}
          >
            {isExportingExcel ? <CircularProgress size={18} /> : <PiMicrosoftExcelLogoFill size={20} />}
          </IconButton>
        </span>
      </Tooltip>

      {/* ── DRAWER ───────────────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ sx: { width: 420, bgcolor: "#f8f9fa" } }}
      >
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: 3, py: 2.5, bgcolor: "white", borderBottom: "1px solid #eaecf0" }}
        >
          <Typography fontWeight={700} fontSize={17} color="#111827">
            {editingId !== null ? t("groups.form.editTitle") : t("groups.form.addTitle")}
          </Typography>
          <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: "#9ca3af" }}>
            <IoClose size={20} />
          </IconButton>
        </Stack>

        {/* Body */}
        <Box sx={{ px: 3, py: 3, overflowY: "auto", flex: 1 }}>

          {/* Name */}
          <Box mb={2.5}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.name")}
            </Typography>
            <TextField
              name="name"
              value={form.name}
              onChange={handleChange}
              size="small"
              fullWidth
              error={!!formErrors.name}
              helperText={formErrors.name}
              sx={inputSx}
            />
          </Box>

          {/* Select course */}
          <Box mb={2.5}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.course")}
            </Typography>
            <TextField
              select
              name="courseId"
              value={form.courseId}
              onChange={handleCourseChange}
              size="small"
              fullWidth
              error={!!formErrors.course}
              helperText={formErrors.course}
              sx={inputSx}
            >
              {activeCourses.map((c) => (
                <MenuItem key={c.id} value={c.id} sx={{ fontSize: 13 }}>{c.name}</MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Select teacher — single choice only, closes right after picking */}
          <Box mb={2.5}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.teacher")}
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={form.teacherIds[0] ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, teacherIds: e.target.value ? [e.target.value] : [] }))}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) =>
                  selected
                    ? activeTeachers.find((tc) => tc.id === selected)?.name ?? String(selected)
                    : <span style={{ color: "#9ca3af" }}>{t("groups.form.teacher")}</span>,
              }}
              sx={inputSx}
            >
              {activeTeachers.map((tc) => (
                <MenuItem key={tc.id} value={tc.id} sx={{ fontSize: 13 }}>{tc.name}</MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Days — quick presets (Odd/Even/Weekend/Every day), "Other" reveals the manual weekday picker */}
          <Box mb={2.5}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.days")}
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={daysMode}
              onChange={(e) => {
                const mode = e.target.value;
                setDaysMode(mode);
                if (mode !== "Other") setForm((p) => ({ ...p, days: DAYS_PRESETS[mode] ?? [] }));
              }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) =>
                  selected
                    ? DAY_FILTER_OPTIONS.find((o) => o.value === selected)?.label ?? String(selected)
                    : <span style={{ color: "#9ca3af" }}>{t("groups.form.days")}</span>,
              }}
              sx={inputSx}
            >
              {DAY_FILTER_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value} sx={{ fontSize: 13 }}>{o.label}</MenuItem>
              ))}
            </TextField>
            {daysMode === "Other" && (
              <TextField
                select
                fullWidth
                size="small"
                SelectProps={{
                  multiple: true,
                  value: form.days,
                  onChange: (e) => setForm((p) => ({ ...p, days: e.target.value as GroupDay[] })),
                  displayEmpty: true,
                  renderValue: (selected) =>
                    (selected as GroupDay[]).length
                      ? (selected as GroupDay[]).map((d) => WEEKDAY_LABELS[d]).join(", ")
                      : <span style={{ color: "#9ca3af" }}>{t("groups.form.days")}</span>,
                }}
                sx={{ ...inputSx, mt: 1 }}
              >
                {WEEKDAY_VALUES.map((day) => (
                  <MenuItem key={day} value={day} sx={{ fontSize: 13 }}>{WEEKDAY_LABELS[day]}</MenuItem>
                ))}
              </TextField>
            )}
          </Box>

          {/* Select room — edit only; not part of the fields a new group asks for */}
          {editingId !== null && (
            <Box mb={2.5}>
              <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
                {t("groups.form.room")}
              </Typography>
              <TextField
                select
                name="roomId"
                value={form.roomId}
                onChange={handleChange}
                size="small"
                fullWidth
                sx={inputSx}
              >
                <MenuItem value="" sx={{ fontSize: 13 }}>—</MenuItem>
                {activeRooms.map((r) => (
                  <MenuItem key={r.id} value={r.id} sx={{ fontSize: 13 }}>{r.name}</MenuItem>
                ))}
              </TextField>
            </Box>
          )}

          {/* Lesson start time — 08:00–20:00 in 1-hour steps */}
          <Box mb={2.5}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.lessonStartTime")}
            </Typography>
            <TimeSelectField
              value={form.time}
              onChange={(time) => setForm((p) => ({ ...p, time }))}
              placeholder={t("groups.form.noTimeSelected")}
            />
          </Box>

          {/* Group start date */}
          <Box mb={2.5}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.startDate")}
            </Typography>
            <DatePickerField
              value={form.trainingStart}
              onChange={handleStartDateChange}
              shortcuts
            />
          </Box>

          {/* Group end date — auto-filled from the selected course's
              duration (Course.months) once both a course and a start date
              are picked, but stays a normal editable field so it can still
              be overridden by hand; picking a different course or start
              date recomputes it again. */}
          <Box mb={2.5}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.endDate")}
            </Typography>
            <DatePickerField value={form.trainingEnd} onChange={(iso) => setForm((prev) => ({ ...prev, trainingEnd: iso }))} />
          </Box>

          {saveError && (
            <Typography fontSize={13} color="error" mb={2}>{saveError}</Typography>
          )}

          {/* Submit */}
          <Button
            fullWidth
            variant="contained"
            onClick={handleSave}
            disabled={isCreating || isUpdating}
            startIcon={(isCreating || isUpdating) ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              borderRadius: "20px", py: 1.2,
              fontWeight: 600, fontSize: 14,
              bgcolor: "#5c7fa3",
              "&:hover": { bgcolor: "#4a6a8a" },
              boxShadow: "none",
              textTransform: "none",
            }}
          >
            {t("groups.actions.submit")}
          </Button>
        </Box>
      </Drawer>

      {/* SMS DRAWER */}
      <SendSmsModal
        open={smsGroupId !== null}
        onClose={() => setSmsGroupId(null)}
        selectedCount={allGroups.find((g) => g.id === smsGroupId)?.studentCount ?? 0}
        recipientLabel={t("groups.sms.recipientLabel")}
        sender="3700"
      />

      {/* DELETE CONFIRM */}
      <Dialog open={deleteConfirmId !== null} onClose={() => setDeleteConfirmId(null)} PaperProps={{ sx: { borderRadius: 2, minWidth: 360 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{t("groups.deleteDialog.title")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">{t("groups.deleteDialog.body")}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setDeleteConfirmId(null)} sx={{ textTransform: "none", borderRadius: 1.5 }}>
            {t("groups.deleteDialog.cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (deleteConfirmId) handleToggleStatus(deleteConfirmId);
              setDeleteConfirmId(null);
            }}
            sx={{ textTransform: "none", borderRadius: 1.5 }}
          >
            {t("groups.deleteDialog.confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
