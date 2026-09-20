import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { MdAdd, MdClose, MdEdit, MdDelete } from "react-icons/md";
import {
  useAllHolidaysQuery,
  useLazyHolidayForEditQuery,
  useCreateHolidayMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
} from "../../../../../app/api/holidaysApi";
import type { Holiday } from "../../../../../app/api/holidaysApi/types";
import { useToast } from "../../../../../Context/ToastContext";
import { DatePickerField } from "../../../../SingleGroup/DatePickerField";
import { extractApiError } from "../../../../../utils";

// Swagger's write contract is YYYY-MM-DD, but reads can come back as a full
// ISO timestamp — both are trimmed to the date part so <input type="date">
// and the upcoming/past comparison work off the same shape.
const toDateInput = (value?: string | null) => (value ? String(value).slice(0, 10) : "");

const formatDate = (dateStr?: string | null) => {
  const iso = toDateInput(dateStr);
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const today = new Date().toISOString().split("T")[0];

export const Holidays = () => {
  const { t } = useTranslation();
  const toast = useToast();

  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data, isLoading, isError } = useAllHolidaysQuery();
  const [fetchHolidayForEdit, { isFetching: isLoadingForEdit }] = useLazyHolidayForEditQuery();
  const [createHoliday, { isLoading: isCreating }] = useCreateHolidayMutation();
  const [updateHoliday, { isLoading: isUpdating }] = useUpdateHolidayMutation();
  const [deleteHoliday, { isLoading: isDeleting }] = useDeleteHolidayMutation();

  const holidays = data?.data ?? [];
  const upcoming = holidays.filter((h) => toDateInput(h.date) >= today);
  const past = holidays.filter((h) => toDateInput(h.date) < today);
  const displayed = tab === 0 ? upcoming : past;

  const isSaving = isCreating || isUpdating;

  const handleOpen = () => {
    setEditingId(null);
    setName("");
    setDate("");
    setSaveError(null);
    setOpen(true);
  };

  // GET /holidays/{id}/for-edit — the drawer opens immediately with the row's
  // known values, then refreshes from the dedicated edit endpoint.
  const handleEdit = async (holiday: Holiday) => {
    setEditingId(holiday.id);
    setName(holiday.name);
    setDate(toDateInput(holiday.date));
    setSaveError(null);
    setOpen(true);
    try {
      const detail = await fetchHolidayForEdit(holiday.id).unwrap();
      if (detail?.data) {
        setName(detail.data.name ?? "");
        setDate(toDateInput(detail.data.date));
      }
    } catch {
      // The row already provided usable values — keep the form open and let
      // the user save rather than blocking the edit on this refresh.
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !date) return;
    setSaveError(null);
    try {
      if (editingId) {
        await updateHoliday({ id: editingId, name: name.trim(), date }).unwrap();
        toast.success(t("settings.office.holidays.toast.updated"));
      } else {
        await createHoliday({ name: name.trim(), date }).unwrap();
        toast.success(t("settings.office.holidays.toast.created"));
      }
      setOpen(false);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.office.holidays.form.errors.save");
      const message = detail ? `${generic}: ${detail}` : generic;
      setSaveError(message);
      toast.error(message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteHoliday(deleteTarget.id).unwrap();
      setDeleteTarget(null);
      toast.success(t("settings.office.holidays.toast.deleted"));
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.office.holidays.deleteConfirm.error");
      const message = detail ? `${generic}: ${detail}` : generic;
      setDeleteError(message);
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Typography variant="h5" className="!font-semibold !text-gray-800">
          {t("settings.office.holidays.title")}
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
          {t("settings.office.holidays.addNew")}
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
          <Tab label={t("settings.office.holidays.tabs.upcoming")} />
          <Tab label={t("settings.office.holidays.tabs.past")} />
        </Tabs>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {[
                  t("settings.office.holidays.table.name"),
                  t("settings.office.holidays.table.dateOfHoliday"),
                  t("settings.office.holidays.table.createdAt"),
                  t("settings.office.holidays.table.affectsPayment"),
                  t("settings.office.holidays.table.actions"),
                ].map(
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
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10">
                    <CircularProgress size={26} />
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-red-500">
                    {t("settings.office.holidays.loadError")}
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">
                    {t("settings.office.holidays.noData")}
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
                        {h.affectsPayment
                          ? t("settings.office.holidays.yes")
                          : t("settings.office.holidays.no")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <IconButton
                          size="small"
                          sx={{ color: "#29b6f6" }}
                          onClick={() => handleEdit(h)}
                          aria-label={t("settings.office.holidays.edit")}
                        >
                          <MdEdit size={16} />
                        </IconButton>
                        <IconButton
                          size="small"
                          sx={{ color: "#ef5350" }}
                          onClick={() => { setDeleteError(null); setDeleteTarget(h); }}
                          aria-label={t("settings.office.holidays.delete")}
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
            {editingId
              ? t("settings.office.holidays.editHoliday")
              : t("settings.office.holidays.addHoliday")}
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
              {t("settings.office.holidays.form.name")}
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=""
              disabled={isLoadingForEdit}
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
          <div className="mb-6">
            <Typography
              variant="body2"
              sx={{ mb: 1, color: "#374151", fontWeight: 500, fontSize: "0.875rem" }}
            >
              {t("settings.office.holidays.form.date")}
            </Typography>
            <DatePickerField
              value={date}
              onChange={setDate}
              disabled={isLoadingForEdit}
              placeholder={t("settings.office.holidays.form.noDateSelected")}
            />
          </div>

          {saveError && (
            <Typography sx={{ mb: 2, color: "#ef5350", fontSize: "0.8125rem" }}>
              {saveError}
            </Typography>
          )}

          {/* Submit Button */}
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!name.trim() || !date || isSaving || isLoadingForEdit}
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : undefined}
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
            {t("settings.office.holidays.form.submit")}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        PaperProps={{ sx: { borderRadius: "14px", width: 380 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t("settings.office.holidays.deleteConfirm.title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.office.holidays.deleteConfirm.message", { name: deleteTarget?.name ?? "" })}
          </DialogContentText>
          {deleteError && (
            <Typography sx={{ mt: 1.5, color: "#ef5350", fontSize: "0.8125rem" }}>
              {deleteError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
            variant="outlined"
            disabled={isDeleting}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px" }}
          >
            {t("settings.office.holidays.deleteConfirm.cancel")}
          </Button>
          <Button
            onClick={confirmDelete}
            variant="contained"
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px", fontWeight: 600, boxShadow: "none" }}
          >
            {t("settings.office.holidays.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
