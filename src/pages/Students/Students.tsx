// src/pages/Students.tsx
import React, { useState, useMemo } from "react";
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
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
import { BsThreeDotsVertical, BsFolder2 } from "react-icons/bs";
import { TbAdjustmentsHorizontal, TbColumns3, TbCalendar } from "react-icons/tb";
import { HiChevronDown } from "react-icons/hi";
import { IoClose, IoSearchOutline } from "react-icons/io5";
import {
  FiPhone, FiKey, FiUser, FiMail, FiSend,
  FiBookOpen, FiMapPin, FiCreditCard,
} from "react-icons/fi";

// ✅ TEACHERS_DATA dan import
import { buildFlatStudents, FlatStudent, formatDate } from "../../constants/FlatStudents";
import { TEACHERS_DATA } from "../../constants/Teachers";
import { useNavigate } from "react-router-dom";

/* ─── TYPES ─────────────────────────────────────────── */
type SortDir = "asc" | "desc";
type SortKey = keyof FlatStudent | "";

interface Filters {
  search: string;
  course: string;
  status: "active" | "inactive" | "";
  teacher: string;
  startDate: string;
  endDate: string;
}

/* ─── STATIC ─────────────────────────────────────────── */

// Kurslar TEACHERS_DATA dan olinadi
const COURSES = [...new Set(
  TEACHERS_DATA.flatMap((t) => t.groups.map((g) => g.course))
)];

// O'qituvchilar TEACHERS_DATA dan olinadi
const TEACHERS = [...new Set(
  TEACHERS_DATA.map((t) => t.fullName)
)];

const ALL_COLUMNS = [
  { key: "photo", label: "Photo" },
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "groups", label: "Groups" },
  { key: "teachers", label: "Teachers" },
  { key: "training", label: "Training dates" },
  { key: "balance", label: "Balance" },
  { key: "comment", label: "Comment" },
];

const PAY_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "click", label: "Click" },
  { value: "card", label: "Card" },
  { value: "uzum", label: "Uzum" },
  { value: "bank", label: "Bank account" },
  { value: "humo", label: "Humo" },
  { value: "payme", label: "Payme" },
];

const CONTACT_ICONS = [
  { icon: <FiPhone size={16} />, label: "Phone" },
  { icon: <FiKey size={16} />, label: "Key" },
  { icon: <FiUser size={16} />, label: "Profile" },
  { icon: <FiMail size={16} />, label: "Email" },
  { icon: <FiSend size={16} />, label: "Telegram" },
  { icon: <FiBookOpen size={16} />, label: "Education" },
  { icon: <FiMapPin size={16} />, label: "Location" },
  { icon: <FiCreditCard size={16} />, label: "Card" },
];

const todayISO = new Date().toISOString().slice(0, 10);

/* ─── STYLES ─────────────────────────────────────────── */
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
          borderColor: value ? "#5c7fa3" : "#d0d5dd",
          color: value ? "#5c7fa3" : "#667085",
          bgcolor: value ? "#eef4f9" : "white",
          fontWeight: 400,
          fontSize: 13,
          px: 1.5,
          py: 0.6,
          textTransform: "none",
          whiteSpace: "nowrap",
          "&:hover": { borderColor: "#5c7fa3", bgcolor: "#eef4f9" },
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

