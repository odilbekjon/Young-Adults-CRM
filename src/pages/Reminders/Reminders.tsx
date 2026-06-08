import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputLabel,
  FormControl,
  IconButton,
  // Popover,
} from "@mui/material";
import {
  MdAdd,
  MdClose,
  MdCheck,
  MdAccessTime,
  MdPerson,
  MdGroup,
  MdCalendarToday,
} from "react-icons/md";
import { useState, useRef } from "react";

// ─── Mock teachers ────────────────────────────────────────────────────────────
const TEACHERS = [
  { id: 1, name: "Alisher Karimov" },
  { id: 2, name: "Malika Yusupova" },
  { id: 3, name: "Jasur Toshmatov" },
  { id: 4, name: "Nilufar Rahimova" },
  { id: 5, name: "Bobur Xasanov" },
];

type ReminderStatus = "overdue" | "today" | "future";
type FilterStatus = "active" | "done" | "";

type Reminder = {
  id: number;
  title: string;
  description: string;
  date: string;
  dateValue: string; // "YYYY-MM-DD"
  status: ReminderStatus;
  assigneeId: number | "";
  tags: string;
  isDone: boolean;
};

const emptyForm = {
  title: "",
  description: "",
  tags: "",
  priority: "",
  datetime: new Date(new Date().setHours(23, 59, 0, 0))
    .toISOString()
    .slice(0, 16),
  assigneeId: "" as number | "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcStatus(datetimeStr: string): ReminderStatus {
  const selected = new Date(datetimeStr);
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  if (selected < now) return "overdue";
  if (selected >= todayStart && selected < tomorrowStart) return "today";
  return "future";
}

function formatDate(datetimeStr: string): string {
  return datetimeStr.replace("T", " ");
}

// ─── Filter select style ──────────────────────────────────────────────────────
const filterSelectSx = {
  bgcolor: "#fff",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#dde1e9" },
  "& .MuiSelect-select": { py: "7px", px: "12px", fontSize: 13.5, color: "#555" },
  borderRadius: "6px",
  minWidth: 150,
};

// ─── Date filter button (no external lib) ─────────────────────────────────────
function DateFilterButton({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string; // "YYYY-MM-DD" or ""
  onChange: (v: string) => void;
}) {
  const [, setAnchor] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = value
    ? value.split("-").reverse().join(".")
    : null;

  return (
    <>
      <Box
        onClick={(e) => {
          setAnchor(e.currentTarget);
          // native calendar ni ochish uchun kichik timeout
          setTimeout(() => inputRef.current?.showPicker?.(), 50);
        }}
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 0.8,
          bgcolor: "#fff",
          border: "1px solid #dde1e9",
          borderRadius: "6px",
          px: 1.5,
          py: "7px",
          fontSize: 13.5,
          color: displayValue ? "#222" : "#555",
          cursor: "pointer",
          minWidth: 160,
          userSelect: "none",
          "&:hover": { borderColor: "#bbb" },
        }}
      >
        <MdCalendarToday size={15} color="#888" />
        {displayValue ?? label}
        {displayValue && (
          <Box
            component="span"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            sx={{
              ml: "auto",
              display: "flex",
              color: "#aaa",
              "&:hover": { color: "#555" },
            }}
          >
            <MdClose size={14} />
          </Box>
        )}
        {/* Hidden native date input */}
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setAnchor(null);
          }}
          style={{
            position: "absolute",
            opacity: 0,
            width: 0,
            height: 0,
            pointerEvents: "none",
          }}
        />
      </Box>
    </>
  );
}

// ─── CountBox ─────────────────────────────────────────────────────────────────
const CountBox = ({ count, color }: { count: number; color: string }) => (
  <Box
    sx={{
      width: 34,
      height: 34,
      border: `2px solid ${color}`,
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color,
      fontWeight: 700,
      fontSize: 17,
    }}
  >
    {count}
  </Box>
);

const NoMore = () => (
  <Box
    display="flex"
    alignItems="center"
    justifyContent="center"
    gap={0.8}
    py={2}
    sx={{ color: "#aaa", fontSize: 13 }}
  >
    <MdCheck color="#4caf50" size={14} />
    No more
  </Box>
);

