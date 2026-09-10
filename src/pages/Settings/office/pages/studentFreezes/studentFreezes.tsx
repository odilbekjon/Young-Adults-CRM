import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, IconButton, MenuItem, Pagination, Select,
  TextField, Typography,
} from "@mui/material";
import { MdAdd, MdClose, MdEdit, MdDelete } from "react-icons/md";

import {
  useStudentFreezesQuery,
  useLazyStudentFreezeByIdQuery,
  useCreateStudentFreezeMutation,
  useUpdateStudentFreezeMutation,
  useDeleteStudentFreezeMutation,
} from "../../../../../app/api/studentFreezesApi";
import type {
  StudentFreezeRecord,
  StudentFreezeStatus,
} from "../../../../../app/api/studentFreezesApi/types";
import { useAllStudentsQuery } from "../../../../../app/api/studentsApi";
import { useGroupsSelectQuery } from "../../../../../app/api/groupsApi";
import { useToast } from "../../../../../Context/ToastContext";
import { extractApiError } from "../../../../../utils";
import type { RootState } from "../../../../../app/store";

const PAGE_SIZE = 10;
const STATUSES: StudentFreezeStatus[] = ["ACTIVE", "EXPIRED", "CANCELLED"];

interface CreateFormState {
  studentId: string;
  groupId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

const EMPTY_CREATE_FORM: CreateFormState = {
  studentId: "", groupId: "", startDate: "", endDate: "", reason: "",
};

interface EditFormState {
  startDate: string;
  endDate: string;
  reason: string;
}

export const StudentFreezes = () => {
  const { t } = useTranslation();
  const toast = useToast();

  // ── Filters ──────────────────────────────────────────────────────────────
  const [studentFilter, setStudentFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const queryArgs = useMemo(
    () => ({
      studentId: studentFilter || undefined,
      groupId: groupFilter || undefined,
      status: (statusFilter as StudentFreezeStatus) || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [studentFilter, groupFilter, statusFilter, page]
  );

  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);
  const { data, isLoading, isFetching, isError } = useStudentFreezesQuery(queryArgs);
  const { data: studentsData } = useAllStudentsQuery({ page: 1, limit: 200, branchId: selectedBranchId ?? undefined });
  const { data: groupOptions } = useGroupsSelectQuery();

  const rows = data?.rows ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const students = studentsData?.data ?? [];

  const studentName = (id: string) => students.find((s) => s.id === id)?.name ?? id;
  const groupName = (id: string) => (groupOptions ?? []).find((g) => g.id === id)?.name ?? id;

  // ── Create ───────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_CREATE_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createStudentFreeze, { isLoading: isCreating }] = useCreateStudentFreezeMutation();

  const openCreate = () => {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateError(null);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!createForm.studentId || !createForm.startDate) return;
    setCreateError(null);
    try {
      await createStudentFreeze({
        studentId: createForm.studentId,
        groupId: createForm.groupId || undefined,
        startDate: createForm.startDate,
        endDate: createForm.endDate || undefined,
        reason: createForm.reason || undefined,
      }).unwrap();
      toast.success(t("settings.office.studentFreezes.toast.created"));
      setCreateOpen(false);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.office.studentFreezes.toast.error");
      const message = detail ? `${generic}: ${detail}` : generic;
      setCreateError(message);
      toast.error(message);
    }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<StudentFreezeRecord | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({ startDate: "", endDate: "", reason: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [fetchFreezeById, { isFetching: isLoadingForEdit }] = useLazyStudentFreezeByIdQuery();
  const [updateStudentFreeze, { isLoading: isUpdating }] = useUpdateStudentFreezeMutation();

  const openEdit = async (record: StudentFreezeRecord) => {
    setEditTarget(record);
    setEditForm({ startDate: record.startDate, endDate: record.endDate ?? "", reason: record.reason });
    setEditError(null);
    try {
      const detail = await fetchFreezeById(record.id).unwrap();
      setEditForm({ startDate: detail.startDate, endDate: detail.endDate ?? "", reason: detail.reason });
    } catch {
      // The row already provided usable values — keep the form open.
    }
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    setEditError(null);
    try {
      await updateStudentFreeze({
        id: editTarget.id,
        startDate: editForm.startDate || undefined,
        endDate: editForm.endDate || undefined,
        reason: editForm.reason || undefined,
      }).unwrap();
      toast.success(t("settings.office.studentFreezes.toast.updated"));
      setEditTarget(null);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.office.studentFreezes.toast.error");
      const message = detail ? `${generic}: ${detail}` : generic;
      setEditError(message);
      toast.error(message);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<StudentFreezeRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteStudentFreeze, { isLoading: isDeleting }] = useDeleteStudentFreezeMutation();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteStudentFreeze(deleteTarget.id).unwrap();
      toast.success(t("settings.office.studentFreezes.toast.deleted"));
      setDeleteTarget(null);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.office.studentFreezes.deleteConfirm.error");
      const message = detail ? `${generic}: ${detail}` : generic;
      setDeleteError(message);
      toast.error(message);
    }
  };

  const statusLabel = (status: string) => {
    const key = status.toLowerCase();
    return ["active", "expired", "cancelled"].includes(key)
      ? t(`settings.office.studentFreezes.status.${key}`)
      : status || "—";
  };

  const statusCls = (status: string) =>
    status === "ACTIVE" ? "bg-green-100 text-green-700"
      : status === "CANCELLED" ? "bg-gray-100 text-gray-500"
      : "bg-amber-100 text-amber-700";

  const selectSx = { bgcolor: "#fff", fontSize: 13 };

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <Typography variant="h5" className="!font-semibold !text-gray-800">
          {t("settings.office.studentFreezes.title")}
        </Typography>
        <Button
          variant="contained"
          startIcon={<MdAdd size={18} />}
          onClick={openCreate}
          sx={{
            backgroundColor: "#29b6f6", "&:hover": { backgroundColor: "#0288d1" },
            textTransform: "uppercase", fontWeight: 600, borderRadius: "6px",
            paddingX: "20px", paddingY: "10px", boxShadow: "none",
          }}
        >
          {t("settings.office.studentFreezes.addNew")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select
          displayEmpty
          size="small"
          value={studentFilter}
          onChange={(e) => { setStudentFilter(e.target.value); setPage(1); }}
          sx={{ ...selectSx, minWidth: 200 }}
        >
          <MenuItem value=""><em style={{ fontStyle: "normal", color: "#9ca3af" }}>{t("settings.office.studentFreezes.filters.allStudents")}</em></MenuItem>
          {students.map((s) => (
            <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
          ))}
        </Select>

        <Select
          displayEmpty
          size="small"
          value={groupFilter}
          onChange={(e) => { setGroupFilter(e.target.value); setPage(1); }}
          sx={{ ...selectSx, minWidth: 180 }}
        >
          <MenuItem value=""><em style={{ fontStyle: "normal", color: "#9ca3af" }}>{t("settings.office.studentFreezes.filters.allGroups")}</em></MenuItem>
          {(groupOptions ?? []).map((g) => (
            <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
          ))}
        </Select>

        <Select
          displayEmpty
          size="small"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          sx={{ ...selectSx, minWidth: 160 }}
        >
          <MenuItem value=""><em style={{ fontStyle: "normal", color: "#9ca3af" }}>{t("settings.office.studentFreezes.filters.allStatuses")}</em></MenuItem>
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s}>{statusLabel(s)}</MenuItem>
          ))}
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {[
                t("settings.office.studentFreezes.table.student"),
                t("settings.office.studentFreezes.table.group"),
                t("settings.office.studentFreezes.table.startDate"),
                t("settings.office.studentFreezes.table.endDate"),
                t("settings.office.studentFreezes.table.reason"),
                t("settings.office.studentFreezes.table.status"),
                t("settings.office.studentFreezes.table.actions"),
              ].map((col) => (
                <th key={col} className="text-left px-5 py-4 text-gray-500 font-medium text-sm whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading || isFetching ? (
              <tr><td colSpan={7} className="text-center py-10"><CircularProgress size={26} /></td></tr>
            ) : isError ? (
              <tr><td colSpan={7} className="text-center py-10 text-red-500">{t("settings.office.studentFreezes.loadError")}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">{t("settings.office.studentFreezes.noData")}</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-gray-800 font-medium whitespace-nowrap">
                    {r.studentName || studentName(r.studentId)}
                    {r.studentPhone && <div className="text-xs text-gray-400">{r.studentPhone}</div>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                    {r.groupName || (r.groupId ? groupName(r.groupId) : "—")}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{r.startDate || "—"}</td>
                  <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{r.endDate || "—"}</td>
                  <td className="px-5 py-3.5 text-gray-600 max-w-[220px] truncate" title={r.reason}>{r.reason || "—"}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusCls(r.status)}`}>
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <IconButton size="small" sx={{ color: "#6b7280" }} onClick={() => openEdit(r)} aria-label={t("settings.office.studentFreezes.edit")}>
                        <MdEdit size={16} />
                      </IconButton>
                      <IconButton size="small" sx={{ color: "#ef5350" }} onClick={() => { setDeleteError(null); setDeleteTarget(r); }} aria-label={t("settings.office.studentFreezes.delete")}>
                        <MdDelete size={16} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2, borderTop: "1px solid #f3f4f6" }}>
            <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} size="small" />
          </Box>
        )}
      </div>

      {/* Create modal */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} PaperProps={{ sx: { borderRadius: "12px", minWidth: 420 } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Typography sx={{ fontWeight: 600, fontSize: "1rem", color: "#1f2937" }}>
            {t("settings.office.studentFreezes.createTitle")}
          </Typography>
          <IconButton onClick={() => setCreateOpen(false)} size="small" sx={{ color: "#9ca3af" }}>
            <MdClose size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1, pb: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box>
            <Typography sx={{ mb: 0.8, fontSize: 13, color: "#374151", fontWeight: 500 }}>
              {t("settings.office.studentFreezes.form.student")} <span style={{ color: "red" }}>*</span>
            </Typography>
            <Select
              fullWidth size="small" displayEmpty
              value={createForm.studentId}
              onChange={(e) => setCreateForm((p) => ({ ...p, studentId: e.target.value }))}
            >
              <MenuItem value="" disabled><em style={{ fontStyle: "normal", color: "#9ca3af" }}>{t("settings.office.studentFreezes.form.selectStudent")}</em></MenuItem>
              {students.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </Box>

          <Box>
            <Typography sx={{ mb: 0.8, fontSize: 13, color: "#374151", fontWeight: 500 }}>
              {t("settings.office.studentFreezes.form.group")}
            </Typography>
            <Select
              fullWidth size="small" displayEmpty
              value={createForm.groupId}
              onChange={(e) => setCreateForm((p) => ({ ...p, groupId: e.target.value }))}
            >
              <MenuItem value=""><em style={{ fontStyle: "normal", color: "#9ca3af" }}>{t("settings.office.studentFreezes.form.selectGroup")}</em></MenuItem>
              {(groupOptions ?? []).map((g) => (
                <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
              ))}
            </Select>
          </Box>

          <Box sx={{ display: "flex", gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ mb: 0.8, fontSize: 13, color: "#374151", fontWeight: 500 }}>
                {t("settings.office.studentFreezes.form.startDate")} <span style={{ color: "red" }}>*</span>
              </Typography>
              <TextField fullWidth size="small" type="date" value={createForm.startDate}
                onChange={(e) => setCreateForm((p) => ({ ...p, startDate: e.target.value }))} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ mb: 0.8, fontSize: 13, color: "#374151", fontWeight: 500 }}>
                {t("settings.office.studentFreezes.form.endDate")}
              </Typography>
              <TextField fullWidth size="small" type="date" value={createForm.endDate}
                onChange={(e) => setCreateForm((p) => ({ ...p, endDate: e.target.value }))} />
            </Box>
          </Box>

          <Box>
            <Typography sx={{ mb: 0.8, fontSize: 13, color: "#374151", fontWeight: 500 }}>
              {t("settings.office.studentFreezes.form.reason")}
            </Typography>
            <TextField fullWidth size="small" multiline minRows={2} value={createForm.reason}
              onChange={(e) => setCreateForm((p) => ({ ...p, reason: e.target.value }))} />
          </Box>

          {createError && <Typography sx={{ fontSize: 13, color: "#d32f2f" }}>{createError}</Typography>}

          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!createForm.studentId || !createForm.startDate || isCreating}
            startIcon={isCreating ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              backgroundColor: "#29b6f6", "&:hover": { backgroundColor: "#0288d1" },
              "&.Mui-disabled": { backgroundColor: "#bae6fd", color: "#fff" },
              textTransform: "none", fontWeight: 600, borderRadius: "6px", boxShadow: "none", px: 3, alignSelf: "flex-start",
            }}
          >
            {t("settings.office.studentFreezes.form.submit")}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} PaperProps={{ sx: { borderRadius: "12px", minWidth: 420 } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Typography sx={{ fontWeight: 600, fontSize: "1rem", color: "#1f2937" }}>
            {t("settings.office.studentFreezes.editTitle")}
          </Typography>
          <IconButton onClick={() => setEditTarget(null)} size="small" sx={{ color: "#9ca3af" }}>
            <MdClose size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1, pb: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ mb: 0.8, fontSize: 13, color: "#374151", fontWeight: 500 }}>
                {t("settings.office.studentFreezes.form.startDate")}
              </Typography>
              <TextField fullWidth size="small" type="date" value={editForm.startDate} disabled={isLoadingForEdit}
                onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ mb: 0.8, fontSize: 13, color: "#374151", fontWeight: 500 }}>
                {t("settings.office.studentFreezes.form.endDate")}
              </Typography>
              <TextField fullWidth size="small" type="date" value={editForm.endDate} disabled={isLoadingForEdit}
                onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))} />
            </Box>
          </Box>

          <Box>
            <Typography sx={{ mb: 0.8, fontSize: 13, color: "#374151", fontWeight: 500 }}>
              {t("settings.office.studentFreezes.form.reason")}
            </Typography>
            <TextField fullWidth size="small" multiline minRows={2} value={editForm.reason} disabled={isLoadingForEdit}
              onChange={(e) => setEditForm((p) => ({ ...p, reason: e.target.value }))} />
          </Box>

          {editError && <Typography sx={{ fontSize: 13, color: "#d32f2f" }}>{editError}</Typography>}

          <Button
            variant="contained"
            onClick={handleUpdate}
            disabled={isUpdating || isLoadingForEdit}
            startIcon={isUpdating ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              backgroundColor: "#29b6f6", "&:hover": { backgroundColor: "#0288d1" },
              textTransform: "none", fontWeight: 600, borderRadius: "6px", boxShadow: "none", px: 3, alignSelf: "flex-start",
            }}
          >
            {t("settings.office.studentFreezes.form.save")}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setDeleteError(null); }} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{t("settings.office.studentFreezes.deleteConfirm.title")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.office.studentFreezes.deleteConfirm.message", {
              name: deleteTarget?.studentName || (deleteTarget ? studentName(deleteTarget.studentId) : ""),
            })}
          </DialogContentText>
          {deleteError && <Typography sx={{ fontSize: 13, color: "error.main", mt: 1.5 }}>{deleteError}</Typography>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setDeleteTarget(null); setDeleteError(null); }} disabled={isDeleting} sx={{ color: "#667085" }}>
            {t("settings.office.studentFreezes.deleteConfirm.cancel")}
          </Button>
          <Button
            variant="contained" color="error" disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={handleDelete}
            sx={{ borderRadius: 2 }}
          >
            {t("settings.office.studentFreezes.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default StudentFreezes;