/* ─── ADD PAYMENT DRAWER ─────────────────────────────── */
const AddPaymentDrawer = ({
  open, student, onClose,
}: {
  open: boolean; student: FlatStudent | null; onClose: () => void;
}) => {
  const [payMethod, setPayMethod] = useState("cash");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO);
  const [comment, setComment] = useState("");

  const handleSubmit = () => { onClose(); setAmount(""); setComment(""); };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: 420 } }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center"
        sx={{ px: 3, py: 2.5, borderBottom: "1px solid #eaecf0", bgcolor: "white" }}
      >
        <Typography fontWeight={700} fontSize={17}>Add payment</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "#9ca3af" }}><IoClose size={20} /></IconButton>
      </Stack>
      <Box sx={{ px: 3, py: 2.5, overflowY: "auto", flex: 1, bgcolor: "#f8f9fa" }}>
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>Student</Typography>
          <Box sx={{ border: "1px solid #d0d5dd", borderRadius: "6px", px: 1.5, py: 1.1, bgcolor: "white", fontSize: 13, color: "#6b7280" }}>
            {student?.name || "—"}
          </Box>
        </Box>
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>Balance</Typography>
          <Box sx={{ display: "inline-flex", alignItems: "center", bgcolor: "#2d4a5a", color: "white", borderRadius: "20px", px: 2, py: 0.4, fontSize: 13, fontWeight: 600 }}>
            {student?.balance?.toLocaleString("ru-RU") ?? 0} UZS
          </Box>
        </Box>
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>Group</Typography>
          <Box sx={{ border: "1px solid #d0d5dd", borderRadius: "6px", px: 1.5, py: 1.1, bgcolor: "white", fontSize: 13, color: "#374151" }}>
            {student?.groupName} — {student?.groupSchedule}
          </Box>
        </Box>
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={1}>Method pay</Typography>
          <RadioGroup value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
            sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5 }}
          >
            {PAY_METHODS.map((m) => (
              <FormControlLabel key={m.value} value={m.value}
                control={<Radio size="small" sx={{ color: "#d0d5dd", "&.Mui-checked": { color: "#5c7fa3" }, p: 0.5 }} />}
                label={<Typography fontSize={13} color="#374151">{m.label}</Typography>}
                sx={{ m: 0, gap: 0.5 }}
              />
            ))}
          </RadioGroup>
        </Box>
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>Amount</Typography>
          <TextField fullWidth size="small" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} sx={inputSx} />
        </Box>
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>Date</Typography>
          <TextField fullWidth size="small" type="date" value={date} onChange={(e) => setDate(e.target.value)} sx={inputSx} />
        </Box>
        <Box mb={3}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>Comment</Typography>
          <TextField fullWidth size="small" multiline rows={3} value={comment} onChange={(e) => setComment(e.target.value)} sx={inputSx} />
        </Box>
        <Button variant="contained" fullWidth onClick={handleSubmit}
          sx={{ borderRadius: "20px", py: 1.2, fontWeight: 600, fontSize: 14, bgcolor: "#5c7fa3", "&:hover": { bgcolor: "#4a6a8a" }, boxShadow: "none", textTransform: "none" }}
        >
          Submit
        </Button>
      </Box>
    </Drawer>
  );
};