// ─── Column ───────────────────────────────────────────────────────────────────
function Column({
  label,
  color,
  items,
  onDone,
}: {
  label: string;
  color: string;
  items: Reminder[];
  onDone: (id: number) => void;
}) {
  return (
    <Box flex={1} pr={3} sx={{ "&:last-child": { pr: 0 } }}>
      <Box
        display="flex"
        alignItems="center"
        gap={1.2}
        pb={1.5}
        mb={1.5}
        borderBottom="1.5px solid #e0e3ea"
      >
        <CountBox count={items.length} color={color} />
        <Typography fontWeight={600} fontSize={16} color="#333">
          {label}
        </Typography>
      </Box>
      {items.map((r) => (
        <Box
          key={r.id}
          sx={{
            bgcolor: r.isDone ? "#f5f5f5" : "#fff",
            borderRadius: "8px",
            p: 2,
            mb: 1.5,
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
            opacity: r.isDone ? 0.7 : 1,
          }}
        >
          <Box display="flex" alignItems="flex-start" justifyContent="space-between">
            <Typography
              fontWeight={600}
              fontSize={14}
              mb={0.5}
              sx={{
                textDecoration: r.isDone ? "line-through" : "none",
                color: r.isDone ? "#aaa" : "#222",
              }}
            >
              {r.title}
            </Typography>
            {!r.isDone && (
              <IconButton
                size="small"
                title="Mark as done"
                onClick={() => onDone(r.id)}
                sx={{ ml: 1, color: "#4caf50", p: 0.3 }}
              >
                <MdCheck size={16} />
              </IconButton>
            )}
          </Box>
          <Box
            display="flex"
            alignItems="center"
            gap={0.6}
            sx={{ color: "#999", fontSize: 12 }}
          >
            <MdAccessTime size={13} />
            {r.date}
          </Box>
          {r.description && (
            <Typography fontSize={12} color="text.secondary" mt={0.5}>
              {r.description}
            </Typography>
          )}
          {r.assigneeId !== "" && (
            <Box display="flex" alignItems="center" gap={0.5} mt={0.8}>
              <MdPerson size={13} color="#aaa" />
              <Typography fontSize={12} color="#888">
                {TEACHERS.find((t) => t.id === r.assigneeId)?.name}
              </Typography>
            </Box>
          )}
          {r.tags && (
            <Chip
              label={r.tags}
              size="small"
              sx={{
                mt: 0.8,
                fontSize: 11,
                height: 20,
                bgcolor: "#e3f2fd",
                color: "#1976d2",
              }}
            />
          )}
        </Box>
      ))}
      {items.length === 0 && <NoMore />}
    </Box>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export const Reminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Filters
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("");
  const [filterAssignee, setFilterAssignee] = useState<number | "">("");
  const [filterTags, setFilterTags] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Active chips
  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (filterStatus)
    activeChips.push({
      key: "status",
      label: filterStatus === "active" ? "Active" : "Done",
      clear: () => setFilterStatus(""),
    });
  if (filterAssignee)
    activeChips.push({
      key: "assignee",
      label: TEACHERS.find((t) => t.id === filterAssignee)?.name ?? "",
      clear: () => setFilterAssignee(""),
    });
  if (filterTags)
    activeChips.push({ key: "tags", label: filterTags, clear: () => setFilterTags("") });
  if (filterDateFrom)
    activeChips.push({
      key: "from",
      label: `From: ${filterDateFrom.split("-").reverse().join(".")}`,
      clear: () => setFilterDateFrom(""),
    });
  if (filterDateTo)
    activeChips.push({
      key: "to",
      label: `To: ${filterDateTo.split("-").reverse().join(".")}`,
      clear: () => setFilterDateTo(""),
    });

  // Filter logic
  const filtered = reminders.filter((r) => {
    if (filterStatus === "active" && r.isDone) return false;
    if (filterStatus === "done" && !r.isDone) return false;
    if (filterAssignee && r.assigneeId !== filterAssignee) return false;
    if (filterTags && r.tags !== filterTags) return false;
    if (filterDateFrom && r.dateValue < filterDateFrom) return false;
    if (filterDateTo && r.dateValue > filterDateTo) return false;
    return true;
  });

  const overdue = filtered.filter((r) => r.status === "overdue");
  const today = filtered.filter((r) => r.status === "today");
  const future = filtered.filter((r) => r.status === "future");

  const allTags = Array.from(
    new Set(reminders.map((r) => r.tags).filter(Boolean))
  );

  const handleCreate = () => {
    if (!form.title.trim()) return;
    setReminders((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: form.title,
        description: form.description,
        date: formatDate(form.datetime),
        dateValue: form.datetime.slice(0, 10),
        status: calcStatus(form.datetime),
        assigneeId: form.assigneeId,
        tags: form.tags,
        isDone: false,
      },
    ]);
    setForm(emptyForm);
    setOpen(false);
  };

  const handleDone = (id: number) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isDone: true } : r))
    );
  };

  return (
    <Box p={4} bgcolor="#f0f2f5" minHeight="100vh">
      {/* HEADER */}
      <Typography variant="h5" fontWeight={700} color="#1a1a2e" mb={2.5}>
        Reminders
      </Typography>

      {/* FILTERS */}
      <Box display="flex" flexWrap="wrap" alignItems="center" gap={1.2} mb={activeChips.length ? 1.5 : 4}>
        {/* Status */}
        <Select
          displayEmpty
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          sx={filterSelectSx}
        >
          <MenuItem value="" disabled sx={{ fontSize: 13.5, color: "#555" }}>
            Select status
          </MenuItem>
          <MenuItem value="active" sx={{ fontSize: 13.5 }}>
            Active
          </MenuItem>
          <MenuItem value="done" sx={{ fontSize: 13.5 }}>
            Done
          </MenuItem>
        </Select>

        {/* Assignee */}
        <Select
          displayEmpty
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value as number | "")}
          sx={filterSelectSx}
        >
          <MenuItem value="" disabled sx={{ fontSize: 13.5, color: "#555" }}>
            Select assignee
          </MenuItem>
          {TEACHERS.map((t) => (
            <MenuItem key={t.id} value={t.id} sx={{ fontSize: 13.5 }}>
              {t.name}
            </MenuItem>
          ))}
        </Select>

        {/* Tags */}
        <Select
          displayEmpty
          value={filterTags}
          onChange={(e) => setFilterTags(e.target.value)}
          sx={filterSelectSx}
        >
          <MenuItem value="" disabled sx={{ fontSize: 13.5, color: "#555" }}>
            Select tags
          </MenuItem>
          {allTags.map((tag) => (
            <MenuItem key={tag} value={tag} sx={{ fontSize: 13.5 }}>
              {tag}
            </MenuItem>
          ))}
        </Select>

        {/* Date from */}
        <DateFilterButton
          label="Select date (from)"
          value={filterDateFrom}
          onChange={setFilterDateFrom}
        />

        {/* Date to */}
        <DateFilterButton
          label="Select date (to)"
          value={filterDateTo}
          onChange={setFilterDateTo}
        />

        <Button
          variant="contained"
          startIcon={<MdAdd />}
          onClick={() => setOpen(true)}
          sx={{
            ml: "auto",
            bgcolor: "#2196f3",
            borderRadius: "6px",
            textTransform: "none",
            fontWeight: 500,
            px: 2.5,
            "&:hover": { bgcolor: "#1976d2" },
          }}
        >
          Add
        </Button>
      </Box>

      {/* FILTER CHIPS */}
      {activeChips.length > 0 && (
        <Box display="flex" flexWrap="wrap" gap={0.8} mb={3}>
          {activeChips.map((chip) => (
            <Chip
              key={chip.key}
              label={chip.label}
              onDelete={chip.clear}
              deleteIcon={<MdClose />}
              size="small"
              sx={{
                bgcolor: "#fff",
                border: "1px solid #dde1e9",
                borderRadius: "6px",
                fontSize: 12.5,
                "& .MuiChip-deleteIcon": { fontSize: 15 },
              }}
            />
          ))}
          <Chip
            label="Clear all"
            onClick={() => {
              setFilterStatus("");
              setFilterAssignee("");
              setFilterTags("");
              setFilterDateFrom("");
              setFilterDateTo("");
            }}
            size="small"
            sx={{
              bgcolor: "#ffebee",
              color: "#f44336",
              border: "1px solid #ffcdd2",
              borderRadius: "6px",
              fontSize: 12.5,
              cursor: "pointer",
            }}
          />
        </Box>
      )}

      {/* COLUMNS */}
      <Box display="flex" gap={0}>
        <Column label="Overdue" color="#f44336" items={overdue} onDone={handleDone} />
        <Column label="Today" color="#2196f3" items={today} onDone={handleDone} />
        <Column label="Future" color="#9e9e9e" items={future} onDone={handleDone} />
      </Box>

      {/* CREATE MODAL */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: { borderRadius: "10px", width: 460, maxWidth: "95vw", p: "4px" },
        }}
      >
        <DialogTitle sx={{ fontSize: 19, fontWeight: 600, color: "#1a1a2e", pb: 1 }}>
          Create reminder
          <IconButton
            onClick={() => setOpen(false)}
            sx={{ position: "absolute", right: 12, top: 12, color: "#aaa" }}
          >
            <MdClose />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: "8px !important" }}>
          <InputLabel sx={{ fontSize: 13.5, fontWeight: 600, color: "#333", mb: 0.6 }}>
            <span style={{ color: "#f44336" }}>*</span>Title
          </InputLabel>
          <TextField
            fullWidth
            placeholder="Enter title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            size="small"
            sx={{ mb: 2 }}
          />

          <InputLabel sx={{ fontSize: 13.5, fontWeight: 600, color: "#333", mb: 0.6 }}>
            Description
          </InputLabel>
          <TextField
            fullWidth
            multiline
            minRows={3}
            placeholder="Enter description"
            inputProps={{ maxLength: 255 }}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            size="small"
            sx={{ mb: 0.5 }}
          />
          <Typography fontSize={12} color="text.secondary" textAlign="right" mb={2}>
            {form.description.length}/255
          </Typography>

          <InputLabel sx={{ fontSize: 13.5, fontWeight: 600, color: "#333", mb: 0.6 }}>
            Tags
          </InputLabel>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <Select
              displayEmpty
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            >
              <MenuItem value="">Select tags</MenuItem>
              <MenuItem value="Payment">Payment</MenuItem>
              <MenuItem value="Meeting">Meeting</MenuItem>
              <MenuItem value="Urgent">Urgent</MenuItem>
              <MenuItem value="Follow-up">Follow-up</MenuItem>
            </Select>
          </FormControl>

          <Typography fontSize={13.5} fontWeight={600} color="#333" mb={1}>
            Details
          </Typography>

          <Box display="flex" alignItems="center" gap={1.2} mb={1.2}>
            <MdPerson size={18} color="#aaa" />
            <FormControl fullWidth size="small">
              <Select
                displayEmpty
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                sx={{ bgcolor: "#f8f9fb" }}
              >
                <MenuItem value="">Not selected</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box display="flex" alignItems="center" gap={1.2} mb={1.2}>
            <MdAccessTime size={18} color="#aaa" />
            <TextField
              fullWidth
              type="datetime-local"
              value={form.datetime}
              onChange={(e) => setForm({ ...form, datetime: e.target.value })}
              size="small"
              sx={{ bgcolor: "#f8f9fb", borderRadius: 1 }}
            />
          </Box>

          <Box display="flex" alignItems="center" gap={1.2}>
            <MdGroup size={18} color="#aaa" />
            <FormControl fullWidth size="small">
              <Select
                displayEmpty
                value={form.assigneeId}
                onChange={(e) =>
                  setForm({ ...form, assigneeId: e.target.value as number | "" })
                }
                sx={{ bgcolor: "#f8f9fb" }}
              >
                <MenuItem value="">Select assignee</MenuItem>
                {TEACHERS.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setForm(emptyForm)}
            sx={{
              border: "1.5px solid #dde1e9",
              color: "#555",
              borderRadius: "6px",
              textTransform: "none",
              px: 2.5,
              "&:hover": { bgcolor: "#f5f5f5" },
            }}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!form.title.trim()}
            sx={{
              bgcolor: "#2196f3",
              borderRadius: "6px",
              textTransform: "none",
              px: 3,
              "&:hover": { bgcolor: "#1976d2" },
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};