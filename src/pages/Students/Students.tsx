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
// import { GoPlus } from "react-icons/go";
import { MdDelete, MdMail } from "react-icons/md";
import { BsThreeDotsVertical, BsFolder2 } from "react-icons/bs";
import { TbAdjustmentsHorizontal, TbColumns3, TbCalendar } from "react-icons/tb";
import { HiChevronDown } from "react-icons/hi";
import { IoClose, IoSearchOutline } from "react-icons/io5";
import { MdEdit, MdPayment } from "react-icons/md";
import { TEACHERS_DATA, ALL_GROUPS, formatDate } from "../../constants/Teachers";
import { AddStudentDrawer } from "../../components/AddStudent/AddStudent";

/* ================= TYPES ================= */

interface FlatStudent {
  uid: string;
  id: number;
  name: string;
  phone: string;
  active: boolean;
  groupId: number;
  groupName: string;
  groupSchedule: string;
  groupBadge: string;
  groupBadgeColor: "blue" | "green" | "amber";
  course: string;
  teacher: string;
  teacherId: number;
  startDate: string;
  endDate: string;
  balance?: number;
}

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

/* ================= STATIC ================= */

const COURSES = [...new Set(ALL_GROUPS.map((g) => g.course))];

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

/* ================= HELPERS ================= */

const buildFlatStudents = (): FlatStudent[] => {
  const result: FlatStudent[] = [];
  TEACHERS_DATA.forEach((teacher) => {
    teacher.groups.forEach((group) => {
      group.students.forEach((student) => {
        result.push({
          uid: `${group.id}-${student.id}`,
          id: student.id,
          name: student.name,
          phone: student.phone,
          active: student.active,
          groupId: group.id,
          groupName: group.name,
          groupSchedule: group.schedule,
          groupBadge: group.badge,
          groupBadgeColor: group.badgeColor,
          course: group.course,
          teacher: teacher.fullName,
          teacherId: teacher.id,
          startDate: group.startDate,
          endDate: group.endDate,
          balance: Math.floor(Math.random() * -700000) - 100000,
        });
      });
    });
  });
  return result;
};

const INITIAL_STUDENTS = buildFlatStudents();