/* ─── EDIT STUDENT DRAWER ────────────────────────────── */
const EditStudentDrawer = ({
  open, student, onClose, onSave,
}: {
  open: boolean; student: FlatStudent | null; onClose: () => void;
  onSave: (uid: string, data: { name: string; phone: string }) => void;
}) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("male");

  React.useEffect(() => {
    if (student) { setName(student.name); setPhone(student.phone); }
  }, [student]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: 420 } }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center"
        sx={{ px: 3, py: 2.5, borderBottom: "1px solid #eaecf0", bgcolor: "white" }}
      >
        <Typography fontWeight={700} fontSize={17}>Edit Student</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "#9ca3af" }}><IoClose size={20} /></IconButton>
      </Stack>
      <Box sx={{ px: 3, py: 2.5, overflowY: "auto", flex: 1, bgcolor: "#f8f9fa" }}>
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>Phone</Typography>
          <Stack direction="row" gap={1}>
            <Box sx={{ border: "1px solid #d0d5dd", borderRadius: "6px", px: 1.5, display: "flex", alignItems: "center", bgcolor: "white", fontSize: 13, color: "#374151", whiteSpace: "nowrap", minWidth: 60, justifyContent: "center" }}>+998</Box>
            <TextField fullWidth size="small" value={phone} onChange={(e) => setPhone(e.target.value)} sx={inputSx} />
          </Stack>
        </Box>
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>Name</Typography>
          <TextField fullWidth size="small" value={name} onChange={(e) => setName(e.target.value)} sx={inputSx} />
        </Box>
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>Date of birth</Typography>
          <TextField fullWidth size="small" type="date" value={dob} onChange={(e) => setDob(e.target.value)} InputLabelProps={{ shrink: true }} sx={inputSx} />
        </Box>
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>Gender</Typography>
          <RadioGroup row value={gender} onChange={(e) => setGender(e.target.value)} sx={{ gap: 3 }}>
            {["Male", "Female"].map((g) => (
              <FormControlLabel key={g} value={g.toLowerCase()}
                control={<Radio size="small" sx={{ color: "#d0d5dd", "&.Mui-checked": { color: "#5c7fa3" }, p: 0.5 }} />}
                label={<Typography fontSize={13} color="#374151">{g}</Typography>}
                sx={{ m: 0, gap: 0.5 }}
              />
            ))}
          </RadioGroup>
        </Box>
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={1}>Additional contacts</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {CONTACT_ICONS.map((item, i) => (
              <Tooltip key={i} title={item.label} arrow>
                <IconButton size="small" sx={{ width: 40, height: 40, border: "1.5px solid #c5d4e3", borderRadius: "50%", color: "#5c7fa3", bgcolor: "white" }}>
                  {item.icon}
                </IconButton>
              </Tooltip>
            ))}
          </Stack>
        </Box>
        <Stack alignItems="flex-end" gap={0.5} mb={3}>
          <Button variant="text" size="small" sx={{ fontSize: 13, color: "#5c7fa3", textTransform: "none", p: 0, minWidth: 0 }}>+ Add to the group</Button>
          <Button variant="text" size="small" sx={{ fontSize: 13, color: "#5c7fa3", textTransform: "none", p: 0, minWidth: 0 }}>+ Set password</Button>
        </Stack>
        <Button variant="contained" fullWidth onClick={() => { if (student) onSave(student.uid, { name, phone }); onClose(); }}
          sx={{ borderRadius: "20px", py: 1.2, fontWeight: 600, fontSize: 14, bgcolor: "#5c7fa3", "&:hover": { bgcolor: "#4a6a8a" }, boxShadow: "none", textTransform: "none" }}
        >
          Submit
        </Button>
      </Box>
    </Drawer>
  );
};

/* ─── ADD STUDENT DRAWER ─────────────────────────────── */
const AddStudentDrawer = ({
  open, onClose, onSubmit,
}: {
  open: boolean; onClose: () => void;
  onSubmit: (data: { phone: string; name: string; dob: string; gender: string; comment: string }) => void;
}) => {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("male");
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    onSubmit({ phone: `+998 ${phone}`, name, dob, gender, comment });
    setPhone(""); setName(""); setDob(""); setGender("male"); setComment("");
    onClose();
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: 420, bgcolor: "#f8f9fa" } }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center"
        sx={{ px: 3, py: 2.5, bgcolor: "white", borderBottom: "1px solid #eaecf0" }}
      >
        <Typography fontWeight={600} fontSize={17} color="#111827">Add New Student</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "#9ca3af" }}><IoClose size={20} /></IconButton>
      </Stack>
      <Box sx={{ px: 3, py: 3, overflowY: "auto", flex: 1 }}>
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>Phone</Typography>
          <Stack direction="row" gap={1}>
            <Box sx={{ border: "1px solid #d0d5dd", borderRadius: "6px", px: 1.5, display: "flex", alignItems: "center", bgcolor: "white", fontSize: 14, color: "#374151", whiteSpace: "nowrap", minWidth: 64, justifyContent: "center" }}>+998</Box>
            <TextField fullWidth size="small" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="93 650 87 92" sx={inputSx} />
          </Stack>
        </Box>
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>Name</Typography>
          <TextField fullWidth size="small" value={name} onChange={(e) => setName(e.target.value)} sx={inputSx} />
        </Box>
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>Date of birth</Typography>
          <TextField fullWidth size="small" type="date" value={dob} onChange={(e) => setDob(e.target.value)} InputLabelProps={{ shrink: true }} sx={inputSx} />
        </Box>
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>Gender</Typography>
          <RadioGroup row value={gender} onChange={(e) => setGender(e.target.value)} sx={{ gap: 3 }}>
            {["Male", "Female"].map((g) => (
              <FormControlLabel key={g} value={g.toLowerCase()}
                control={<Radio size="small" sx={{ color: "#d0d5dd", "&.Mui-checked": { color: "#5c7fa3" }, p: 0.5 }} />}
                label={<Typography fontSize={14} color="#374151">{g}</Typography>}
                sx={{ m: 0, gap: 0.5 }}
              />
            ))}
          </RadioGroup>
        </Box>
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>Comment</Typography>
          <TextField fullWidth size="small" multiline rows={3} value={comment} onChange={(e) => setComment(e.target.value)} sx={inputSx} />
        </Box>
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={1.2}>Additional contacts</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {CONTACT_ICONS.map((item, i) => (
              <Tooltip key={i} title={item.label} arrow>
                <IconButton size="small" sx={{ width: 40, height: 40, border: "1.5px solid #c5d4e3", borderRadius: "50%", color: "#5c7fa3", bgcolor: "white" }}>
                  {item.icon}
                </IconButton>
              </Tooltip>
            ))}
          </Stack>
        </Box>
        <Stack alignItems="flex-end" gap={0.5} mb={3}>
          <Button variant="text" size="small" sx={{ fontSize: 13, color: "#5c7fa3", textTransform: "none", p: 0, minWidth: 0 }}>+ Add to the group</Button>
          <Button variant="text" size="small" sx={{ fontSize: 13, color: "#5c7fa3", textTransform: "none", p: 0, minWidth: 0 }}>+ Set password</Button>
        </Stack>
        <Button variant="contained" onClick={handleSubmit}
          sx={{ borderRadius: "20px", py: 1.2, px: 4, fontWeight: 600, fontSize: 14, bgcolor: "#5c7fa3", "&:hover": { bgcolor: "#4a6a8a" }, boxShadow: "none", textTransform: "none" }}
        >
          Submit
        </Button>
      </Box>
    </Drawer>
  );
};


