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
import { useState }                      from "react";
import * as XLSX                         from "xlsx";
import { useNavigate }                   from "react-router-dom";
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

/* ─── helpers ────────────────────────────────────────────── */
const calcWeekOfStudy = (startDate: string) => {
  if (!startDate) return { months: "—", weeks: "" };
  const diffMs   = Date.now() - new Date(startDate).getTime();
  if (diffMs < 0) return { months: "0 months", weeks: "0 weeks" };
  const totalDays = Math.floor(diffMs / 86_400_000);
  return { months: `${Math.floor(totalDays / 30)} months`, weeks: `${Math.floor((totalDays % 30) / 7)} weeks` };
};

const formatDate = (d: string) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
};

/* ─── DropdownFilter ─────────────────────────────────────── */
interface DropdownProps {
  label: string; value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void; onClear?: () => void;
}
const DropdownFilter = ({ label, value, options, onChange, onClear }: DropdownProps) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  return (
    <>
      <Button variant="outlined" size="small" endIcon={!value ? <HiChevronDown /> : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          borderRadius: "8px", borderColor: value ? "primary.main" : "#d0d5dd",
          color: value ? "primary.main" : "#667085", bgcolor: value ? "#eff8ff" : "white",
          fontWeight: 400, fontSize: 13, px: 1.5, py: 0.75, textTransform: "none",
          "&:hover": { borderColor: "primary.main", bgcolor: "#eff8ff" },
        }}>
        {value ? (
          <Stack direction="row" alignItems="center" gap={0.5}>
            <span>{options.find((o) => o.value === value)?.label || value}</span>
            <IoClose size={14} onClick={(e) => { e.stopPropagation(); onClear?.(); }} />
          </Stack>
        ) : label}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 160, mt: 0.5 } }}>
        {options.map((o) => (
          <MenuItem key={o.value} selected={value === o.value}
            onClick={() => { onChange(o.value); setAnchor(null); }} sx={{ fontSize: 13 }}>
            {o.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

/* ─── Groups ─────────────────────────────────────────────── */
export const Groups = () => {
  const navigate = useNavigate();

  // branch filtered groups from context
  const { groups: branchGroups, branchLabel } = useBranch();

  // derive COURSES / TEACHERS / ROOMS from currently visible branch groups
  const COURSES  = [...new Set(branchGroups.map((g) => g.course))];
  const TEACHERS = [...new Set(branchGroups.map((g) => g.teacher))];
  const ROOMS    = [...new Set(branchGroups.map((g) => g.room))];

  const [localGroups, setLocalGroups] = useState<GroupRow[]>([]);
  const [open,        setOpen]        = useState(false);
  const [editingId,   setEditingId]   = useState<number | null>(null);
  const [form,        setForm]        = useState<GroupRow>(EMPTY_FORM);
  const [deleteId,    setDeleteId]    = useState<number | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{ el: HTMLElement; id: number } | null>(null);
  const [sortKey,     setSortKey]     = useState<SortKey>("");
  const [sortDir,     setSortDir]     = useState<SortDir>("asc");
  const [visibleCols, setVisibleCols] = useState<string[]>(ALL_COLUMNS.map((c) => c.key));
  const [columnsAnchor, setColumnsAnchor] = useState<null | HTMLElement>(null);
  const [filters,     setFilters]     = useState<Filters>({
    status: "", teacher: "", course: "", days: "", tags: [], startDate: "", endDate: "",
  });

  // Merge branch groups + locally added groups
  const allGroups: GroupRow[] = [
    ...branchGroups.map((g) => ({ ...g, status: "Active" as StatusType, tags: [] })),
    ...localGroups,
  ];

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const clearAllFilters = () =>
    setFilters({ status: "", teacher: "", course: "", days: "", tags: [], startDate: "", endDate: "" });

  const hasActiveFilters = Object.values(filters).some((v) => Array.isArray(v) ? v.length > 0 : Boolean(v));

  const filteredGroups = allGroups
    .filter((g) =>
      (!filters.status    || g.status  === filters.status) &&
      (!filters.teacher   || g.teacher === filters.teacher) &&
      (!filters.course    || g.course  === filters.course) &&
      (!filters.days      || g.days    === filters.days) &&
      (filters.tags.length === 0 || filters.tags.some((t) => g.tags.includes(t))) &&
      (!filters.startDate || g.startDate >= filters.startDate) &&
      (!filters.endDate   || g.endDate  <= filters.endDate)
    )
    .sort((a, b) => {
      if (!sortKey) return 0;
      const av = String(a[sortKey as keyof GroupRow] ?? "");
      const bv = String(b[sortKey as keyof GroupRow] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleExportExcel = () => {
    const data = filteredGroups.map((g, i) => ({
      "#": i + 1, Group: g.name, Course: g.course, Teacher: g.teacher,
      Days: g.days, "Start Date": formatDate(g.startDate), "End Date": formatDate(g.endDate),
      Room: g.room, Students: g.studentCount, Status: g.status,
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
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));

  const handleOpenAdd  = () => { setEditingId(null); setForm(EMPTY_FORM); setOpen(true); };
  const handleOpenEdit = (group: GroupRow) => { setEditingId(group.id); setForm({ ...EMPTY_FORM, ...group }); setOpen(true); setActionMenuAnchor(null); };

  const handleSave = () => {
    const teacher  = TEACHERS_DATA.find((t) => t.fullName === form.teacher);
    const newGroup: GroupRow = { ...form, teacherId: teacher?.id || 0, schedule: `${form.days} • ${form.lessonStartTime}` };
    if (editingId !== null) {
      setLocalGroups((prev) => prev.map((g) => g.id === editingId ? { ...newGroup, id: editingId } : g));
    } else {
      const maxId = allGroups.length ? Math.max(...allGroups.map((g) => g.id)) + 1 : 1;
      setLocalGroups((prev) => [...prev, { ...newGroup, id: maxId }]);
    }
    setOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (deleteId !== null) { setLocalGroups((prev) => prev.filter((g) => g.id !== deleteId)); setDeleteId(null); }
  };

  const col = (key: string) => visibleCols.includes(key);

  /* ── UI ─────────────────────────────────────────────────── */
  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" alignItems="baseline" gap={1.5}>
          <Typography variant="h5" fontWeight={700} fontSize={26}>Groups</Typography>
          <Typography fontSize={14} color="text.secondary">
            {branchLabel} — {filteredGroups.length} ta
          </Typography>
        </Stack>
        <Button startIcon={<GoPlus />} variant="contained" onClick={handleOpenAdd}
          sx={{
            borderRadius: "12px", px: 3, py: 1.2, fontWeight: 700, fontSize: 13,
            textTransform: "uppercase", letterSpacing: 0.5,
            bgcolor: "#1a3a4a", "&:hover": { bgcolor: "#122a38" }, boxShadow: "none",
          }}>
          Add New
        </Button>
      </Stack>

      {/* FILTERS */}
      <Stack direction="row" flexWrap="wrap" gap={1} mb={1}>
        <DropdownFilter label="Active groups" value={filters.status}
          options={[{ value: "Active", label: "🟢 Active" }, { value: "Archive", label: "🔴 Archive" }, { value: "Completed", label: "🔵 Completed" }]}
          onChange={(v) => setFilter("status", v as StatusType)} onClear={() => setFilter("status", "")} />
        <DropdownFilter label="Teacher" value={filters.teacher}
          options={TEACHERS.map((t) => ({ value: t, label: t }))}
          onChange={(v) => setFilter("teacher", v)} onClear={() => setFilter("teacher", "")} />
        <DropdownFilter label="Courses" value={filters.course}
          options={COURSES.map((c) => ({ value: c, label: c }))}
          onChange={(v) => setFilter("course", v)} onClear={() => setFilter("course", "")} />
        <DropdownFilter label="Days" value={filters.days}
          options={[{ value: "Odd days", label: "Odd days" }, { value: "Even days", label: "Even days" }, { value: "Every day", label: "Every day" }]}
          onChange={(v) => setFilter("days", v)} onClear={() => setFilter("days", "")} />
        <DropdownFilter label="Tags" value={filters.tags[0] || ""}
          options={TAGS.map((t) => ({ value: t, label: t }))}
          onChange={(v) => setFilter("tags", [v])} onClear={() => setFilter("tags", [])} />

        {/* Date filters */}
        {(["startDate", "endDate"] as const).map((key) => (
          <Button key={key} variant="outlined" size="small" startIcon={<TbCalendar size={14} />}
            component="label"
            sx={{
              borderRadius: "8px", borderColor: filters[key] ? "primary.main" : "#d0d5dd",
              color: filters[key] ? "primary.main" : "#667085",
              fontSize: 13, fontWeight: 400, px: 1.5, textTransform: "none", position: "relative",
            }}>
            {filters[key] ? formatDate(filters[key]) : (key === "startDate" ? "Start date" : "End date")}
            <input type="date" style={{ position: "absolute", opacity: 0, inset: 0, cursor: "pointer" }}
              value={filters[key]} onChange={(e) => setFilter(key, e.target.value)} />
          </Button>
        ))}
      </Stack>

      {hasActiveFilters && (
        <Box mb={1}>
          <Button size="small" startIcon={<IoClose />} onClick={clearAllFilters} variant="outlined"
            sx={{ borderRadius: "8px", borderColor: "#d0d5dd", color: "#667085", fontSize: 12, fontWeight: 400, px: 1.5, textTransform: "none" }}>
            Clear all
          </Button>
        </Box>
      )}

      <Stack direction="row" justifyContent="flex-end" gap={1} mb={1.5}>
        <Button size="small" startIcon={<TbAdjustmentsHorizontal size={15} />} variant="outlined"
          sx={{ borderRadius: "8px", borderColor: "#d0d5dd", color: "#667085", fontSize: 12, fontWeight: 500, px: 1.5, textTransform: "none" }}>
          Filters
        </Button>
        <Button size="small" startIcon={<TbColumns3 size={15} />} variant="outlined"
          onClick={(e) => setColumnsAnchor(e.currentTarget)}
          sx={{ borderRadius: "8px", borderColor: "#d0d5dd", color: "#667085", fontSize: 12, fontWeight: 500, px: 1.5, textTransform: "none" }}>
          Columns
        </Button>
        <Menu anchorEl={columnsAnchor} open={Boolean(columnsAnchor)} onClose={() => setColumnsAnchor(null)}
          PaperProps={{ sx: { borderRadius: 2, minWidth: 160, mt: 0.5 } }}>
          {ALL_COLUMNS.map((c) => (
            <MenuItem key={c.key} onClick={() => setVisibleCols((prev) => prev.includes(c.key) ? prev.filter((k) => k !== c.key) : [...prev, c.key])}
              sx={{ fontSize: 13, gap: 1 }}>
              <Box sx={{ width: 16, height: 16, borderRadius: 0.5, border: "2px solid",
                borderColor: visibleCols.includes(c.key) ? "primary.main" : "#d0d5dd",
                bgcolor: visibleCols.includes(c.key) ? "primary.main" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {visibleCols.includes(c.key) && <Box sx={{ width: 8, height: 8, bgcolor: "white", borderRadius: 0.25 }} />}
              </Box>
              {c.label}
            </MenuItem>
          ))}
        </Menu>
      </Stack>

      {/* TABLE */}
      <Paper sx={{ borderRadius: 3, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 600, fontSize: 13, color: "#374151", py: 1.5, borderBottom: "1px solid #e5e7eb", bgcolor: "white" } }}>
                <TableCell sx={{ width: 40 }} />
                <TableCell>
                  <TableSortLabel active={sortKey === "name"} direction={sortDir} onClick={() => handleSort("name")}>Group</TableSortLabel>
                </TableCell>
                {col("course")       && <TableCell><TableSortLabel active={sortKey === "course"}  direction={sortDir} onClick={() => handleSort("course")}>Course</TableSortLabel></TableCell>}
                {col("teacher")      && <TableCell><TableSortLabel active={sortKey === "teacher"} direction={sortDir} onClick={() => handleSort("teacher")}>Teacher</TableSortLabel></TableCell>}
                {col("days")         && <TableCell><TableSortLabel active={sortKey === "days"}    direction={sortDir} onClick={() => handleSort("days")}>Days</TableSortLabel></TableCell>}
                {col("training")     && <TableCell><TableSortLabel active={sortKey === "startDate"} direction={sortDir} onClick={() => handleSort("startDate")}>Training dates</TableSortLabel></TableCell>}
                {col("week")         && <TableCell>Week of study</TableCell>}
                {col("room")         && <TableCell>Room</TableCell>}
                {col("tags")         && <TableCell>Tags</TableCell>}
                {col("studentCount") && <TableCell><TableSortLabel active={sortKey === "studentCount"} direction={sortDir} onClick={() => handleSort("studentCount")}>Students</TableSortLabel></TableCell>}
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredGroups.map((g, i) => {
                const { months, weeks } = calcWeekOfStudy(g.startDate);
                return (
                  <TableRow key={g.id} hover onClick={() => navigate(`/groups/${g.id}`)}
                    sx={{ cursor: "pointer", "& td": { borderBottom: "1px solid #f3f4f6", py: 1.8, fontSize: 13 },
                      "&:last-child td": { borderBottom: "none" }, "&:hover": { bgcolor: "#f9fafb" } }}>
                    <TableCell sx={{ color: "#9ca3af", fontSize: 12 }}>{i + 1}.</TableCell>
                    <TableCell sx={{ fontWeight: 500, color: "#111827" }}>{g.name}</TableCell>
                    {col("course")       && <TableCell>{g.course}</TableCell>}
                    {col("teacher")      && <TableCell>{g.teacher}</TableCell>}
                    {col("days")         && <TableCell><Box>{g.days}</Box><Box sx={{ color: "#9ca3af", fontSize: 12 }}>{g.lessonStartTime}</Box></TableCell>}
                    {col("training")     && <TableCell><Box>{formatDate(g.startDate)} —</Box><Box>{formatDate(g.endDate)}</Box></TableCell>}
                    {col("week")         && <TableCell><Box>{months}</Box><Box sx={{ color: "#9ca3af", fontSize: 12 }}>{weeks}</Box></TableCell>}
                    {col("room")         && <TableCell>{g.room}</TableCell>}
                    {col("tags")         && <TableCell><Stack direction="row" flexWrap="wrap" gap={0.5}>
                      {g.tags.map((tag) => <Chip key={tag} label={tag} size="small" sx={{ fontSize: 10, height: 20, bgcolor: "#f3f4f6", color: "#374151" }} />)}
                    </Stack></TableCell>}
                    {col("studentCount") && <TableCell sx={{ fontWeight: 500 }}>{g.studentCount}</TableCell>}

                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small"
                        onClick={(e) => setActionMenuAnchor(actionMenuAnchor?.id === g.id ? null : { el: e.currentTarget, id: g.id })}
                        sx={{ color: "#6b7280" }}>
                        <BsThreeDotsVertical size={15} />
                      </IconButton>
                      <Menu anchorEl={actionMenuAnchor?.id === g.id ? actionMenuAnchor.el : null}
                        open={actionMenuAnchor?.id === g.id} onClose={() => setActionMenuAnchor(null)}
                        PaperProps={{ sx: { borderRadius: 2, minWidth: 130, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" } }}
                        transformOrigin={{ horizontal: "right", vertical: "top" }}
                        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}>
                        <MenuItem onClick={() => handleOpenEdit(g)} sx={{ fontSize: 13, gap: 1 }}><MdEdit size={15} /> Edit</MenuItem>
                        <Divider sx={{ my: 0.5 }} />
                        <MenuItem onClick={() => { setDeleteId(g.id); setActionMenuAnchor(null); }} sx={{ fontSize: 13, gap: 1, color: "#ef4444" }}>
                          <MdDelete size={15} /> Delete
                        </MenuItem>
                      </Menu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredGroups.length === 0 && (
                <TableRow><TableCell colSpan={12} align="center" sx={{ py: 6, color: "#9ca3af" }}>No groups found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* EXCEL */}
      <Tooltip title="Export to Excel" placement="left">
        <IconButton onClick={handleExportExcel}
          sx={{ position: "fixed", bottom: 28, right: 28, bgcolor: "white", color: "#217346",
            width: 40, height: 40, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", border: "1px solid #e5e7eb",
            "&:hover": { bgcolor: "#f0fdf4" } }}>
          <PiMicrosoftExcelLogoFill size={20} />
        </IconButton>
      </Tooltip>

      {/* DRAWER */}
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}
        PaperProps={{ sx: { width: 420, p: 2, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography fontWeight={700} fontSize={16}>{editingId !== null ? "Edit group" : "Add group"}</Typography>
          <IconButton onClick={() => setOpen(false)}><IoClose /></IconButton>
        </Stack>
        <Stack spacing={2}>
          <TextField name="name" label="Name" value={form.name} onChange={handleChange} size="small" fullWidth />
          <TextField select name="course" label="Select course" value={form.course} onChange={handleChange} size="small" fullWidth>
            {COURSES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <TextField select name="teacher" label="Select teacher" value={form.teacher} onChange={handleChange} size="small" fullWidth>
            {TEACHERS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField select name="days" label="Days" value={form.days} onChange={handleChange} size="small" fullWidth>
            <MenuItem value="Odd days">Odd days</MenuItem>
            <MenuItem value="Even days">Even days</MenuItem>
            <MenuItem value="Every day">Every day</MenuItem>
          </TextField>
          <TextField select name="room" label="Select room" value={form.room} onChange={handleChange} size="small" fullWidth>
            {ROOMS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
          <Box>
            <Typography fontSize={13} mb={0.5} color="text.secondary">Tags</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {TAGS.map((tag) => (
                <Chip key={tag} label={tag} clickable size="small"
                  color={form.tags.includes(tag) ? "primary" : "default"}
                  onClick={() => handleTagToggle(tag)} />
              ))}
            </Stack>
          </Box>
          <TextField type="time" name="lessonStartTime" label="Lesson start time" InputLabelProps={{ shrink: true }} value={form.lessonStartTime} onChange={handleChange} size="small" fullWidth />
          <TextField type="date" name="startDate" label="Group start date" InputLabelProps={{ shrink: true }} value={form.startDate} onChange={handleChange} size="small" fullWidth />
          <TextField type="date" name="endDate"   label="Group end date"   InputLabelProps={{ shrink: true }} value={form.endDate}   onChange={handleChange} size="small" fullWidth />
          <TextField select name="status" label="Status" value={form.status} onChange={handleChange} size="small" fullWidth>
            <MenuItem value="Active">🟢 Active</MenuItem>
            <MenuItem value="Archive">🔴 Archive</MenuItem>
            <MenuItem value="Completed">🔵 Completed</MenuItem>
          </TextField>
          <TextField name="studentCount" type="number" label="Students" value={form.studentCount} onChange={handleChange} size="small" fullWidth />
        </Stack>
        <Box mt={3}>
          <Button fullWidth variant="contained" onClick={handleSave}
            sx={{ borderRadius: 2, py: 1.2, bgcolor: "#4da3ff", textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: "#3b8be0" } }}>
            Submit
          </Button>
        </Box>
      </Drawer>

      {/* DELETE */}
      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Group</DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color="text.secondary">Are you sure you want to delete this group? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteId(null)} sx={{ color: "#667085" }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} sx={{ borderRadius: 2 }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};