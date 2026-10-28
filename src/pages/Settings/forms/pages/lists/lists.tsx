import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { FiEdit2, FiSearch } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";
import { HiOutlineLink } from "react-icons/hi";
import { MdAdd } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import {
  useAllLeadFormsQuery,
  useDeleteLeadFormMutation,
  useToggleLeadFormStatusMutation,
} from "../../../../../app/api/leadFormsApi";
import type { LeadForm, LeadFormStatus, LeadFormType } from "../../../../../app/api/leadFormsApi/types";
import { useToast } from "../../../../../Context/ToastContext";
import { extractApiError } from "../../../../../utils";
import type { RootState } from "../../../../../app/store";

const headCellSx = {
  fontWeight: 700,
  color: "var(--color-text-primary)",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "0.875rem",
  border: "none",
  pb: 1,
};

const PAGE_SIZE = 10;

export const Lists = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | LeadFormStatus>("");
  const [typeFilter, setTypeFilter] = useState<"" | LeadFormType>("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<LeadForm | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  // GET /lead-forms — search, status, type and branchId filters, paginated
  // server-side (the active branch also goes out as the x-branch-id header).
  const { data: formsData, isLoading, isFetching, isError } = useAllLeadFormsQuery({
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    branchId: selectedBranchId && selectedBranchId !== "all" ? selectedBranchId : undefined,
    page,
    limit: PAGE_SIZE,
  });
  const [deleteLeadForm, { isLoading: isDeleting }] = useDeleteLeadFormMutation();
  const [toggleStatus, { isLoading: isToggling }] = useToggleLeadFormStatusMutation();

  const forms = formsData?.data ?? [];
  const totalPages = formsData?.meta.totalPages ?? 1;
  const hasFilters = Boolean(debouncedSearch || statusFilter || typeFilter);

  // Deleting the last form of a page (or switching branch) can leave the
  // current page past the end.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLeadForm(deleteTarget.id).unwrap();
      toast.success(t("settings.forms.lists.toast.deleted"));
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.forms.lists.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    } finally {
      setDeleteTarget(null);
    }
  };

  // PATCH /lead-forms/{id}/toggle-status flips the form's status.
  const handleToggle = async (id: string) => {
    try {
      await toggleStatus(id).unwrap();
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.forms.lists.toast.statusError");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  // The backend only exposes the form's slug; there is no public form page in
  // this app yet, so the copied link is the slug-based path on this origin.
  const handleCopyLink = async (slug: string | null) => {
    if (!slug) {
      toast.error(t("settings.forms.lists.toast.noSlug"));
      return;
    }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/forms/${slug}`);
      toast.success(t("settings.forms.lists.toast.linkCopied"));
    } catch {
      toast.error(t("settings.forms.lists.toast.copyError"));
    }
  };

  const typeLabel = (type: string) =>
    type === "INTERNAL_SURVEY"
      ? t("settings.forms.createForm.tabs.simpleForm")
      : t("settings.forms.createForm.tabs.leadForm");

  return (
    <Box sx={{ backgroundColor: "var(--color-surface-alt)", p: 3, fontFamily: "'DM Sans', sans-serif" }}>
      <Paper
        elevation={0}
        sx={{ width: "100%", maxWidth: 1200, borderRadius: 4, p: 4, backgroundColor: "var(--color-surface)", boxShadow: "0 2px 24px rgba(0,0,0,0.07)" }}
      >
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", mb: 3, gap: 2 }}>
          <Typography
            variant="h5"
            sx={{ fontWeight: 600, color: "var(--color-text-primary)", letterSpacing: "-0.3px", fontFamily: "'DM Sans', sans-serif" }}
          >
            {t("settings.forms.lists.title")}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
            {isFetching && !isLoading && <CircularProgress size={20} />}

            <TextField
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("settings.forms.lists.searchPlaceholder")}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><FiSearch size={16} /></InputAdornment>
                ),
              }}
              sx={{ width: 200, "& .MuiOutlinedInput-root": { fontSize: "0.85rem", borderRadius: "50px" } }}
            />

            <Select
              size="small"
              value={statusFilter}
              displayEmpty
              onChange={(e) => { setStatusFilter(e.target.value as "" | LeadFormStatus); setPage(1); }}
              sx={{ minWidth: 130, fontSize: "0.85rem", borderRadius: "50px" }}
            >
              <MenuItem value="">{t("settings.forms.lists.allStatuses")}</MenuItem>
              <MenuItem value="ACTIVE">{t("settings.forms.lists.statuses.active")}</MenuItem>
              <MenuItem value="INACTIVE">{t("settings.forms.lists.statuses.inactive")}</MenuItem>
            </Select>

            <Select
              size="small"
              value={typeFilter}
              displayEmpty
              onChange={(e) => { setTypeFilter(e.target.value as "" | LeadFormType); setPage(1); }}
              sx={{ minWidth: 150, fontSize: "0.85rem", borderRadius: "50px" }}
            >
              <MenuItem value="">{t("settings.forms.lists.allTypes")}</MenuItem>
              <MenuItem value="PUBLIC_LEAD">{t("settings.forms.createForm.tabs.leadForm")}</MenuItem>
              <MenuItem value="INTERNAL_SURVEY">{t("settings.forms.createForm.tabs.simpleForm")}</MenuItem>
            </Select>

            <Button
              variant="contained"
              startIcon={<MdAdd size={18} />}
              onClick={() => navigate("/settings/forms/create")}
              sx={{
                backgroundColor: "#1a4d6e",
                borderRadius: "50px",
                px: 3,
                py: 1.2,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.9rem",
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: "none",
                "&:hover": { backgroundColor: "#163d58", boxShadow: "none" },
              }}
            >
              {t("settings.forms.lists.actions.addNew")}
            </Button>
          </Box>
        </Box>

        <Box sx={{ borderBottom: "1px solid var(--color-border)", mb: 1 }} />

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
        ) : isError ? (
          <Typography sx={{ color: "#e53935", fontSize: 14, textAlign: "center", py: 4 }}>
            {t("settings.forms.lists.loadError")}
          </Typography>
        ) : forms.length === 0 ? (
          <Typography sx={{ color: "var(--color-text-muted)", fontSize: 14, textAlign: "center", py: 4 }}>
            {hasFilters ? t("settings.forms.lists.noResults") : t("settings.forms.lists.emptyState")}
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={headCellSx}>{t("settings.forms.lists.table.name")}</TableCell>
                  <TableCell sx={headCellSx}>{t("settings.forms.lists.table.type")}</TableCell>
                  <TableCell sx={headCellSx}>{t("settings.forms.lists.table.branch")}</TableCell>
                  <TableCell sx={headCellSx}>{t("settings.forms.lists.table.source")}</TableCell>
                  <TableCell align="right" sx={headCellSx}>{t("settings.forms.lists.table.fields")}</TableCell>
                  <TableCell align="right" sx={headCellSx}>{t("settings.forms.lists.table.views")}</TableCell>
                  <TableCell align="right" sx={headCellSx}>{t("settings.forms.lists.table.submissions")}</TableCell>
                  <TableCell align="center" sx={headCellSx}>{t("settings.forms.lists.table.status")}</TableCell>
                  <TableCell align="right" sx={{ ...headCellSx, width: 150 }}>{t("settings.forms.lists.table.actions")}</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {forms.map((form, index) => {
                  const isActive = form.status.toUpperCase() === "ACTIVE";
                  return (
                    <TableRow
                      key={form.id}
                      sx={{
                        backgroundColor: index % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-alt)",
                        "&:last-child td": { border: "none" },
                        "& td": { border: "none", py: 1.4 },
                      }}
                    >
                      <TableCell sx={{ color: "var(--color-text-primary)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem" }}>
                        {form.title}
                        {form.description && (
                          <Typography sx={{ fontSize: 12, color: "var(--color-text-muted)", mt: 0.3 }} noWrap>{form.description}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={typeLabel(form.type)}
                          sx={{ bgcolor: form.type === "INTERNAL_SURVEY" ? "var(--color-surface-alt)" : "var(--color-primary-surface)", color: "var(--color-primary)", fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.9rem", color: "var(--color-text-primary)" }}>{form.branch?.name ?? "—"}</TableCell>
                      <TableCell sx={{ fontSize: "0.9rem", color: "var(--color-text-primary)" }}>{form.source?.name ?? "—"}</TableCell>
                      <TableCell align="right" sx={{ fontSize: "0.9rem" }}>{form.fieldsCount}</TableCell>
                      <TableCell align="right" sx={{ fontSize: "0.9rem" }}>{form.viewCount}</TableCell>
                      <TableCell align="right" sx={{ fontSize: "0.9rem" }}>{form.submissionCount}</TableCell>
                      <TableCell align="center">
                        <Switch size="small" checked={isActive} disabled={isToggling} onChange={() => handleToggle(form.id)} />
                      </TableCell>

                      <TableCell align="right">
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}>
                          <Tooltip title={t("settings.forms.lists.tooltips.edit")}>
                            <IconButton
                              onClick={() => navigate(`/settings/forms/edit/${form.id}`)}
                              size="small"
                              sx={{ color: "#64b5f6", "&:hover": { backgroundColor: "var(--color-primary-surface)" } }}
                            >
                              <FiEdit2 size={17} />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title={t("settings.forms.lists.tooltips.delete")}>
                            <IconButton
                              size="small"
                              onClick={() => setDeleteTarget(form)}
                              disabled={isDeleting}
                              sx={{ color: "#ef5350", "&:hover": { backgroundColor: "#ffebee" } }}
                            >
                              <RiDeleteBin6Line size={18} />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title={t("settings.forms.lists.tooltips.copyLink")}>
                            <IconButton
                              size="small"
                              onClick={() => handleCopyLink(form.slug)}
                              sx={{ color: "#ffb300", "&:hover": { backgroundColor: "#fff8e1" } }}
                            >
                              <HiOutlineLink size={19} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", pt: 2 }}>
            <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} size="small" />
          </Box>
        )}
      </Paper>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} PaperProps={{ sx: { borderRadius: "14px", width: 380 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{t("settings.forms.lists.deleteConfirm.title")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.forms.lists.deleteConfirm.message", { name: deleteTarget?.title ?? "" })}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            variant="outlined"
            disabled={isDeleting}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px" }}
          >
            {t("settings.forms.lists.deleteConfirm.cancel")}
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px", fontWeight: 600, boxShadow: "none" }}
          >
            {t("settings.forms.lists.tooltips.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