const badgeColorMap = {
  blue: { bg: "#dbeafe", color: "#1d4ed8" },
  green: { bg: "#dcfce7", color: "#15803d" },
  amber: { bg: "#fef9c3", color: "#b45309" },
};

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 50%, 45%)`;
};

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

const todayISO = new Date().toISOString().slice(0, 10);

/* ================= DROPDOWN FILTER ================= */

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
          borderRadius: "8px",
          borderColor: value ? "primary.main" : "#d0d5dd",
          color: value ? "primary.main" : "#667085",
          bgcolor: value ? "#eff8ff" : "white",
          fontWeight: 400,
          fontSize: 13,
          px: 1.5,
          py: 0.7,
          textTransform: "none",
          whiteSpace: "nowrap",
          "&:hover": { borderColor: "primary.main", bgcolor: "#eff8ff" },
        }}
      >
        {value ? (
          <Stack direction="row" alignItems="center" gap={0.5}>
            <span>{options.find((o) => o.value === value)?.label || value}</span>
            <IoClose
              size={13}
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
            />
          </Stack>
        ) : (
          label
        )}
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
            onClick={() => {
              onChange(o.value);
              setAnchor(null);
            }}
            sx={{ fontSize: 13 }}
          >
            {o.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

/* ================= ADD PAYMENT DRAWER ================= */

interface PaymentDrawerProps {
  open: boolean;
  student: FlatStudent | null;
  onClose: () => void;
}

const AddPaymentDrawer = ({ open, student, onClose }: PaymentDrawerProps) => {

  const [payMethod, setPayMethod] = useState("cash");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO);
  const [comment, setComment] = useState("");
  const [groupId, setGroupId] = useState("");

  React.useEffect(() => {
    if (student) setGroupId(String(student.groupId));
  }, [student]);

  const handleSubmit = () => {
    // Submit logic here
    onClose();
    setAmount("");
    setComment("");
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 420, p: 0, borderRadius: "16px 0 0 16px" },
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ px: 3, py: 2.5, borderBottom: "1px solid #f0f0f0" }}
      >
        <Typography fontWeight={700} fontSize={17}>
          Add payment
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "#9ca3af" }}>
          <IoClose size={20} />
        </IconButton>
      </Stack>

      {/* Body */}
      <Box sx={{ px: 3, py: 2.5, overflowY: "auto", flex: 1 }}>
        {/* Student */}
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#374151" mb={0.8}>
            Student
          </Typography>
          <Box
            sx={{
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              px: 1.5,
              py: 1.1,
              bgcolor: "#f9fafb",
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            {student?.name || "—"}
          </Box>
        </Box>

        {/* Balance */}
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#374151" mb={0.8}>
            Balance
          </Typography>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              bgcolor: "#1a3a4a",
              color: "white",
              borderRadius: "20px",
              px: 2,
              py: 0.4,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {student?.balance?.toLocaleString("ru-RU") ?? 0} UZS
          </Box>
        </Box>

        {/* Group */}
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#374151" mb={0.8}>
            Group
          </Typography>
          <TextField
            select
            fullWidth
            size="small"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 13 } }}
          >
            {ALL_GROUPS.map((g) => (
              <MenuItem key={g.id} value={String(g.id)} sx={{ fontSize: 13 }}>
                {g.name} ({g.schedule?.split("• ")[1] || g.schedule})
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Method pay */}
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#374151" mb={1}>
            Method pay
          </Typography>
          <RadioGroup
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
            sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5 }}
          >
            {PAY_METHODS.map((m) => (
              <FormControlLabel
                key={m.value}
                value={m.value}
                control={
                  <Radio
                    size="small"
                    sx={{
                      color: "#d0d5dd",
                      "&.Mui-checked": { color: "#1a3a4a" },
                      p: 0.5,
                    }}
                  />
                }
                label={<Typography fontSize={13} color="#374151">{m.label}</Typography>}
                sx={{ m: 0, gap: 0.5 }}
              />
            ))}
          </RadioGroup>
        </Box>

        {/* Amount */}
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#374151" mb={0.8}>
            Amount
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 13 } }}
          />
        </Box>

        {/* Date */}
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#374151" mb={0.8}>
            Date
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 13 } }}
          />
        </Box>

        {/* Comment */}
        <Box mb={3}>
          <Typography fontSize={13} fontWeight={500} color="#374151" mb={0.8}>
            Comment
          </Typography>
          <TextField
            fullWidth
            size="small"
            multiline
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 13 } }}
          />
        </Box>

        {/* Submit */}
        <Button
          variant="contained"
          fullWidth
          onClick={handleSubmit}
          sx={{
            borderRadius: "10px",
            py: 1.3,
            fontWeight: 600,
            fontSize: 14,
            bgcolor: "#1a3a4a",
            "&:hover": { bgcolor: "#122a38" },
            boxShadow: "none",
          }}
        >
          Submit
        </Button>
      </Box>
    </Drawer>
  );
};

/* ================= EDIT STUDENT DRAWER ================= */

interface EditDrawerProps {
  open: boolean;
  student: FlatStudent | null;
  onClose: () => void;
  onSave: (uid: string, data: { name: string; phone: string }) => void;
}

const EditStudentDrawer = ({ open, student, onClose, onSave }: EditDrawerProps) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("male");

  React.useEffect(() => {
    if (student) {
      setName(student.name);
      setPhone(student.phone.replace("+998 ", "").replace("+998", ""));
      setGender("male");
    }
  }, [student]);

  const handleSubmit = () => {
    if (student) {
      onSave(student.uid, { name, phone: `+998 ${phone}` });
    }
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 420, p: 0, borderRadius: "16px 0 0 16px" },
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ px: 3, py: 2.5, borderBottom: "1px solid #f0f0f0" }}
      >
        <Typography fontWeight={700} fontSize={17}>
          Edit Student
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "#9ca3af" }}>
          <IoClose size={20} />
        </IconButton>
      </Stack>

      {/* Body */}
      <Box sx={{ px: 3, py: 2.5, overflowY: "auto", flex: 1 }}>
        {/* Phone */}
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#374151" mb={0.8}>
            Phone
          </Typography>
          <Stack direction="row" gap={1}>
            <Box
              sx={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                px: 1.5,
                py: 1.1,
                bgcolor: "#f9fafb",
                fontSize: 13,
                color: "#374151",
                whiteSpace: "nowrap",
                minWidth: 60,
                textAlign: "center",
              }}
            >
              +998
            </Box>
            <TextField
              fullWidth
              size="small"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="93 650 87 92"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 13 } }}
            />
          </Stack>
        </Box>

        {/* Name */}
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#374151" mb={0.8}>
            Name
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 13 } }}
          />
        </Box>

        {/* Date of birth */}
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#374151" mb={0.8}>
            Date of birth
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            InputLabelProps={{ shrink: true }}
            placeholder="No date selected"
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 13 } }}
          />
        </Box>

        {/* Gender */}
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#374151" mb={1}>
            Gender
          </Typography>
          <RadioGroup
            row
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            sx={{ gap: 3 }}
          >
            <FormControlLabel
              value="male"
              control={
                <Radio
                  size="small"
                  sx={{ color: "#d0d5dd", "&.Mui-checked": { color: "#1a3a4a" }, p: 0.5 }}
                />
              }
              label={<Typography fontSize={13} color="#374151">Male</Typography>}
              sx={{ m: 0, gap: 0.5 }}
            />
            <FormControlLabel
              value="female"
              control={
                <Radio
                  size="small"
                  sx={{ color: "#d0d5dd", "&.Mui-checked": { color: "#1a3a4a" }, p: 0.5 }}
                />
              }
              label={<Typography fontSize={13} color="#374151">Female</Typography>}
              sx={{ m: 0, gap: 0.5 }}
            />
          </RadioGroup>
        </Box>

        {/* Photo */}
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#374151" mb={0.8}>
            Photo
          </Typography>
          <Stack direction="row" gap={1}>
            <TextField
              fullWidth
              size="small"
              placeholder="No file chosen"
              InputProps={{ readOnly: true }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 13 } }}
            />
            <Button
              variant="outlined"
              component="label"
              sx={{
                borderRadius: "8px",
                borderColor: "#e5e7eb",
                color: "#374151",
                fontSize: 13,
                textTransform: "none",
                whiteSpace: "nowrap",
                px: 2,
              }}
            >
              Browse
              <input type="file" hidden accept="image/*" />
            </Button>
          </Stack>
        </Box>

        {/* Additional contacts */}
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#374151" mb={1}>
            additional contacts
          </Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {["📞", "🔑", "👤", "✉️", "✈️", "🎓", "📍", "🪪"].map((icon, i) => (
              <Box
                key={i}
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  border: "1.5px solid #e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  cursor: "pointer",
                  "&:hover": { borderColor: "#1a3a4a" },
                }}
              >
                {icon}
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Tags */}
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#374151" mb={0.8}>
            Tags
          </Typography>
          <TextField
            select
            fullWidth
            size="small"
            defaultValue=""
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 13 } }}
          >
            <MenuItem value="" disabled sx={{ fontSize: 13 }}>
              Add new tags
            </MenuItem>
            <MenuItem value="new" sx={{ fontSize: 13 }}>New</MenuItem>
            <MenuItem value="vip" sx={{ fontSize: 13 }}>VIP</MenuItem>
            <MenuItem value="risk" sx={{ fontSize: 13 }}>At risk</MenuItem>
          </TextField>
        </Box>

        {/* Set password */}
        <Box mb={3} textAlign="right">
          <Button
            variant="text"
            size="small"
            sx={{ fontSize: 13, color: "#1a3a4a", textDecoration: "underline", textTransform: "none" }}
          >
            + Set password
          </Button>
        </Box>

        {/* Submit */}
        <Button
          variant="contained"
          fullWidth
          onClick={handleSubmit}
          sx={{
            borderRadius: "10px",
            py: 1.3,
            fontWeight: 600,
            fontSize: 14,
            bgcolor: "#1a3a4a",
            "&:hover": { bgcolor: "#122a38" },
            boxShadow: "none",
          }}
        >
          Submit
        </Button>
      </Box>
    </Drawer>
  );
};

/* ================= MAIN COMPONENT ================= */

export const Students = () => {
  const [students, setStudents] = useState<FlatStudent[]>(INITIAL_STUDENTS);
  const [selected, setSelected] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [visibleCols, setVisibleCols] = useState<string[]>(ALL_COLUMNS.map((c) => c.key));
  const [columnsAnchor, setColumnsAnchor] = useState<null | HTMLElement>(null);
  const [actionMenu, setActionMenu] = useState<{ el: HTMLElement; uid: string } | null>(null);
  const [deleteUid, setDeleteUid] = useState<string | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: "", phone: "", groupId: "" });

  const [addDrawerOpen, setAddDrawerOpen] = useState(false);

  // Drawer states
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState<FlatStudent | null>(null);

  const [filters, setFilters] = useState<Filters>({
    search: "",
    course: "",
    status: "",
    teacher: "",
    startDate: "",
    endDate: "",
  });

  const setFilter = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setFilters((p) => ({ ...p, [key]: val }));

  const clearAll = () =>
    setFilters({ search: "", course: "", status: "", teacher: "", startDate: "", endDate: "" });

  const hasFilters = Object.values(filters).some(Boolean);

  /* === FILTERED + SORTED === */

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
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  /* === SELECT === */

  const allSelected = filtered.length > 0 && filtered.every((s) => selected.includes(s.uid));
  const toggleAll = () => setSelected(allSelected ? [] : filtered.map((s) => s.uid));
  const toggleOne = (uid: string) =>
    setSelected((p) => (p.includes(uid) ? p.filter((x) => x !== uid) : [...p, uid]));

  /* === DELETE === */

  const handleDeleteConfirm = () => {
    if (deleteUid) {
      setStudents((p) => p.filter((s) => s.uid !== deleteUid));
      setSelected((p) => p.filter((x) => x !== deleteUid));
      setDeleteUid(null);
    }
  };

  const handleDeleteSelected = () => {
    setStudents((p) => p.filter((s) => !selected.includes(s.uid)));
    setSelected([]);
  };

  /* === ACTION MENU HANDLERS === */

  const openActionMenu = (e: React.MouseEvent<HTMLButtonElement>, uid: string) => {
    e.stopPropagation();
    const student = students.find((s) => s.uid === uid) || null;
    setActiveStudent(student);
    setActionMenu(actionMenu?.uid === uid ? null : { el: e.currentTarget, uid });
  };

  const handleOpenPayment = () => {
    setActionMenu(null);
    setPaymentDrawerOpen(true);
  };

  const handleOpenEdit = () => {
    setActionMenu(null);
    setEditDrawerOpen(true);
  };

  const handleOpenDelete = (uid: string) => {
    setActionMenu(null);
    setDeleteUid(uid);
  };

  /* === EDIT SAVE === */

  const handleSaveEdit = (uid: string, data: { name: string; phone: string }) => {
    setStudents((prev) =>
      prev.map((s) => (s.uid === uid ? { ...s, name: data.name, phone: data.phone } : s))
    );
  };

  /* === ADD STUDENT === */

  const handleAddStudent = () => {
    const group = ALL_GROUPS.find((g) => g.id === Number(newStudent.groupId));
    const teacher = TEACHERS_DATA.find((t) =>
      t.groups.some((g) => g.id === Number(newStudent.groupId))
    );
    if (!group || !teacher || !newStudent.name) return;

    const newEntry: FlatStudent = {
      uid: `${group.id}-${Date.now()}`,
      id: Date.now(),
      name: newStudent.name,
      phone: newStudent.phone,
      active: true,
      groupId: group.id,
      groupName: group.name,
      groupSchedule: group.schedule,
      groupBadge: group.badge,
      groupBadgeColor: group.badgeColor,
      course: group.course,
      teacher: teacher.fullName,
      teacherId: teacher.id,
      startDate: group.startDate,
      endDate: group.endDate,
      balance: 0,
    };
    setStudents((p) => [...p, newEntry]);
    setNewStudent({ name: "", phone: "", groupId: "" });
    setOpenAdd(false);
  };

  const col = (key: string) => visibleCols.includes(key);

  /* ================= UI ================= */

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" alignItems="baseline" gap={1.5}>
          <Typography variant="h5" fontWeight={700} fontSize={26}>
            Students
          </Typography>
          <Typography fontSize={14} color="text.secondary">
            Quantity — {filtered.length}
          </Typography>
        </Stack>
        <Button sx={{background: "#5c7fa3", color: "white", padding: "10px 20px"}} onClick={() => setAddDrawerOpen(true)}>
        Add New
      </Button>
      </Stack>

      <AddStudentDrawer
        open={addDrawerOpen}
        onClose={() => setAddDrawerOpen(false)}
        onSubmit={(data) => {
          console.log("NEW STUDENT:", data);

          // keyin shu yerda studentsga push qilasan
        }}
      />

      {/* FILTER ROW */}
      <Stack direction="row" flexWrap="wrap" gap={1} mb={1}>
        {/* Search */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            border: "1px solid #d0d5dd",
            borderRadius: "8px",
            px: 1.2,
            py: 0.5,
            bgcolor: "white",
            minWidth: 180,
          }}
        >
          <IoSearchOutline size={15} color="#9ca3af" />
          <input
            placeholder="Search by name or phone"
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            style={{
              border: "none",
              outline: "none",
              fontSize: 13,
              color: "#374151",
              background: "transparent",
              width: "100%",
            }}
          />
          {filters.search && (
            <IoClose
              size={13}
              color="#9ca3af"
              style={{ cursor: "pointer" }}
              onClick={() => setFilter("search", "")}
            />
          )}
        </Box>

        <DropdownFilter
          label="By Courses"
          value={filters.course}
          options={COURSES.map((c) => ({ value: c, label: c }))}
          onChange={(v) => setFilter("course", v)}
          onClear={() => setFilter("course", "")}
        />

        <DropdownFilter
          label="Status"
          value={filters.status}
          options={[
            { value: "active", label: "🟢 Active" },
            { value: "inactive", label: "🔴 Inactive" },
          ]}
          onChange={(v) => setFilter("status", v as "active" | "inactive")}
          onClear={() => setFilter("status", "")}
        />

        <DropdownFilter
          label="Financial situation"
          value=""
          options={[
            { value: "paid", label: "Paid" },
            { value: "debt", label: "In debt" },
          ]}
          onChange={() => {}}
          onClear={() => {}}
        />

        <DropdownFilter
          label="By Tags"
          value=""
          options={[
            { value: "new", label: "New" },
            { value: "vip", label: "VIP" },
          ]}
          onChange={() => {}}
          onClear={() => {}}
        />

        {/* External ID */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            border: "1px solid #d0d5dd",
            borderRadius: "8px",
            px: 1.2,
            py: 0.5,
            bgcolor: "white",
          }}
        >
          <input
            placeholder="External ID"
            style={{
              border: "none",
              outline: "none",
              fontSize: 13,
              color: "#374151",
              background: "transparent",
              width: 90,
            }}
          />
        </Box>

        {/* Date */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<TbCalendar size={13} />}
          component="label"
          sx={{
            borderRadius: "8px",
            borderColor: filters.startDate ? "primary.main" : "#d0d5dd",
            color: filters.startDate ? "primary.main" : "#667085",
            fontSize: 13,
            fontWeight: 400,
            px: 1.5,
            textTransform: "none",
            position: "relative",
          }}
        >
          {filters.startDate ? formatDate(filters.startDate) : "Start date"}
          <input
            type="date"
            style={{ position: "absolute", opacity: 0, inset: 0, cursor: "pointer" }}
            value={filters.startDate}
            onChange={(e) => setFilter("startDate", e.target.value)}
          />
        </Button>

        <Button
          variant="outlined"
          size="small"
          startIcon={<TbCalendar size={13} />}
          component="label"
          sx={{
            borderRadius: "8px",
            borderColor: filters.endDate ? "primary.main" : "#d0d5dd",
            color: filters.endDate ? "primary.main" : "#667085",
            fontSize: 13,
            fontWeight: 400,
            px: 1.5,
            textTransform: "none",
            position: "relative",
          }}
        >
          {filters.endDate ? formatDate(filters.endDate) : "End date"}
          <input
            type="date"
            style={{ position: "absolute", opacity: 0, inset: 0, cursor: "pointer" }}
            value={filters.endDate}
            onChange={(e) => setFilter("endDate", e.target.value)}
          />
        </Button>
      </Stack>

      {hasFilters && (
        <Box mb={1}>
          <Button
            size="small"
            startIcon={<IoClose />}
            onClick={clearAll}
            variant="outlined"
            sx={{
              borderRadius: "8px",
              borderColor: "#d0d5dd",
              color: "#667085",
              fontSize: 12,
              px: 1.5,
              textTransform: "none",
            }}
          >
            Clear all
          </Button>
        </Box>
      )}

      {/* FILTERS + COLUMNS + BULK ACTIONS */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        {selected.length > 0 ? (
          <Stack direction="row" gap={1} alignItems="center">
            <Typography fontSize={13} color="text.secondary">
              {selected.length} selected
            </Typography>
            <Tooltip title="Delete selected">
              <IconButton size="small" color="error" onClick={handleDeleteSelected}>
                <MdDelete size={17} />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : (
          <Box />
        )}

        <Stack direction="row" gap={1}>
          <Button
            size="small"
            startIcon={<TbAdjustmentsHorizontal size={14} />}
            variant="outlined"
            sx={{
              borderRadius: "8px",
              borderColor: "#d0d5dd",
              color: "#667085",
              fontSize: 12,
              px: 1.5,
              textTransform: "none",
            }}
          >
            Filters
          </Button>
          <Button
            size="small"
            startIcon={<TbColumns3 size={14} />}
            variant="outlined"
            onClick={(e) => setColumnsAnchor(e.currentTarget)}
            sx={{
              borderRadius: "8px",
              borderColor: "#d0d5dd",
              color: "#667085",
              fontSize: 12,
              px: 1.5,
              textTransform: "none",
            }}
          >
            Columns
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
                  setVisibleCols((p) =>
                    p.includes(c.key) ? p.filter((k) => k !== c.key) : [...p, c.key]
                  )
                }
                sx={{ fontSize: 13, gap: 1 }}
              >
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: 0.5,
                    border: "2px solid",
                    borderColor: visibleCols.includes(c.key) ? "primary.main" : "#d0d5dd",
                    bgcolor: visibleCols.includes(c.key) ? "primary.main" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {visibleCols.includes(c.key) && (
                    <Box sx={{ width: 8, height: 8, bgcolor: "white", borderRadius: 0.25 }} />
                  )}
                </Box>
                {c.label}
              </MenuItem>
            ))}
          </Menu>
        </Stack>
      </Stack>

      {/* TABLE */}
      <Paper sx={{ borderRadius: 3, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    fontWeight: 600,
                    fontSize: 13,
                    color: "#374151",
                    py: 1.5,
                    borderBottom: "1px solid #e5e7eb",
                    bgcolor: "white",
                  },
                }}
              >
                <TableCell sx={{ width: 32, pr: 0 }} />
                <TableCell sx={{ width: 32, pl: 0 }}>
                  <Checkbox size="small" checked={allSelected} onChange={toggleAll} sx={{ p: 0 }} />
                </TableCell>
                {col("photo") && <TableCell>Photo</TableCell>}
                {col("name") && (
                  <TableCell>
                    <TableSortLabel
                      active={sortKey === "name"}
                      direction={sortDir}
                      onClick={() => handleSort("name")}
                    >
                      Name
                    </TableSortLabel>
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
                      <IconButton size="small" sx={{ color: "#9ca3af" }}>
                        <BsFolder2 size={15} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Mail selected">
                      <IconButton size="small" sx={{ color: "#9ca3af" }}>
                        <MdMail size={15} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete selected">
                      <IconButton size="small" sx={{ color: "#9ca3af" }} onClick={handleDeleteSelected}>
                        <MdDelete size={15} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filtered.map((s, i) => {
                const badge = badgeColorMap[s.groupBadgeColor];
                const isSelected = selected.includes(s.uid);
                return (
                  <TableRow
                    key={s.uid}
                    hover
                    sx={{
                      "& td": { borderBottom: "1px solid #f3f4f6", py: 1.4, fontSize: 13 },
                      "&:last-child td": { borderBottom: "none" },
                      bgcolor: isSelected ? "#f0f7ff" : "white",
                      "&:hover": { bgcolor: isSelected ? "#e8f2ff" : "#f9fafb" },
                    }}
                  >
                    <TableCell sx={{ color: "#9ca3af", fontSize: 12, pr: 0, width: 32 }}>
                      {i + 1}.
                    </TableCell>
                    <TableCell sx={{ pl: 0, width: 32 }}>
                      <Checkbox
                        size="small"
                        checked={isSelected}
                        onChange={() => toggleOne(s.uid)}
                        sx={{ p: 0 }}
                      />
                    </TableCell>

                    {col("photo") && (
                      <TableCell>
                        <Avatar
                          sx={{
                            width: 34,
                            height: 34,
                            fontSize: 13,
                            fontWeight: 700,
                            bgcolor: stringToColor(s.name),
                          }}
                        >
                          {initials(s.name)}
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
                        <Typography fontSize={13} color="primary.main" sx={{ cursor: "pointer" }}>
                          {s.phone}
                        </Typography>
                      </TableCell>
                    )}

                    {col("groups") && (
                      <TableCell sx={{ minWidth: 220 }}>
                        <Stack direction="row" alignItems="center" gap={0.5} flexWrap="wrap">
                          <Chip
                            label={s.groupBadge}
                            size="small"
                            sx={{
                              fontSize: 10,
                              height: 20,
                              fontWeight: 600,
                              bgcolor: badge.bg,
                              color: badge.color,
                            }}
                          />
                          <Typography fontSize={13} color="#374151">
                            {s.groupName}
                          </Typography>
                          <Typography fontSize={12} color="#9ca3af">
                            ({s.groupSchedule.split("• ")[1] || ""})
                          </Typography>
                        </Stack>
                      </TableCell>
                    )}

                    {col("teachers") && (
                      <TableCell sx={{ minWidth: 140, color: "#374151" }}>{s.teacher}</TableCell>
                    )}

                    {col("training") && (
                      <TableCell sx={{ minWidth: 120 }}>
                        <Typography fontSize={13} color="#9ca3af">
                          {formatDate(s.startDate)} —
                        </Typography>
                        <Typography fontSize={13} color="#9ca3af">
                          {formatDate(s.endDate)}
                        </Typography>
                      </TableCell>
                    )}

                    {col("balance") && (
                      <TableCell>
                        <Typography
                          fontSize={13}
                          fontWeight={500}
                          color={(s.balance ?? 0) < 0 ? "#ef4444" : "#16a34a"}
                        >
                          {(s.balance ?? 0).toLocaleString("ru-RU")}
                        </Typography>
                      </TableCell>
                    )}

                    {col("comment") && <TableCell />}

                    {/* ACTIONS */}
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        size="small"
                        onClick={(e) => openActionMenu(e, s.uid)}
                        sx={{ color: "#6b7280" }}
                      >
                        <BsThreeDotsVertical size={15} />
                      </IconButton>

                      {/* CONTEXT MENU */}
                      <Menu
                        anchorEl={actionMenu?.uid === s.uid ? actionMenu.el : null}
                        open={actionMenu?.uid === s.uid}
                        onClose={() => setActionMenu(null)}
                        PaperProps={{
                          sx: {
                            borderRadius: 2,
                            minWidth: 170,
                            boxShadow: "0 4px 20px rgba(0,0,0,0.13)",
                            border: "1px solid #f0f0f0",
                          },
                        }}
                        transformOrigin={{ horizontal: "right", vertical: "top" }}
                        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                      >
                        {/* Edit Student */}
                        <MenuItem
                          onClick={handleOpenEdit}
                          sx={{ fontSize: 13, gap: 1.2, py: 1.2, color: "#374151" }}
                        >
                          <MdEdit size={16} color="#6b7280" />
                          Edit Student
                        </MenuItem>

                        <Divider sx={{ my: 0.5 }} />

                        {/* Add payment */}
                        <MenuItem
                          onClick={handleOpenPayment}
                          sx={{ fontSize: 13, gap: 1.2, py: 1.2, color: "#16a34a" }}
                        >
                          <MdPayment size={16} color="#16a34a" />
                          Add payment
                        </MenuItem>

                        <Divider sx={{ my: 0.5 }} />

                        {/* Remove */}
                        <MenuItem
                          onClick={() => handleOpenDelete(s.uid)}
                          sx={{ fontSize: 13, gap: 1.2, py: 1.2, color: "#ef4444" }}
                        >
                          <MdDelete size={16} />
                          Remove
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
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: 3, py: 1.5, borderTop: "1px solid #f3f4f6" }}
        >
          <Typography fontSize={13} color="text.secondary">
            1–{Math.min(filtered.length, 20)} of {filtered.length}
          </Typography>
          <Stack direction="row" gap={0.5}>
            <Button
              size="small"
              variant="outlined"
              sx={{ minWidth: 32, px: 1, borderColor: "#e5e7eb", color: "#374151", borderRadius: 2 }}
            >
              {"<"}
            </Button>
            <Button
              size="small"
              variant="outlined"
              sx={{ minWidth: 32, px: 1, borderColor: "#e5e7eb", color: "#374151", borderRadius: 2 }}
            >
              {">"}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* ADD STUDENT DIALOG */}
      <Dialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Add Student</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Full name"
              size="small"
              value={newStudent.name}
              onChange={(e) => setNewStudent((p) => ({ ...p, name: e.target.value }))}
            />
            <TextField
              label="Phone"
              size="small"
              value={newStudent.phone}
              onChange={(e) => setNewStudent((p) => ({ ...p, phone: e.target.value }))}
            />
            <TextField
              select
              label="Group"
              size="small"
              value={newStudent.groupId}
              onChange={(e) => setNewStudent((p) => ({ ...p, groupId: e.target.value }))}
            >
              {ALL_GROUPS.map((g) => (
                <MenuItem key={g.id} value={String(g.id)}>
                  {g.name} — {g.course}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenAdd(false)} sx={{ color: "#667085" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddStudent}
            disabled={!newStudent.name || !newStudent.groupId}
            sx={{ borderRadius: 2, bgcolor: "#1a3a4a", "&:hover": { bgcolor: "#122a38" } }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRM */}
      <Dialog
        open={Boolean(deleteUid)}
        onClose={() => setDeleteUid(null)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Student</DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color="text.secondary">
            Are you sure you want to remove this student?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteUid(null)} sx={{ color: "#667085" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            sx={{ borderRadius: 2 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ADD PAYMENT DRAWER */}
      <AddPaymentDrawer
        open={paymentDrawerOpen}
        student={activeStudent}
        onClose={() => setPaymentDrawerOpen(false)}
      />

      {/* EDIT STUDENT DRAWER */}
      <EditStudentDrawer
        open={editDrawerOpen}
        student={activeStudent}
        onClose={() => setEditDrawerOpen(false)}
        onSave={handleSaveEdit}
      />
    </Box>
  );
};