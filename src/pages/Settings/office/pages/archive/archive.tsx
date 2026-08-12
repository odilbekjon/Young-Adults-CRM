import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Pagination,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import {
  MdDelete,
  MdEdit,
  MdEmail,
  MdRefresh,
  MdClose,
  MdCalendarToday,
  MdArrowBack,
} from "react-icons/md";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ArchiveRecord {
  id: number;
  name: string;
  campus: string;
  balance: number;
  phone: string;
  role: string;
  reason: string;
  comment: string;
  archivedBy: string;
  archivedAt: string;
}

interface ArchiveReason {
  id: number;
  name: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_ARCHIVE: ArchiveRecord[] = Array.from({ length: 35 }, (_, i) => ({
  id: i + 1,
  name: [
    "Mamaraimov Og'abek",
    "Matiyev Ilyos",
    "Nazarov Fayzullo",
    "Tojiyeva Tursunoy To'ra qizi",
    "Jumayeva Shaxlo",
    "Abdullayev Sardor",
    "G'iyomova Nilufar",
    "Karimov Jasur",
    "Toshmatov Bobur",
    "Yusupova Malika",
  ][i % 10],
  campus: ["YA IELTS Campus", "YA Grammar Campus"][i % 2],
  balance: [-399999.92, -1440000, -400000, 1000.38, -538.47, 0, -384.62, 500, -200, 1500][i % 10],
  phone: ["930752906", "972270051", "881550081", "937093073", "979008387"][i % 5],
  role: "Student",
  reason: ["", "Can't handle", "Finished", "", "Finished", "", "Finished"][i % 7],
  comment: ["", "", "", "Part time ishlaydi ulgurmayapti to'xt atdi", "", "", "cefr topshirgan"][i % 7],
  archivedBy: ["Ugilbeka Abdullaeva", "Maksuda Abraykulova", "Iskandar Tojiyev"][i % 3],
  archivedAt: ["20.05.2026 - 17:38", "20.05.2026 - 16:09", "19.05.2026 - 17:33", "19.05.2026 - 16:58"][i % 4],
}));

const INITIAL_REASONS: ArchiveReason[] = [
  { id: 793, name: "Moving Away" },
  { id: 794, name: "Can't Afford" },
  { id: 795, name: "Not Satisfied" },
  { id: 796, name: "Can't handle" },
  { id: 797, name: "Failed an Exam" },
  { id: 798, name: "Finished" },
  { id: 830, name: "Changed The Group" },
  { id: 1575, name: "No contact" },
];

const PAGE_SIZE = 10;

// ─── Main Component ───────────────────────────────────────────────────────────
export const Archive = () => {
  const { t } = useTranslation();
  const [view, setView] = useState<"archive" | "reasons">("archive");
  const [reasons, setReasons] = useState<ArchiveReason[]>(INITIAL_REASONS);

  // Archive filters & selection
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterReason, setFilterReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [page, setPage] = useState(1);

  // Reasons modal
  const [addOpen, setAddOpen] = useState(false);
  const [newReason, setNewReason] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  // ── Filter logic ────────────────────────────────────────────────────────────
  const filtered = MOCK_ARCHIVE.filter((r) => {
    const matchSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.phone.includes(search);
    const matchRole = !filterRole || r.role === filterRole;
    const matchReason = !filterReason || r.reason === filterReason;
    return matchSearch && matchRole && matchReason;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Selection ───────────────────────────────────────────────────────────────
  const allSelected = pageData.length > 0 && pageData.every((r) => selected.includes(r.id));
  const toggleAll = () => {
    if (allSelected) setSelected((s) => s.filter((id) => !pageData.find((r) => r.id === id)));
    else setSelected((s) => [...new Set([...s, ...pageData.map((r) => r.id)])]);
  };
  const toggleOne = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // ── Reason CRUD ─────────────────────────────────────────────────────────────
  const handleAddReason = () => {
    if (!newReason.trim()) return;
    setReasons((prev) => [...prev, { id: Date.now(), name: newReason.trim() }]);
    setNewReason("");
    setAddOpen(false);
  };

  const handleEditReason = () => {
    setReasons((prev) => prev.map((r) => (r.id === editId ? { ...r, name: editName } : r)));
    setEditOpen(false);
  };

  const handleDeleteReason = (id: number) =>
    setReasons((prev) => prev.filter((r) => r.id !== id));

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const balanceColor = (b: number) =>
    b > 0 ? "text-green-600" : b < 0 ? "text-red-500" : "text-gray-500";

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "6px",
      fontSize: "0.82rem",
      height: "38px",
      backgroundColor: "#fff",
      "& fieldset": { borderColor: "#e5e7eb" },
      "&:hover fieldset": { borderColor: "#9ca3af" },
      "&.Mui-focused fieldset": { borderColor: "#29b6f6" },
    },
  };

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: REASONS FOR ARCHIVING
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "reasons") {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <IconButton
              onClick={() => setView("archive")}
              size="small"
              sx={{ color: "#374151" }}
            >
              <MdArrowBack size={20} />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 600, color: "#1f2937" }}>
              {t("settings.office.archive.reasonsForArchiving")}
            </Typography>
          </div>
          <Button
            variant="contained"
            onClick={() => { setNewReason(""); setAddOpen(true); }}
            sx={{
              backgroundColor: "#1e3a5f",
              "&:hover": { backgroundColor: "#162c47" },
              borderRadius: "20px",
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              boxShadow: "none",
            }}
          >
            {t("settings.office.archive.reasons.addTemplate")}
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm max-w-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-gray-700 font-semibold w-24">{t("settings.office.archive.reasons.table.id")}</th>
                <th className="text-left px-6 py-4 text-gray-700 font-semibold">{t("settings.office.archive.reasons.table.name")}</th>
                <th className="text-left px-6 py-4 text-gray-700 font-semibold">{t("settings.office.archive.reasons.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {reasons.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-600">{r.id}</td>
                  <td className="px-6 py-4 text-gray-800">{r.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <IconButton
                        size="small"
                        sx={{ color: "#6b7280" }}
                        onClick={() => {
                          setEditId(r.id);
                          setEditName(r.name);
                          setEditOpen(true);
                        }}
                      >
                        <MdEdit size={16} />
                      </IconButton>
                      <IconButton
                        size="small"
                        sx={{ color: "#ef5350" }}
                        onClick={() => handleDeleteReason(r.id)}
                      >
                        <MdDelete size={16} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Modal — right side */}
        <Dialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: "12px",
              minWidth: "320px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            },
          }}
          sx={{
            "& .MuiDialog-container": {
              justifyContent: "flex-end",
              alignItems: "flex-start",
              paddingTop: "80px",
              paddingRight: "40px",
            },
          }}
        >
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: "1rem", color: "#1f2937" }}>
              {t("settings.office.archive.reasons.addTemplate")}
            </Typography>
            <IconButton onClick={() => setAddOpen(false)} size="small" sx={{ color: "#9ca3af" }}>
              <MdClose size={18} />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 1, pb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, color: "#374151", fontWeight: 500 }}>
              {t("settings.office.archive.reasons.form.name")}
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              sx={{ ...inputSx, mb: 2 }}
              onKeyDown={(e) => e.key === "Enter" && handleAddReason()}
            />
            <Button
              variant="contained"
              onClick={handleAddReason}
              disabled={!newReason.trim()}
              sx={{
                backgroundColor: "#29b6f6",
                "&:hover": { backgroundColor: "#0288d1" },
                "&.Mui-disabled": { backgroundColor: "#bae6fd", color: "#fff" },
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "6px",
                boxShadow: "none",
                px: 3,
              }}
            >
              {t("settings.office.archive.reasons.submit")}
            </Button>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          PaperProps={{
            sx: { borderRadius: "12px", minWidth: "320px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" },
          }}
          sx={{
            "& .MuiDialog-container": {
              justifyContent: "flex-end",
              alignItems: "flex-start",
              paddingTop: "80px",
              paddingRight: "40px",
            },
          }}
        >
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: "1rem", color: "#1f2937" }}>
              {t("settings.office.archive.reasons.editTemplate")}
            </Typography>
            <IconButton onClick={() => setEditOpen(false)} size="small" sx={{ color: "#9ca3af" }}>
              <MdClose size={18} />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 1, pb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, color: "#374151", fontWeight: 500 }}>
              {t("settings.office.archive.reasons.form.name")}
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              sx={{ ...inputSx, mb: 2 }}
            />
            <Button
              variant="contained"
              onClick={handleEditReason}
              sx={{
                backgroundColor: "#29b6f6",
                "&:hover": { backgroundColor: "#0288d1" },
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "6px",
                boxShadow: "none",
                px: 3,
              }}
            >
              {t("settings.office.archive.reasons.save")}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: ARCHIVE
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#1f2937" }}>
            {t("settings.office.archive.title")}
          </Typography>
          <Typography variant="body2" sx={{ color: "#6b7280" }}>
            {t("settings.office.archive.quantity", { count: filtered.length })}
          </Typography>
        </div>
        <Button
          variant="outlined"
          onClick={() => setView("reasons")}
          sx={{
            borderColor: "#e5e7eb",
            color: "#374151",
            textTransform: "none",
            borderRadius: "6px",
            fontWeight: 500,
            fontSize: "0.85rem",
            "&:hover": { borderColor: "#9ca3af", backgroundColor: "#f9fafb" },
          }}
        >
          {t("settings.office.archive.reasonsForArchiving")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <TextField
          placeholder={t("settings.office.archive.filters.namePhone")}
          size="small"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          sx={{ ...inputSx, width: 160 }}
        />

        <Select
          displayEmpty
          size="small"
          value={filterRole}
          onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
          sx={{ ...inputSx["& .MuiOutlinedInput-root"], width: 160, height: 38, fontSize: "0.82rem", borderRadius: "6px", backgroundColor: "#fff", "& fieldset": { borderColor: "#e5e7eb" } }}
        >
          <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.archive.filters.filterByRole")}</em></MenuItem>
          <MenuItem value="Student">{t("settings.office.archive.filters.student")}</MenuItem>
          <MenuItem value="Teacher">{t("settings.office.archive.filters.teacher")}</MenuItem>
        </Select>

        <Select
          displayEmpty
          size="small"
          value={filterReason}
          onChange={(e) => { setFilterReason(e.target.value); setPage(1); }}
          sx={{ width: 180, height: 38, fontSize: "0.82rem", borderRadius: "6px", backgroundColor: "#fff", "& fieldset": { borderColor: "#e5e7eb" } }}
        >
          <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.archive.filters.filterByReason")}</em></MenuItem>
          {reasons.map((r) => (
            <MenuItem key={r.id} value={r.name}>{r.name}</MenuItem>
          ))}
        </Select>

        <TextField
          size="small"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputProps={{ startAdornment: <MdCalendarToday size={14} className="mr-1 text-gray-400" /> }}
          inputProps={{ placeholder: t("settings.office.archive.filters.startDate") }}
          sx={{ ...inputSx, width: 160 }}
        />

        <TextField
          size="small"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputProps={{ startAdornment: <MdCalendarToday size={14} className="mr-1 text-gray-400" /> }}
          sx={{ ...inputSx, width: 160 }}
        />

        <div className="flex items-center gap-3 ml-2">
          <button className="flex items-center gap-1 text-red-500 hover:text-red-600 text-sm font-medium transition-colors">
            <MdDelete size={18} /> {t("settings.office.archive.actions.delete")}
          </button>
          <button className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium transition-colors">
            <MdRefresh size={18} /> {t("settings.office.archive.actions.reestablish")}
          </button>
          <button className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors">
            <MdEmail size={18} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-4 w-10">
                <Checkbox
                  size="small"
                  checked={allSelected}
                  onChange={toggleAll}
                  sx={{ color: "#d1d5db", "&.Mui-checked": { color: "#29b6f6" } }}
                />
              </th>
              {[
                t("settings.office.archive.table.name"),
                t("settings.office.archive.table.phone"),
                t("settings.office.archive.table.roles"),
                t("settings.office.archive.table.reasonsForRemoval"),
                t("settings.office.archive.table.comment"),
                t("settings.office.archive.table.archived"),
                t("settings.office.archive.table.actions"),
              ].map((h) => (
                <th key={h} className="text-left px-4 py-4 text-gray-600 font-semibold text-sm">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">
                  {t("settings.office.archive.noData")}
                </td>
              </tr>
            ) : (
              pageData.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Checkbox
                      size="small"
                      checked={selected.includes(r.id)}
                      onChange={() => toggleOne(r.id)}
                      sx={{ color: "#d1d5db", "&.Mui-checked": { color: "#29b6f6" } }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-blue-500 cursor-pointer hover:underline text-sm">
                      {r.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{r.campus}</div>
                    <div className={`text-xs mt-0.5 font-medium ${balanceColor(r.balance)}`}>
                      {t("settings.office.archive.balance")}: {r.balance.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{r.role}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{r.reason}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm max-w-[180px]">{r.comment}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-600 text-sm">{r.archivedBy}</div>
                    <div className="text-gray-400 text-xs">{r.archivedAt}</div>
                  </td>
                  <td className="px-4 py-3">
                    <IconButton size="small" sx={{ color: "#4ade80" }}>
                      <MdRefresh size={18} />
                    </IconButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center py-4 border-t border-gray-100">
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, v) => setPage(v)}
              size="small"
              sx={{
                "& .MuiPaginationItem-root": {
                  color: "#6b7280",
                  borderRadius: "6px",
                },
                "& .Mui-selected": {
                  backgroundColor: "#29b6f6 !important",
                  color: "#fff !important",
                },
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};