export const Students = () => {
  const navigate = useNavigate();
  // ✅ Data TEACHERS_DATA dan olinadi
  const [students, setStudents] = useState<FlatStudent[]>(() => buildFlatStudents());

  const [selected, setSelected] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [visibleCols, setVisibleCols] = useState<string[]>(ALL_COLUMNS.map((c) => c.key));
  const [columnsAnchor, setColumnsAnchor] = useState<null | HTMLElement>(null);
  const [actionMenu, setActionMenu] = useState<{ el: HTMLElement; uid: string } | null>(null);
  const [deleteUid, setDeleteUid] = useState<string | null>(null);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState<FlatStudent | null>(null);

  const [filters, setFilters] = useState<Filters>({
    search: "", course: "", status: "", teacher: "", startDate: "", endDate: "",
  });

  const setFilter = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setFilters((p) => ({ ...p, [key]: val }));

  const clearAll = () =>
    setFilters({ search: "", course: "", status: "", teacher: "", startDate: "", endDate: "" });
  const hasFilters = Object.values(filters).some(Boolean);

  const filtered = useMemo(() => {
    return students
      .filter((s) => {
        const search = filters.search.toLowerCase();
        return (
          (!search || s.name.toLowerCase().includes(search) || s.phone.includes(search)) &&
          (!filters.course || s.course === filters.course) &&
          (!filters.status || (filters.status === "active" ? s.active : !s.active)) &&
          (!filters.teacher || s.teacher === filters.teacher) &&
          (!filters.startDate || s.startDate >= filters.startDate) &&
          (!filters.endDate || s.endDate <= filters.endDate)
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
  const toggleAll = () => setSelected(allSelected ? [] : filtered.map((s) => s.uid));
  const toggleOne = (uid: string) =>
    setSelected((p) => (p.includes(uid) ? p.filter((x) => x !== uid) : [...p, uid]));

  const handleDeleteConfirm = () => {
    if (deleteUid) {
      setStudents((p) => p.filter((s) => s.uid !== deleteUid));
      setSelected((p) => p.filter((x) => x !== deleteUid));
      setDeleteUid(null);
    }
  };

  const openActionMenu = (e: React.MouseEvent<HTMLButtonElement>, uid: string) => {
    e.stopPropagation();
    const student = students.find((s) => s.uid === uid) || null;
    setActiveStudent(student);
    setActionMenu(actionMenu?.uid === uid ? null : { el: e.currentTarget, uid });
  };

  const handleSaveEdit = (uid: string, data: { name: string; phone: string }) => {
    setStudents((prev) => prev.map((s) => (s.uid === uid ? { ...s, ...data } : s)));
  };

  const handleAddStudent = (data: {
    phone: string; name: string; dob: string; gender: string; comment: string;
  }) => {
    // Yangi student birinchi guruhga qo'shiladi (demo)
    const allGroups = TEACHERS_DATA.flatMap((t) => t.groups);
    const group = allGroups[0];
    const newEntry: FlatStudent = {
      uid: `${group.id}-${Date.now()}`,
      id: Date.now(),
      name: data.name || "Yangi O'quvchi",
      phone: data.phone,
      active: true,
      groupId: group.id,
      groupName: group.name,
      groupSchedule: group.schedule,
      groupBadge: group.badge,
      groupBadgeColor: group.badgeColor,
      course: group.course,
      teacher: group.teacher,
      teacherId: group.teacherId,
      startDate: group.startDate,
      endDate: group.endDate,
      branch: group.branch ?? "",
      room: group.room,
      price: group.price ?? 0,
      balance: 0,
    };
    setStudents((p) => [newEntry, ...p]);
  };

  const col = (key: string) => visibleCols.includes(key);

  /* ── BADGE COLOR ── */
  const badgeColors = {
    blue:  { bg: "#dbeafe", color: "#1d4ed8" },
    green: { bg: "#dcfce7", color: "#15803d" },
    amber: { bg: "#fef3c7", color: "#92400e" },
  };

  return (
    <Box sx={{ p: 3, bgcolor: "#f8f9fa", minHeight: "100vh" }}>
      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
        <Stack direction="row" alignItems="baseline" gap={1.5}>
          <Typography variant="h5" fontWeight={700} fontSize={26} color="#111827">Students</Typography>
          <Typography fontSize={14} color="#6b7280">Quantity — {filtered.length}</Typography>
        </Stack>
        <Button
          variant="contained"
          onClick={() => setAddDrawerOpen(true)}
          sx={{
            bgcolor: "#2d4a5a", color: "white", borderRadius: "8px", px: 3, py: 1.1,
            fontWeight: 700, fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase",
            "&:hover": { bgcolor: "#1e3340" }, boxShadow: "none",
          }}
        >
          Add New
        </Button>
      </Stack>

      {/* FILTER ROW */}
      <Stack direction="row" flexWrap="wrap" gap={1} mb={1.5}
        sx={{ bgcolor: "white", border: "1px solid #eaecf0", borderRadius: "8px", p: 1.5 }}
      >
        {/* Search */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, border: "1px solid #d0d5dd", borderRadius: "6px", px: 1.2, py: 0.6, bgcolor: "white", minWidth: 220 }}>
          <IoSearchOutline size={15} color="#9ca3af" />
          <input
            placeholder="Search by name or phone"
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            style={{ border: "none", outline: "none", fontSize: 13, color: "#374151", background: "transparent", width: "100%" }}
          />
          {filters.search && <IoClose size={13} color="#9ca3af" style={{ cursor: "pointer" }} onClick={() => setFilter("search", "")} />}
        </Box>

        {/* Course filter — TEACHERS_DATA dan */}
        <DropdownFilter
          label="By Courses"
          value={filters.course}
          options={COURSES.map((c) => ({ value: c, label: c }))}
          onChange={(v) => setFilter("course", v)}
          onClear={() => setFilter("course", "")}
        />

        {/* Status */}
        <DropdownFilter
          label="Status"
          value={filters.status}
          options={[{ value: "active", label: "🟢 Active" }, { value: "inactive", label: "🔴 Inactive" }]}
          onChange={(v) => setFilter("status", v as "active" | "inactive")}
          onClear={() => setFilter("status", "")}
        />

        {/* Teacher filter — TEACHERS_DATA dan */}
        <DropdownFilter
          label="By Teacher"
          value={filters.teacher}
          options={TEACHERS.map((t) => ({ value: t, label: t }))}
          onChange={(v) => setFilter("teacher", v)}
          onClear={() => setFilter("teacher", "")}
        />

        <DropdownFilter label="Financial" value="" options={[{ value: "paid", label: "Paid" }, { value: "debt", label: "In debt" }]} onChange={() => {}} onClear={() => {}} />
        <DropdownFilter label="By Tags" value="" options={[{ value: "new", label: "New" }, { value: "vip", label: "VIP" }]} onChange={() => {}} onClear={() => {}} />

        {/* Date range */}
        <Button variant="outlined" size="small" startIcon={<TbCalendar size={13} />} component="label"
          sx={{ borderRadius: "6px", borderColor: filters.startDate ? "#5c7fa3" : "#d0d5dd", color: filters.startDate ? "#5c7fa3" : "#667085", fontSize: 13, fontWeight: 400, px: 1.5, textTransform: "none", position: "relative" }}
        >
          {filters.startDate ? formatDate(filters.startDate) : "Start date"}
          <input type="date" style={{ position: "absolute", opacity: 0, inset: 0, cursor: "pointer" }} value={filters.startDate} onChange={(e) => setFilter("startDate", e.target.value)} />
        </Button>
        <Button variant="outlined" size="small" startIcon={<TbCalendar size={13} />} component="label"
          sx={{ borderRadius: "6px", borderColor: filters.endDate ? "#5c7fa3" : "#d0d5dd", color: filters.endDate ? "#5c7fa3" : "#667085", fontSize: 13, fontWeight: 400, px: 1.5, textTransform: "none", position: "relative" }}
        >
          {filters.endDate ? formatDate(filters.endDate) : "End date"}
          <input type="date" style={{ position: "absolute", opacity: 0, inset: 0, cursor: "pointer" }} value={filters.endDate} onChange={(e) => setFilter("endDate", e.target.value)} />
        </Button>

        {hasFilters && (
          <Button size="small" startIcon={<IoClose />} onClick={clearAll} variant="outlined"
            sx={{ borderRadius: "6px", borderColor: "#d0d5dd", color: "#667085", fontSize: 12, px: 1.5, textTransform: "none" }}
          >
            Clear all
          </Button>
        )}
      </Stack>

      {/* COLUMNS + BULK ACTIONS */}
      <Stack direction="row" justifyContent="flex-end" alignItems="center" mb={1.5} gap={1}>
        {selected.length > 0 && (
          <Typography fontSize={13} color="text.secondary" sx={{ mr: "auto" }}>
            {selected.length} selected
          </Typography>
        )}
        <Button size="small" startIcon={<TbAdjustmentsHorizontal size={14} />} variant="outlined"
          sx={{ borderRadius: "6px", borderColor: "#d0d5dd", color: "#667085", fontSize: 12, px: 1.5, textTransform: "none" }}
        >
          Filters
        </Button>
        <Button size="small" startIcon={<TbColumns3 size={14} />} variant="outlined"
          onClick={(e) => setColumnsAnchor(e.currentTarget)}
          sx={{ borderRadius: "6px", borderColor: "#d0d5dd", color: "#667085", fontSize: 12, px: 1.5, textTransform: "none" }}
        >
          Columns
        </Button>
        <Menu anchorEl={columnsAnchor} open={Boolean(columnsAnchor)} onClose={() => setColumnsAnchor(null)}
          PaperProps={{ sx: { borderRadius: 2, minWidth: 160, mt: 0.5 } }}
        >
          {ALL_COLUMNS.map((c) => (
            <MenuItem key={c.key}
              onClick={() => setVisibleCols((p) => p.includes(c.key) ? p.filter((k) => k !== c.key) : [...p, c.key])}
              sx={{ fontSize: 13, gap: 1 }}
            >
              <Checkbox size="small" checked={visibleCols.includes(c.key)} sx={{ p: 0 }} />
              {c.label}
            </MenuItem>
          ))}
        </Menu>
      </Stack>

      {/* TABLE */}
      <Paper sx={{ borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #eaecf0" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 600, fontSize: 13, color: "#374151", py: 1.5, borderBottom: "1px solid #eaecf0", bgcolor: "white" } }}>
                <TableCell sx={{ width: 32, pr: 0 }} />
                <TableCell sx={{ width: 32, pl: 0 }}>
                  <Checkbox size="small" checked={allSelected} onChange={toggleAll} sx={{ p: 0 }} />
                </TableCell>
                {col("photo") && <TableCell>Photo</TableCell>}
                {col("name") && (
                  <TableCell>
                    <TableSortLabel active={sortKey === "name"} direction={sortDir} onClick={() => handleSort("name")}>Name</TableSortLabel>
                  </TableCell>
                )}
                {col("phone") && <TableCell>Phone</TableCell>}
                {col("groups") && <TableCell>Groups</TableCell>}
                {col("teachers") && <TableCell>Teachers</TableCell>}
                {col("training") && <TableCell>Training dates</TableCell>}
                {col("balance") && <TableCell>Balance</TableCell>}
                {col("comment") && <TableCell>Comment</TableCell>}
                <TableCell align="right">
                  <Stack direction="row" justifyContent="flex-end" gap={0.5}>
                    <Tooltip title="Archive selected">
                      <IconButton size="small" sx={{ color: "#9ca3af" }}><BsFolder2 size={15} /></IconButton>
                    </Tooltip>
                    <Tooltip title="Mail selected">
                      <IconButton size="small" sx={{ color: "#9ca3af" }}><MdMail size={15} /></IconButton>
                    </Tooltip>
                    <Tooltip title="Delete selected">
                      <IconButton size="small" sx={{ color: "#9ca3af" }} onClick={() => { setStudents((p) => p.filter((s) => !selected.includes(s.uid))); setSelected([]); }}>
                        <MdDelete size={15} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filtered.map((s, i) => {
                const badge = badgeColors[s.groupBadgeColor];
                const isSelected = selected.includes(s.uid);
                return (
                  <TableRow
                    key={s.uid}
                    hover
                    onClick={() => navigate(`/students/${s.uid}` )}  // ✅ Profile ga o'tish
                    sx={{
                      "& td": { borderBottom: "1px solid #f3f4f6", py: 1.4, fontSize: 13 },
                      "&:last-child td": { borderBottom: "none" },
                      bgcolor: isSelected ? "#f0f7ff" : "white",
                      "&:hover": { bgcolor: isSelected ? "#e8f2ff" : "#f9fafb", cursor: "pointer" },
                    }}
                  >
                    <TableCell sx={{ color: "#9ca3af", fontSize: 12, pr: 0, width: 32 }}>
                      {i + 1}.
                    </TableCell>
                    <TableCell sx={{ pl: 0, width: 32 }} onClick={(e) => e.stopPropagation()}>
                      <Checkbox size="small" checked={isSelected} onChange={() => toggleOne(s.uid)} sx={{ p: 0 }} />
                    </TableCell>

                    {col("photo") && (
                      <TableCell>
                        <Avatar sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 700, bgcolor: "#d1d9e0", color: "#6b7280" }}>
                          <FiUser size={16} />
                        </Avatar>
                      </TableCell>
                    )}

                    {col("name") && (
                      <TableCell sx={{ fontWeight: 500, color: "#111827", minWidth: 160 }}>
                        {s.name}
                      </TableCell>
                    )}

                    {col("phone") && (
                      <TableCell>
                        <Typography fontSize={13} color="#5c7fa3">{s.phone}</Typography>
                      </TableCell>
                    )}

                    {col("groups") && (
                      <TableCell sx={{ minWidth: 220 }}>
                        <Stack direction="row" alignItems="center" gap={0.5} flexWrap="wrap">
                          <Chip
                            label={s.groupBadge}
                            size="small"
                            sx={{ fontSize: 10, height: 20, fontWeight: 600, bgcolor: badge.bg, color: badge.color, borderRadius: "4px" }}
                          />
                          <Typography fontSize={13} color="#374151">{s.groupName}</Typography>
                          <Typography fontSize={12} color="#9ca3af">
                            ({s.groupSchedule.split("• ")[1] || ""})
                          </Typography>
                        </Stack>
                      </TableCell>
                    )}

                    {col("teachers") && (
                      <TableCell sx={{ minWidth: 140, color: "#374151" }}>
                        {s.teacher}
                      </TableCell>
                    )}

                    {col("training") && (
                      <TableCell sx={{ minWidth: 120 }}>
                        <Typography fontSize={13} color="#9ca3af">{formatDate(s.startDate)} —</Typography>
                        <Typography fontSize={13} color="#9ca3af">{formatDate(s.endDate)}</Typography>
                      </TableCell>
                    )}

                    {col("balance") && (
                      <TableCell>
                        <Typography fontSize={13} fontWeight={500}
                          color={(s.balance ?? 0) < 0 ? "#ef4444" : "#16a34a"}
                        >
                          {(s.balance ?? 0).toLocaleString("ru-RU")}
                        </Typography>
                      </TableCell>
                    )}

                    {col("comment") && <TableCell />}

                    {/* ACTIONS */}
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small" onClick={(e) => openActionMenu(e, s.uid)} sx={{ color: "#6b7280" }}>
                        <BsThreeDotsVertical size={15} />
                      </IconButton>
                      <Menu
                        anchorEl={actionMenu?.uid === s.uid ? actionMenu.el : null}
                        open={actionMenu?.uid === s.uid}
                        onClose={() => setActionMenu(null)}
                        PaperProps={{ sx: { borderRadius: 2, minWidth: 170, boxShadow: "0 4px 20px rgba(0,0,0,0.13)", border: "1px solid #f0f0f0" } }}
                        transformOrigin={{ horizontal: "right", vertical: "top" }}
                        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                      >
                        <MenuItem
                          onClick={() => { setActionMenu(null); setEditDrawerOpen(true); }}
                          sx={{ fontSize: 13, gap: 1.2, py: 1.2, color: "#374151" }}
                        >
                          <MdEdit size={16} color="#6b7280" /> Edit Student
                        </MenuItem>
                        <Divider sx={{ my: 0.5 }} />
                        <MenuItem
                          onClick={() => { setActionMenu(null); setPaymentDrawerOpen(true); }}
                          sx={{ fontSize: 13, gap: 1.2, py: 1.2, color: "#16a34a" }}
                        >
                          <MdPayment size={16} color="#16a34a" /> Add payment
                        </MenuItem>
                        <Divider sx={{ my: 0.5 }} />
                        <MenuItem
                          onClick={() => { setActionMenu(null); setDeleteUid(s.uid); }}
                          sx={{ fontSize: 13, gap: 1.2, py: 1.2, color: "#ef4444" }}
                        >
                          <MdDelete size={16} /> Remove
                        </MenuItem>
                      </Menu>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 6, color: "#9ca3af" }}>
                    No students found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* PAGINATION */}
        <Stack direction="row" justifyContent="space-between" alignItems="center"
          sx={{ px: 3, py: 1.5, borderTop: "1px solid #f3f4f6" }}
        >
          <Typography fontSize={13} color="text.secondary">
            1–{Math.min(filtered.length, 20)} of {filtered.length}
          </Typography>
          <Stack direction="row" gap={0.5}>
            {["<", ">"].map((lbl) => (
              <Button key={lbl} size="small" variant="outlined"
                sx={{ minWidth: 32, px: 1, borderColor: "#e5e7eb", color: "#374151", borderRadius: "6px", fontSize: 13 }}
              >
                {lbl}
              </Button>
            ))}
          </Stack>
        </Stack>
      </Paper>

      {/* DRAWERS & DIALOGS */}
      <AddStudentDrawer open={addDrawerOpen} onClose={() => setAddDrawerOpen(false)} onSubmit={handleAddStudent} />
      <AddPaymentDrawer open={paymentDrawerOpen} student={activeStudent} onClose={() => setPaymentDrawerOpen(false)} />
      <EditStudentDrawer open={editDrawerOpen} student={activeStudent} onClose={() => setEditDrawerOpen(false)} onSave={handleSaveEdit} />

      <Dialog open={Boolean(deleteUid)} onClose={() => setDeleteUid(null)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Student</DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color="text.secondary">Are you sure you want to remove this student?</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteUid(null)} sx={{ color: "#667085" }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} sx={{ borderRadius: 2 }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

