// src/pages/groups/Groups.tsx
// Branch filtering useBranch() orqali avtomatik ishlaydi

import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, IconButton, Menu, MenuItem, Paper, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
  TextField, Tooltip, Typography, Drawer,
} from "@mui/material";
import { GoPlus }                        from "react-icons/go";
import { MdEdit, MdDelete }              from "react-icons/md";
import { BsThreeDotsVertical }           from "react-icons/bs";
import { PiMicrosoftExcelLogoFill }      from "react-icons/pi";
import { IoClose }                       from "react-icons/io5";
import { TbAdjustmentsHorizontal, TbColumns3, TbCalendar } from "react-icons/tb";
import { HiChevronDown }                 from "react-icons/hi";
import { useMemo, useRef, useState }     from "react";
import * as XLSX                         from "xlsx";
import { useNavigate }                   from "react-router-dom";
import { useTranslation }                from "react-i18next";

import {
  useAllGroupsQuery, useCreateGroupMutation, useUpdateGroupMutation, useDeleteGroupMutation,
} from "../../app/api/groupsApi";
import type { Group, GroupDay } from "../../app/api/groupsApi/types";
import { useAllCoursesQuery } from "../../app/api/coursesApi";
import { useAllRoomsQuery } from "../../app/api/roomsApi";
import { useAllBranchesQuery } from "../../app/api/branchesApi";
import { useAllStudentsQuery } from "../../app/api/studentsApi";
import { useBranch } from "../../Context/BranchContext";
import { useToast } from "../../Context/ToastContext";

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
  roomId: string;
  days: GroupDay[];
  weekOfStudy: string;
  trainingStart: string;
  trainingEnd: string;
  studentIds: string[];
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
  name: "", courseId: "", roomId: "", days: [],
  weekOfStudy: "", trainingStart: "", trainingEnd: "", studentIds: [],
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
const formatDate = (d: string) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}.${m}.${y}`;
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
  teacherNames: g.teachers?.map((t) => t.name) ?? [],
  teacher: g.teachers?.map((t) => t.name).join(", ") || "—",
  days: g.daysType === "EVEN" ? "Even days" : g.daysType === "ODD" ? "Odd days" : (g.daysType || "—"),
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
}
const DropdownFilter = ({ label, value, options, onChange, onClear }: DropdownProps) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  return (
    <>
      <Button
        variant="outlined"
        size="small"
        endIcon={!value ? <HiChevronDown /> : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          borderRadius: "8px",
          borderColor: value ? "primary.main" : "#d0d5dd",
          color: value ? "primary.main" : "#667085",
          bgcolor: value ? "#eff8ff" : "white",
          fontWeight: 400, fontSize: 13, px: 1.5, py: 0.75,
          textTransform: "none",
          "&:hover": { borderColor: "primary.main", bgcolor: "#eff8ff" },
        }}
      >
        {value ? (
          <Stack direction="row" alignItems="center" gap={0.5}>
            <span>{options.find((o) => o.value === value)?.label || value}</span>
            <IoClose size={14} onClick={(e) => { e.stopPropagation(); onClear?.(); }} />
          </Stack>
        ) : label}
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 160, mt: 0.5 } }}
      >
        {options.map((o) => (
          <MenuItem
            key={o.value}
            selected={value === o.value}
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

/* ─── DateFilter ─────────────────────────────────────────── */
interface DateFilterProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
}
const DateFilter = ({ label, value, onChange, onClear }: DateFilterProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={<TbCalendar size={14} />}
      onClick={() => inputRef.current?.showPicker()}
      sx={{
        borderRadius: "8px",
        borderColor: value ? "primary.main" : "#d0d5dd",
        color: value ? "primary.main" : "#667085",
        bgcolor: value ? "#eff8ff" : "white",
        fontSize: 13, fontWeight: 400, px: 1.5,
        textTransform: "none",
        position: "relative",
        "&:hover": { borderColor: "primary.main", bgcolor: "#eff8ff" },
      }}
    >
      {value ? (
        <Stack direction="row" alignItems="center" gap={0.5}>
          <span>{formatDate(value)}</span>
          <IoClose
            size={14}
            onClick={(e) => { e.stopPropagation(); onClear(); }}
          />
        </Stack>
      ) : label}
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
      />
    </Button>
  );
};

/* ─── Groups ─────────────────────────────────────────────── */
export const Groups = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  const { branch: selectedBranch, branchLabel } = useBranch();

  const { data: groupsData, isLoading: groupsLoading, isError: groupsError } = useAllGroupsQuery({ page: 1, limit: 100 });
  const { data: coursesData } = useAllCoursesQuery();
  const { data: roomsData } = useAllRoomsQuery();
  const { data: branchesData } = useAllBranchesQuery();
  const { data: studentsData } = useAllStudentsQuery({ page: 1, limit: 100 });

  const [createGroup, { isLoading: isCreating }] = useCreateGroupMutation();
  const [updateGroup, { isLoading: isUpdating }] = useUpdateGroupMutation();
  const [deleteGroup, { isLoading: isDeleting }] = useDeleteGroupMutation();

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
  const allStudents = studentsData?.data ?? [];

  const COURSES  = [...new Set(allGroups.map((g) => g.course).filter(Boolean))];
  const TEACHERS = [...new Set(allGroups.flatMap((g) => g.teacherNames))];
  const DAY_OPTIONS = useMemo(
    () => [...new Set(allGroups.map((g) => g.days).filter(Boolean))].map((d) => ({ value: d, label: d })),
    [allGroups]
  );
  const STATUS_OPTIONS = useMemo(
    () => [...new Set(allGroups.map((g) => g.status).filter(Boolean))].map((s) => ({ value: s, label: STATUS_LABELS[s] ?? s })),
    [allGroups] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [open,              setOpen]              = useState(false);
  const [editingId,         setEditingId]         = useState<string | null>(null);
  const [form,              setForm]              = useState<FormState>(EMPTY_FORM);
  const [formErrors,        setFormErrors]        = useState<{ name?: string; course?: string }>({});
  const [saveError,         setSaveError]         = useState<string | null>(null);
  const [deleteId,          setDeleteId]          = useState<string | null>(null);
  const [deleteError,       setDeleteError]       = useState<string | null>(null);
  const [actionMenuAnchor,  setActionMenuAnchor]  = useState<{ el: HTMLElement; id: string } | null>(null);
  const [sortKey,           setSortKey]           = useState<SortKey>("");
  const [sortDir,           setSortDir]           = useState<SortDir>("asc");
  const [visibleCols,       setVisibleCols]       = useState<string[]>(ALL_COLUMNS.map((c) => c.key));
  const [columnsAnchor,     setColumnsAnchor]     = useState<null | HTMLElement>(null);
  const [filters,           setFilters]           = useState<Filters>({
    status: "", teacher: "", course: "", days: "", tags: [], startDate: "", endDate: "",
  });

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

  const handleExportExcel = () => {
    const data = filteredGroups.map((g, i) => ({
      [t("groups.export.number")]:    i + 1,
      [t("groups.export.group")]:     g.name,
      [t("groups.export.course")]:    g.course,
      [t("groups.export.teacher")]:   g.teacher,
      [t("groups.export.days")]:      g.days,
      [t("groups.export.startDate")]: formatDate(g.startDate),
      [t("groups.export.endDate")]:   formatDate(g.endDate),
      [t("groups.export.room")]:      g.room,
      [t("groups.export.students")]:  g.studentCount,
      [t("groups.export.status")]:    STATUS_LABELS[g.status] ?? g.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Groups");
    XLSX.writeFile(wb, "groups.xlsx");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleDay = (day: GroupDay) =>
    setForm((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }));

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSaveError(null);
    setOpen(true);
  };

  const handleOpenEdit = (group: GroupRow) => {
    setEditingId(group.id);
    setForm({
      name: group.name,
      courseId: group.courseId,
      roomId: group.roomId,
      days: group.dayList,
      weekOfStudy: group.weekOfStudy,
      trainingStart: group.startDate,
      trainingEnd: group.endDate,
      studentIds: group.studentIds,
    });
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
      roomId: form.roomId || undefined,
      days: form.days.length ? form.days : undefined,
      weekOfStudy: form.weekOfStudy.trim() || undefined,
      trainingStart: form.trainingStart || undefined,
      trainingEnd: form.trainingEnd || undefined,
      studentIds: form.studentIds.length ? form.studentIds : undefined,
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
    } catch {
      setSaveError(t("groups.form.errors.save"));
      toast.error(t("groups.form.errors.save"));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleteError(null);
    try {
      await deleteGroup(deleteId).unwrap();
      setDeleteId(null);
      toast.success(t("groups.toast.deleted"));
    } catch {
      setDeleteError(t("groups.deleteDialog.error"));
      toast.error(t("groups.deleteDialog.error"));
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

      {/* FILTERS */}
      <Stack direction="row" flexWrap="wrap" gap={1} mb={1}>
        <DropdownFilter
          label={t("groups.filters.status")}
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(v) => setFilter("status", v)}
          onClear={() => setFilter("status", "")}
        />
        <DropdownFilter
          label={t("groups.filters.teacher")}
          value={filters.teacher}
          options={TEACHERS.map((tc) => ({ value: tc, label: tc }))}
          onChange={(v) => setFilter("teacher", v)}
          onClear={() => setFilter("teacher", "")}
        />
        <DropdownFilter
          label={t("groups.filters.courses")}
          value={filters.course}
          options={COURSES.map((c) => ({ value: c, label: c }))}
          onChange={(v) => setFilter("course", v)}
          onClear={() => setFilter("course", "")}
        />
        <DropdownFilter
          label={t("groups.filters.days")}
          value={filters.days}
          options={
            DAY_OPTIONS.length > 0
              ? DAY_OPTIONS
              : [
                  { value: "Odd days",  label: t("groups.options.days.odd") },
                  { value: "Even days", label: t("groups.options.days.even") },
                ]
          }
          onChange={(v) => setFilter("days", v)}
          onClear={() => setFilter("days", "")}
        />
        <DropdownFilter
          label={t("groups.filters.tags")}
          value={filters.tags[0] || ""}
          options={TAGS.map((tag) => ({ value: tag, label: TAG_LABELS[tag] ?? tag }))}
          onChange={(v) => setFilter("tags", [v])}
          onClear={() => setFilter("tags", [])}
        />
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
      </Stack>

      {hasActiveFilters && (
        <Box mb={1}>
          <Button
            size="small"
            startIcon={<IoClose />}
            onClick={clearAllFilters}
            variant="outlined"
            sx={{
              borderRadius: "8px", borderColor: "#d0d5dd", color: "#667085",
              fontSize: 12, fontWeight: 400, px: 1.5, textTransform: "none",
            }}
          >
            {t("groups.filters.clearAll")}
          </Button>
        </Box>
      )}

      <Stack direction="row" justifyContent="flex-end" gap={1} mb={1.5}>
        <Button
          size="small"
          startIcon={<TbAdjustmentsHorizontal size={15} />}
          variant="outlined"
          sx={{
            borderRadius: "8px", borderColor: "#d0d5dd", color: "#667085",
            fontSize: 12, fontWeight: 500, px: 1.5, textTransform: "none",
          }}
        >
          {t("groups.filters.filtersButton")}
        </Button>
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
      <Paper sx={{ borderRadius: 3, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
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
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    fontWeight: 600, fontSize: 13, color: "#374151",
                    py: 1.5, borderBottom: "1px solid #e5e7eb", bgcolor: "white",
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
                    "& td": { borderBottom: "1px solid #f3f4f6", py: 1.8, fontSize: 13 },
                    "&:last-child td": { borderBottom: "none" },
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
                      <Box>{formatDate(g.startDate)} —</Box>
                      <Box>{formatDate(g.endDate)}</Box>
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
                      <Divider sx={{ my: 0.5 }} />
                      <MenuItem
                        onClick={() => { setDeleteId(g.id); setDeleteError(null); setActionMenuAnchor(null); }}
                        sx={{ fontSize: 13, gap: 1, color: "#ef4444" }}
                      >
                        <MdDelete size={15} /> {t("groups.actions.delete")}
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
      </Paper>

      {/* EXCEL */}
      <Tooltip title={t("groups.actions.exportExcel")} placement="left">
        <IconButton
          onClick={handleExportExcel}
          sx={{
            position: "fixed", bottom: 28, right: 28,
            bgcolor: "white", color: "#217346",
            width: 40, height: 40,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            border: "1px solid #e5e7eb",
            "&:hover": { bgcolor: "#f0fdf4" },
          }}
        >
          <PiMicrosoftExcelLogoFill size={20} />
        </IconButton>
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
              onChange={handleChange}
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

          {/* Select room */}
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

          {/* Days */}
          <Box mb={2.5}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.days")}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {WEEKDAY_VALUES.map((day) => (
                <Chip
                  key={day}
                  label={WEEKDAY_LABELS[day]}
                  clickable
                  size="small"
                  onClick={() => toggleDay(day)}
                  sx={{
                    fontSize: 12, height: 28, borderRadius: "6px",
                    bgcolor:     form.days.includes(day) ? "#dbeafe" : "white",
                    color:       form.days.includes(day) ? "#1d4ed8" : "#374151",
                    border:      "1px solid",
                    borderColor: form.days.includes(day) ? "#93c5fd" : "#d0d5dd",
                    "&:hover": {
                      bgcolor:     form.days.includes(day) ? "#bfdbfe" : "#f9fafb",
                      borderColor: form.days.includes(day) ? "#60a5fa" : "#a0aec0",
                    },
                  }}
                />
              ))}
            </Stack>
          </Box>

          {/* Week of study */}
          <Box mb={2.5}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.weekOfStudy")}
            </Typography>
            <TextField
              name="weekOfStudy"
              value={form.weekOfStudy}
              onChange={handleChange}
              size="small"
              fullWidth
              placeholder="3 months 0 weeks"
              sx={inputSx}
            />
          </Box>

          {/* Training start date */}
          <Box mb={2.5}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.trainingStart")}
            </Typography>
            <TextField
              type="date"
              name="trainingStart"
              value={form.trainingStart}
              onChange={handleChange}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={inputSx}
            />
          </Box>

          {/* Training end date */}
          <Box mb={2.5}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.trainingEnd")}
            </Typography>
            <TextField
              type="date"
              name="trainingEnd"
              value={form.trainingEnd}
              onChange={handleChange}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={inputSx}
            />
          </Box>

          {/* Students */}
          <Box mb={3}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.students")}
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              SelectProps={{
                multiple: true,
                value: form.studentIds,
                onChange: (e) => setForm((p) => ({ ...p, studentIds: e.target.value as string[] })),
                renderValue: (selected) =>
                  (selected as string[])
                    .map((id) => allStudents.find((s) => s.id === id)?.name ?? id)
                    .join(", "),
              }}
              sx={inputSx}
            >
              {allStudents.map((s) => (
                <MenuItem key={s.id} value={s.id} sx={{ fontSize: 13 }}>{s.name}</MenuItem>
              ))}
            </TextField>
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

      {/* DELETE DIALOG */}
      <Dialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{t("groups.deleteDialog.title")}</DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color="text.secondary">
            {t("groups.deleteDialog.body")}
          </Typography>
          {deleteError && (
            <Typography fontSize={13} color="error" mt={1.5}>{deleteError}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteId(null)} disabled={isDeleting} sx={{ color: "#667085" }}>{t("groups.deleteDialog.cancel")}</Button>
          <Button
            variant="contained"
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={handleDeleteConfirm}
            sx={{ borderRadius: 2 }}
          >
            {t("groups.deleteDialog.confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
