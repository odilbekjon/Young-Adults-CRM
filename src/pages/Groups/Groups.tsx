// src/pages/groups/Groups.tsx
// Branch filtering useBranch() orqali avtomatik ishlaydi

import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
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

import { TEACHERS_DATA, type Group }     from "../../constants/Teachers";
import { useBranch }                     from "../../Context/BranchContext";

/* ─── types ─────────────────────────────────────────────── */
type StatusType = "Active" | "Archive" | "Completed";
type SortKey    = keyof Group | "";
type SortDir    = "asc" | "desc";
type GroupRow   = Group & { status: StatusType; tags: string[] };

interface Filters {
  status: StatusType | "";
  teacher: string;
  course: string;
  days: string;
  tags: string[];
  startDate: string;
  endDate: string;
}

/* ─── static ─────────────────────────────────────────────── */
const TAGS = ["New", "Popular", "VIP", "Trial"];

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

const EMPTY_FORM: GroupRow = {
  id: 0, name: "", course: "", teacher: "", teacherId: 0,
  days: "", lessonStartTime: "", room: "", studentCount: 0,
  roomCapacity: 20, status: "Active", tags: [],
  startDate: "", endDate: "", badge: "", badgeColor: "blue",
  schedule: "", students: [],
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
const calcWeekOfStudy = (startDate: string) => {
  if (!startDate) return { months: "—", weeks: "" };
  const diffMs = Date.now() - new Date(startDate).getTime();
  if (diffMs < 0) return { months: "0 months", weeks: "0 weeks" };
  const totalDays = Math.floor(diffMs / 86_400_000);
  return {
    months: `${Math.floor(totalDays / 30)} months`,
    weeks:  `${Math.floor((totalDays % 30) / 7)} weeks`,
  };
};

const formatDate = (d: string) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
};

const deriveStatus = (g: Group): StatusType => {
  const today = new Date().toISOString().slice(0, 10);
  if (g.endDate && g.endDate < today) return "Completed";
  if (g.id % 4 === 0) return "Archive";
  return "Active";
};

const deriveTags = (g: Group): string[] => {
  const tags: string[] = [];
  if (g.badgeColor === "amber" || /new/i.test(g.badge)) tags.push("New");
  if (g.badgeColor === "green" || g.studentCount >= 8)  tags.push("Popular");
  if (g.studentCount >= 10)                              tags.push("VIP");
  if (g.studentCount <= 4)                               tags.push("Trial");
  return [...new Set(tags)];
};

const toGroupRow = (g: Group): GroupRow => ({
  ...g,
  status: deriveStatus(g),
  tags:   deriveTags(g),
});

