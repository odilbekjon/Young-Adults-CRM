import { useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { MdAdd, MdClose, MdCalendarToday, MdEdit, MdDelete } from "react-icons/md";

interface Holiday {
  id: number;
  name: string;
  date: string;
  createdAt: string;
  affectsPayment: boolean;
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const today = new Date().toISOString().split("T")[0];

export const Holidays = () => {
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [affectsPayment, setAffectsPayment] = useState(false);

  const upcoming = holidays.filter((h) => h.date >= today);
  const past = holidays.filter((h) => h.date < today);
  const displayed = tab === 0 ? upcoming : past;

  const handleOpen = () => {
    setName("");
    setDate("");
    setAffectsPayment(false);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!name.trim() || !date) return;
    const newHoliday: Holiday = {
      id: Date.now(),
      name,
      date,
      createdAt: new Date().toISOString().split("T")[0],
      affectsPayment,
    };
    setHolidays((prev) => [...prev, newHoliday]);
    setOpen(false);
  };

  const handleDelete = (id: number) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Typography variant="h5" className="!font-semibold !text-gray-800">
          Holidays
        </Typography>
        <Button
          variant="contained"
          startIcon={<MdAdd size={18} />}
          onClick={handleOpen}
          sx={{
            backgroundColor: "#29b6f6",
            "&:hover": { backgroundColor: "#0288d1" },
            textTransform: "uppercase",
            fontWeight: 600,
            borderRadius: "6px",
            paddingX: "20px",
            paddingY: "10px",
            boxShadow: "none",
          }}
        >
          Add New
        </Button>
      </div>

      {/* Card */}
      <div className="bg-white rounded-lg shadow-sm">
        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            borderBottom: "1px solid #e5e7eb",
            px: 2,
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 500,
              color: "#9ca3af",
              minWidth: 80,
            },
            "& .Mui-selected": { color: "#29b6f6 !important" },
            "& .MuiTabs-indicator": { backgroundColor: "#29b6f6" },
          }}
        >
          <Tab label="Upcoming" />
          <Tab label="Past" />
        </Tabs>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Name", "Date of the holiday", "Create at", "Affects to payment", "Actions"].map(
                  (col) => (
                    <th
                      key={col}
                      className="text-left px-6 py-4 text-gray-500 font-medium text-sm"
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">
                    No Data
                  </td>
                </tr>
              ) : (
                displayed.map((h) => (
                  <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-800 font-medium">{h.name}</td>
                    <td className="px-6 py-4 text-gray-600">{formatDate(h.date)}</td>
                    <td className="px-6 py-4 text-gray-600">{formatDate(h.createdAt)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          h.affectsPayment
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {h.affectsPayment ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <IconButton size="small" sx={{ color: "#29b6f6" }}>
                          <MdEdit size={16} />
                        </IconButton>
                        <IconButton
                          size="small"
                          sx={{ color: "#ef5350" }}
                          onClick={() => handleDelete(h.id)}
                        >
                          <MdDelete size={16} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        TransitionProps={{ timeout: 300 }}
        PaperProps={{
          sx: {
            borderRadius: "12px",
            padding: "8px",
            minWidth: "400px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          },
        }}
        sx={{
          "& .MuiDialog-container": {
            alignItems: "flex-start",
            paddingTop: "80px",
          },
          "& .MuiBackdrop-root": {
            backgroundColor: "rgba(0,0,0,0.4)",
          },
        }}
      >
        {/* Modal Header */}
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
            px: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, color: "#1f2937", fontSize: "1.1rem" }}>
            Add holiday
          </Typography>
          <IconButton onClick={() => setOpen(false)} size="small" sx={{ color: "#9ca3af" }}>
            <MdClose size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 2, pt: 1, pb: 2 }}>
          {/* Name Field */}
          <div className="mb-4">
            <Typography
              variant="body2"
              sx={{ mb: 1, color: "#374151", fontWeight: 500, fontSize: "0.875rem" }}
            >
              Name
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=""
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "6px",
                  "& fieldset": { borderColor: "#d1d5db" },
                  "&:hover fieldset": { borderColor: "#9ca3af" },
                  "&.Mui-focused fieldset": { borderColor: "#29b6f6" },
                },
              }}
            />
          </div>

          {/* Date Field */}
          <div className="mb-4">
            <Typography
              variant="body2"
              sx={{ mb: 1, color: "#374151", fontWeight: 500, fontSize: "0.875rem" }}
            >
              Date
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputProps={{
                startAdornment: (
                  <MdCalendarToday size={16} className="mr-2 text-gray-400" />
                ),
              }}
              inputProps={{ placeholder: "No date selected" }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "6px",
                  color: date ? "#1f2937" : "#9ca3af",
                  "& fieldset": { borderColor: "#d1d5db" },
                  "&:hover fieldset": { borderColor: "#9ca3af" },
                  "&.Mui-focused fieldset": { borderColor: "#29b6f6" },
                },
              }}
            />
          </div>

          {/* Checkbox */}
          <div className="mb-6">
            <FormControlLabel
              control={
                <Checkbox
                  checked={affectsPayment}
                  onChange={(e) => setAffectsPayment(e.target.checked)}
                  size="small"
                  sx={{
                    color: "#d1d5db",
                    "&.Mui-checked": { color: "#29b6f6" },
                  }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: "#374151", fontSize: "0.875rem" }}>
                  Student's payment and teacher's salary
                </Typography>
              }
            />
          </div>

          {/* Submit Button */}
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!name.trim() || !date}
            sx={{
              backgroundColor: "#29b6f6",
              "&:hover": { backgroundColor: "#0288d1" },
              "&.Mui-disabled": { backgroundColor: "#bae6fd", color: "white" },
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "6px",
              paddingX: "24px",
              paddingY: "10px",
              boxShadow: "none",
              fontSize: "0.95rem",
            }}
          >
            Submit
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};