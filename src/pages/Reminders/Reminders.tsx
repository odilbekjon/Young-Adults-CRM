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
} from "@mui/material";
import { MdAdd, MdClose, MdCheck, MdAccessTime, MdPerson, MdGroup } from "react-icons/md";
import { useState } from "react";

type Reminder = {
  id: number;
  title: string;
  description: string;
  date: string;
  status: "overdue" | "today" | "future";
};

const emptyForm = {
  title: "",
  description: "",
  tags: "",
  priority: "",
  datetime: new Date(new Date().setHours(23, 59, 0, 0)).toISOString().slice(0, 16),
  assignee: "",
};

export const Reminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const overdue = reminders.filter((r) => r.status === "overdue");
  const today = reminders.filter((r) => r.status === "today");
  const future = reminders.filter((r) => r.status === "future");

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const handleReset = () => setForm(emptyForm);

  const handleCreate = () => {
    if (!form.title.trim()) return;
    const selected = new Date(form.datetime);
    const now = new Date();
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    let status: Reminder["status"] = "future";
    if (selected < now) status = "overdue";
    else if (selected >= todayDate && selected < tomorrowDate) status = "today";

    setReminders((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: form.title,
        description: form.description,
        date: form.datetime.replace("T", " "),
        status,
      },
    ]);
    setForm(emptyForm);
    setOpen(false);
  };

  const filterSelectSx = {
    bgcolor: "#fff",
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#dde1e9" },
    "& .MuiSelect-select": { py: "7px", px: "12px", fontSize: 13.5, color: "#555" },
    borderRadius: "6px",
    minWidth: 140,
  };

  const CountBox = ({
    count,
    color,
  }: {
    count: number;
    color: string;
  }) => (
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

  const Column = ({
    label,
    color,
    items,
  }: {
    label: string;
    color: string;
    items: Reminder[];
  }) => (
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
            bgcolor: "#fff",
            borderRadius: "8px",
            p: 2,
            mb: 1.5,
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          }}
        >
          <Typography fontWeight={600} fontSize={14} mb={0.5}>
            {r.title}
          </Typography>
          <Box display="flex" alignItems="center" gap={0.6} sx={{ color: "#999", fontSize: 12 }}>
            <MdAccessTime size={13} />
            {r.date}
          </Box>
          {r.description && (
            <Typography fontSize={12} color="text.secondary" mt={0.5}>
              {r.description}
            </Typography>
          )}
        </Box>
      ))}
      {items.length === 0 && <NoMore />}
    </Box>
  );

  return (
    <Box p={4} bgcolor="#f0f2f5" minHeight="100vh">
      {/* HEADER */}
      <Typography variant="h5" fontWeight={700} color="#1a1a2e" mb={2.5}>
        Reminders
      </Typography>

      {/* FILTERS */}
      <Box display="flex" flexWrap="wrap" alignItems="center" gap={1.2} mb={4}>
        <Chip
          label="Active"
          onDelete={() => {}}
          deleteIcon={<MdClose />}
          sx={{
            bgcolor: "#fff",
            border: "1px solid #dde1e9",
            borderRadius: "6px",
            fontSize: 13.5,
            "& .MuiChip-deleteIcon": { fontSize: 16 },
          }}
        />
        <Select displayEmpty value="" sx={filterSelectSx}>
          <MenuItem value="" disabled sx={{ fontSize: 13.5 }}>Select assignee</MenuItem>
        </Select>
        <Select displayEmpty value="" sx={filterSelectSx}>
          <MenuItem value="" disabled sx={{ fontSize: 13.5 }}>Select tags</MenuItem>
        </Select>
        <Select displayEmpty value="" sx={filterSelectSx}>
          <MenuItem value="" disabled sx={{ fontSize: 13.5 }}>📅 Select date</MenuItem>
        </Select>
        <Select displayEmpty value="" sx={filterSelectSx}>
          <MenuItem value="" disabled sx={{ fontSize: 13.5 }}>📅 Select date</MenuItem>
        </Select>

        <Button
          variant="contained"
          startIcon={<MdAdd />}
          onClick={handleOpen}
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

      {/* COLUMNS */}
      <Box display="flex" gap={0}>
        <Column label="Overdue" color="#f44336" items={overdue} />
        <Column label="Today" color="#2196f3" items={today} />
        <Column label="Future" color="#9e9e9e" items={future} />
      </Box>

      {/* CREATE MODAL */}
      <Dialog
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: { borderRadius: "10px", width: 460, maxWidth: "95vw", p: "4px" },
        }}
      >
        <DialogTitle sx={{ fontSize: 19, fontWeight: 600, color: "#1a1a2e", pb: 1 }}>
          Create reminder
          <IconButton
            onClick={handleClose}
            sx={{ position: "absolute", right: 12, top: 12, color: "#aaa" }}
          >
            <MdClose />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: "8px !important" }}>
          {/* Title */}
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

          {/* Description */}
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

          {/* Tags */}
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
            </Select>
          </FormControl>

          {/* Details */}
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
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                sx={{ bgcolor: "#f8f9fb" }}
              >
                <MenuItem value="">Select assignee</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={handleReset}
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