const matchesFilters = (g: GroupRow, filters: Filters): boolean => {
  if (filters.status  && g.status  !== filters.status)  return false;
  if (filters.teacher && g.teacher !== filters.teacher) return false;
  if (filters.course  && g.course  !== filters.course)  return false;
  if (filters.days    && g.days    !== filters.days)     return false;
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

  const { groups: branchGroups, branchLabel } = useBranch();

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

  const COURSES  = [...new Set(branchGroups.map((g) => g.course).filter(Boolean))];
  const TEACHERS = [...new Set(branchGroups.map((g) => g.teacher).filter(Boolean))];
  const ROOMS    = [...new Set(branchGroups.map((g) => g.room).filter(Boolean))];
  const DAY_OPTIONS = useMemo(
    () => [...new Set(branchGroups.map((g) => g.days).filter(Boolean))].map((d) => ({ value: d, label: d })),
    [branchGroups]
  );

  const [localGroups,       setLocalGroups]       = useState<GroupRow[]>([]);
  const [open,              setOpen]              = useState(false);
  const [editingId,         setEditingId]         = useState<number | null>(null);
  const [form,              setForm]              = useState<GroupRow>(EMPTY_FORM);
  const [deleteId,          setDeleteId]          = useState<number | null>(null);
  const [actionMenuAnchor,  setActionMenuAnchor]  = useState<{ el: HTMLElement; id: number } | null>(null);
  const [sortKey,           setSortKey]           = useState<SortKey>("");
  const [sortDir,           setSortDir]           = useState<SortDir>("asc");
  const [visibleCols,       setVisibleCols]       = useState<string[]>(ALL_COLUMNS.map((c) => c.key));
  const [columnsAnchor,     setColumnsAnchor]     = useState<null | HTMLElement>(null);
  const [filters,           setFilters]           = useState<Filters>({
    status: "", teacher: "", course: "", days: "", tags: [], startDate: "", endDate: "",
  });

  const allGroups: GroupRow[] = useMemo(
    () => [...branchGroups.map(toGroupRow), ...localGroups],
    [branchGroups, localGroups]
  );

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
        const an = Number(a.studentCount) || 0;
        const bn = Number(b.studentCount) || 0;
        return sortDir === "asc" ? an - bn : bn - an;
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
      [t("groups.export.students")]: g.studentCount,
      [t("groups.export.status")]:   g.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Groups");
    XLSX.writeFile(wb, "groups.xlsx");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "studentCount" ? Number(value) : value }));
  };

  const handleTagToggle = (tag: string) =>
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));

  const handleOpenAdd  = () => { setEditingId(null); setForm(EMPTY_FORM); setOpen(true); };
  const handleOpenEdit = (group: GroupRow) => {
    setEditingId(group.id);
    setForm({ ...EMPTY_FORM, ...group });
    setOpen(true);
    setActionMenuAnchor(null);
  };

  const handleSave = () => {
    const teacher  = TEACHERS_DATA.find((t) => t.fullName === form.teacher);
    const newGroup: GroupRow = {
      ...form,
      teacherId: teacher?.id || 0,
      schedule:  `${form.days} • ${form.lessonStartTime}`,
    };
    if (editingId !== null) {
      setLocalGroups((prev) =>
        prev.map((g) => g.id === editingId ? { ...newGroup, id: editingId } : g)
      );
    } else {
      const maxId = allGroups.length ? Math.max(...allGroups.map((g) => g.id)) + 1 : 1;
      setLocalGroups((prev) => [...prev, { ...newGroup, id: maxId }]);
    }
    setOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (deleteId !== null) {
      setLocalGroups((prev) => prev.filter((g) => g.id !== deleteId));
      setDeleteId(null);
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
          options={[
            { value: "Active",    label: t("groups.options.status.active") },
            { value: "Archive",   label: t("groups.options.status.archive") },
            { value: "Completed", label: t("groups.options.status.completed") },
          ]}
          onChange={(v) => setFilter("status", v as StatusType)}
          onClear={() => setFilter("status", "")}
        />
        <DropdownFilter
          label={t("groups.filters.teacher")}
          value={filters.teacher}
          options={TEACHERS.map((t) => ({ value: t, label: t }))}
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
                  { value: "Every day", label: t("groups.options.days.every") },
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
              {filteredGroups.map((g, i) => {
                const { months, weeks } = calcWeekOfStudy(g.startDate);
                return (
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
                    {col("week")         && (
                      <TableCell>
                        <Box>{months}</Box>
                        <Box sx={{ color: "#9ca3af", fontSize: 12 }}>{weeks}</Box>
                      </TableCell>
                    )}
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
                          onClick={() => { setDeleteId(g.id); setActionMenuAnchor(null); }}
                          sx={{ fontSize: 13, gap: 1, color: "#ef4444" }}
                        >
                          <MdDelete size={15} /> {t("groups.actions.delete")}
                        </MenuItem>
                      </Menu>
                    </TableCell>
                  </TableRow>
                );
              })}
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
              name="course"
              value={form.course}
              onChange={handleChange}
              size="small"
              fullWidth
              sx={inputSx}
            >
              {COURSES.map((c) => (
                <MenuItem key={c} value={c} sx={{ fontSize: 13 }}>{c}</MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Select teacher */}
          <Box mb={2.5}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.teacher")}
            </Typography>
            <TextField
              select
              name="teacher"
              value={form.teacher}
              onChange={handleChange}
              size="small"
              fullWidth
              sx={inputSx}
            >
              {TEACHERS.map((t) => (
                <MenuItem key={t} value={t} sx={{ fontSize: 13 }}>{t}</MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Days */}
          <Box mb={2.5}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.days")}
            </Typography>
            <TextField
              select
              name="days"
              value={form.days}
              onChange={handleChange}
              size="small"
              fullWidth
              sx={inputSx}
            >
              <MenuItem value="Odd days"  sx={{ fontSize: 13 }}>{t("groups.options.days.odd")}</MenuItem>
              <MenuItem value="Even days" sx={{ fontSize: 13 }}>{t("groups.options.days.even")}</MenuItem>
              <MenuItem value="Every day" sx={{ fontSize: 13 }}>{t("groups.options.days.every")}</MenuItem>
            </TextField>
          </Box>

          {/* Select room */}
          <Box mb={2.5}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.room")}
            </Typography>
            <TextField
              select
              name="room"
              value={form.room}
              onChange={handleChange}
              size="small"
              fullWidth
              sx={inputSx}
            >
              {ROOMS.map((r) => (
                <MenuItem key={r} value={r} sx={{ fontSize: 13 }}>{r}</MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Lesson start time */}
          <Box mb={2.5}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.lessonStartTime")}
            </Typography>
            <TextField
              type="time"
              name="lessonStartTime"
              value={form.lessonStartTime}
              onChange={handleChange}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={inputSx}
            />
          </Box>

          {/* Group start date */}
          <Box mb={2.5}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.startDate")}
            </Typography>
            <TextField
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={handleChange}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={inputSx}
            />
          </Box>

          {/* Group end date */}
          <Box mb={2.5}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.endDate")}
            </Typography>
            <TextField
              type="date"
              name="endDate"
              value={form.endDate}
              onChange={handleChange}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={inputSx}
            />
          </Box>

          {/* Tags */}
          <Box mb={2.5}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.tags")}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {TAGS.map((tag) => (
                <Chip
                  key={tag}
                  label={TAG_LABELS[tag] ?? tag}
                  clickable
                  size="small"
                  onClick={() => handleTagToggle(tag)}
                  sx={{
                    fontSize: 12, height: 28, borderRadius: "6px",
                    bgcolor:     form.tags.includes(tag) ? "#dbeafe" : "white",
                    color:       form.tags.includes(tag) ? "#1d4ed8" : "#374151",
                    border:      "1px solid",
                    borderColor: form.tags.includes(tag) ? "#93c5fd" : "#d0d5dd",
                    "&:hover": {
                      bgcolor:     form.tags.includes(tag) ? "#bfdbfe" : "#f9fafb",
                      borderColor: form.tags.includes(tag) ? "#60a5fa" : "#a0aec0",
                    },
                  }}
                />
              ))}
            </Stack>
          </Box>

          {/* Status */}
          <Box mb={3}>
            <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>
              {t("groups.form.status")}
            </Typography>
            <TextField
              select
              name="status"
              value={form.status}
              onChange={handleChange}
              size="small"
              fullWidth
              sx={inputSx}
            >
              <MenuItem value="Active"    sx={{ fontSize: 13 }}>{t("groups.options.status.active")}</MenuItem>
              <MenuItem value="Archive"   sx={{ fontSize: 13 }}>{t("groups.options.status.archive")}</MenuItem>
              <MenuItem value="Completed" sx={{ fontSize: 13 }}>{t("groups.options.status.completed")}</MenuItem>
            </TextField>
          </Box>

          {/* Submit */}
          <Button
            fullWidth
            variant="contained"
            onClick={handleSave}
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
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteId(null)} sx={{ color: "#667085" }}>{t("groups.deleteDialog.cancel")}</Button>
          <Button
            variant="contained"
            color="error"
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