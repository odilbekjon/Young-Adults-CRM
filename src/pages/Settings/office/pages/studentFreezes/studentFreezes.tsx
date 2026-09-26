import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, MenuItem, Pagination, Select, TextField,
  Typography,
} from "@mui/material";

import {
  useStudentGroupsQuery,
  useUnfreezeStudentGroupMutation,
  useGroupsSelectQuery,
} from "../../../../../app/api/groupsApi";
import type { StudentGroupRecord } from "../../../../../app/api/groupsApi/types";
import { useToast } from "../../../../../Context/ToastContext";
import { extractApiError } from "../../../../../utils";
import type { RootState } from "../../../../../app/store";

const PAGE_SIZE = 10;

const formatDate = (d: string | null) => {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d.slice(0, 10);
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
};

// Settings > Office > Student Freezes — shows every currently-FROZEN
// /student-groups membership (the same resource SingleGroup's own
// Freeze/Unfreeze actions read and write), so a student frozen from any
// group actually shows up here. A separate /student-freezes CRUD resource
// used to back this page, but nothing anywhere in the app ever wrote a
// record there when a student was frozen from SingleGroup, so the table was
// always empty regardless of how many students were actually frozen.
export const StudentFreezes = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [groupId, setGroupId] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, groupId, selectedBranchId]);

  const { data, isLoading, isFetching, isError } = useStudentGroupsQuery({
    status: "FROZEN",
    branchId: selectedBranchId ?? undefined,
    groupId: groupId || undefined,
    search: debouncedSearch || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const { data: groupOptions } = useGroupsSelectQuery();
  const [unfreezeStudentGroup, { isLoading: isUnfreezing }] = useUnfreezeStudentGroupMutation();

  const rows = data?.rows ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const totalCount = data?.meta.total ?? rows.length;

  const [unfreezeTarget, setUnfreezeTarget] = useState<StudentGroupRecord | null>(null);
  const [unfreezeError, setUnfreezeError] = useState<string | null>(null);

  const handleUnfreeze = async () => {
    if (!unfreezeTarget) return;
    setUnfreezeError(null);
    try {
      await unfreezeStudentGroup(unfreezeTarget.id).unwrap();
      toast.success(t("settings.office.studentFreezes.toast.unfrozen"));
      setUnfreezeTarget(null);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.office.studentFreezes.unfreezeConfirm.error");
      setUnfreezeError(detail ? `${generic}: ${detail}` : generic);
    }
  };

  const selectSx = { bgcolor: "#fff", fontSize: 13 };
  const inputSx = {
    "& .MuiOutlinedInput-root": { borderRadius: "6px", fontSize: 13, bgcolor: "#fff" },
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Typography variant="h5" className="!font-semibold !text-gray-800">
          {t("settings.office.studentFreezes.title")}
        </Typography>
        <Typography variant="body2" sx={{ color: "#6b7280" }}>
          {t("settings.office.studentFreezes.quantity", { count: totalCount })}
        </Typography>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <TextField
          size="small"
          placeholder={t("settings.office.studentFreezes.filters.searchByNameOrPhone")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ ...inputSx, width: 220 }}
        />
        <Select
          displayEmpty
          size="small"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          sx={{ ...selectSx, minWidth: 180 }}
        >
          <MenuItem value=""><em style={{ fontStyle: "normal", color: "#9ca3af" }}>{t("settings.office.studentFreezes.filters.allGroups")}</em></MenuItem>
          {(groupOptions ?? []).map((g) => (
            <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
          ))}
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {[
                t("settings.office.studentFreezes.table.number"),
                t("settings.office.studentFreezes.table.student"),
                t("settings.office.studentFreezes.table.group"),
                t("settings.office.studentFreezes.table.reason"),
                t("settings.office.studentFreezes.table.frozenSince"),
                t("settings.office.studentFreezes.table.processedBy"),
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
              rows.map((r, idx) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-gray-500">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td className="px-5 py-3.5 text-gray-800 font-medium whitespace-nowrap">
                    {r.studentName || "—"}
                    {r.studentPhone && <div className="text-xs text-gray-400">{r.studentPhone}</div>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{r.groupName || "—"}</td>
                  <td className="px-5 py-3.5 text-gray-600 max-w-[220px] truncate" title={r.reason ?? undefined}>{r.reason || "—"}</td>
                  <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{formatDate(r.updatedAt)}</td>
                  <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{r.processedBy || "—"}</td>
                  <td className="px-5 py-3.5">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => { setUnfreezeError(null); setUnfreezeTarget(r); }}
                      sx={{ textTransform: "none", fontSize: 12.5, borderRadius: "6px" }}
                    >
                      {t("settings.office.studentFreezes.unfreeze")}
                    </Button>
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

      {/* Unfreeze confirmation */}
      <Dialog open={!!unfreezeTarget} onClose={() => { setUnfreezeTarget(null); setUnfreezeError(null); }} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{t("settings.office.studentFreezes.unfreezeConfirm.title")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.office.studentFreezes.unfreezeConfirm.message", { name: unfreezeTarget?.studentName || "" })}
          </DialogContentText>
          {unfreezeError && <Typography sx={{ fontSize: 13, color: "error.main", mt: 1.5 }}>{unfreezeError}</Typography>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setUnfreezeTarget(null); setUnfreezeError(null); }} disabled={isUnfreezing} sx={{ color: "#667085" }}>
            {t("settings.office.studentFreezes.unfreezeConfirm.cancel")}
          </Button>
          <Button
            variant="contained" disabled={isUnfreezing}
            startIcon={isUnfreezing ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={handleUnfreeze}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            {t("settings.office.studentFreezes.unfreezeConfirm.confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default StudentFreezes;
