import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { FiEdit2 } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";
import { HiOutlineLink } from "react-icons/hi";
import { MdAdd } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import {
  useAllLeadFormsQuery,
  useDeleteLeadFormMutation,
  useToggleLeadFormStatusMutation,
} from "../../../../../app/api/leadFormsApi";
import type { LeadFormType } from "../../../../../app/api/leadFormsApi/types";
import { useToast } from "../../../../../Context/ToastContext";
import { extractApiError } from "../../../../../utils";
import type { RootState } from "../../../../../app/store";

const headCellSx = {
  fontWeight: 700,
  color: "#1a1a2e",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "0.875rem",
  border: "none",
  pb: 1,
};

export const Lists = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const [typeFilter, setTypeFilter] = useState<"" | LeadFormType>("");

  // GET /lead-forms — branchId and type are its two documented query params
  // (the active branch also goes out as the x-branch-id header).
  const { data: formsData, isLoading, isError } = useAllLeadFormsQuery({
    branchId: selectedBranchId && selectedBranchId !== "all" ? selectedBranchId : undefined,
    type: typeFilter || undefined,
  });
  const [deleteLeadForm, { isLoading: isDeleting }] = useDeleteLeadFormMutation();
  const [toggleStatus, { isLoading: isToggling }] = useToggleLeadFormStatusMutation();

  const forms = formsData?.data ?? [];

  const handleDelete = async (id: string) => {
    try {
      await deleteLeadForm(id).unwrap();
      toast.success(t("settings.forms.lists.toast.deleted"));
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.forms.lists.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  // PATCH /lead-forms/{id}/toggle-status flips the form's status.
  const handleToggle = async (id: string) => {
    try {
      await toggleStatus(id).unwrap();
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.forms.lists.toast.statusError", { defaultValue: "Failed to change the form status." });
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  // The backend only exposes the form's slug; there is no public form page in
  // this app yet, so the copied link is the slug-based path on this origin.
  const handleCopyLink = async (slug: string | null) => {
    if (!slug) {
      toast.error(t("settings.forms.lists.toast.noSlug", { defaultValue: "This form has no link yet." }));
      return;
    }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/forms/${slug}`);
      toast.success(t("settings.forms.lists.toast.linkCopied", { defaultValue: "Link copied" }));
    } catch {
      toast.error(t("settings.forms.lists.toast.copyError", { defaultValue: "Couldn't copy the link." }));
    }
  };

  const typeLabel = (type: string) =>
    type === "INTERNAL_SURVEY"
      ? t("settings.forms.createForm.tabs.simpleForm")
      : t("settings.forms.createForm.tabs.leadForm");

  return (
    <Box sx={{ backgroundColor: "#f0f2f5", p: 3, fontFamily: "'DM Sans', sans-serif" }}>
      <Paper
        elevation={0}
        sx={{ width: "100%", maxWidth: 1000, borderRadius: 4, p: 4, backgroundColor: "#ffffff", boxShadow: "0 2px 24px rgba(0,0,0,0.07)" }}
      >
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, gap: 2 }}>
          <Typography
            variant="h5"
            sx={{ fontWeight: 600, color: "#1a1a2e", letterSpacing: "-0.3px", fontFamily: "'DM Sans', sans-serif" }}
          >
            {t("settings.forms.lists.title")}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Select
              size="small"
              value={typeFilter}
              displayEmpty
              onChange={(e) => setTypeFilter(e.target.value as "" | LeadFormType)}
              sx={{ minWidth: 150, fontSize: "0.85rem", borderRadius: "50px" }}
            >
              <MenuItem value="">{t("settings.forms.lists.allTypes", { defaultValue: "All types" })}</MenuItem>
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

        <Box sx={{ borderBottom: "1px solid #e8eaed", mb: 1 }} />

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
        ) : isError ? (
          <Typography sx={{ color: "#e53935", fontSize: 14, textAlign: "center", py: 4 }}>
            {t("settings.forms.lists.loadError")}
          </Typography>
        ) : forms.length === 0 ? (
          <Typography sx={{ color: "#9ca3af", fontSize: 14, textAlign: "center", py: 4 }}>
            {t("settings.forms.lists.emptyState")}
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={headCellSx}>{t("settings.forms.lists.table.name")}</TableCell>
                  <TableCell sx={headCellSx}>{t("settings.forms.lists.table.type")}</TableCell>
                  <TableCell align="right" sx={headCellSx}>{t("settings.forms.lists.table.views", { defaultValue: "Views" })}</TableCell>
                  <TableCell align="right" sx={headCellSx}>{t("settings.forms.lists.table.submissions", { defaultValue: "Submissions" })}</TableCell>
                  <TableCell align="center" sx={headCellSx}>{t("settings.forms.lists.table.status", { defaultValue: "Status" })}</TableCell>
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
                        backgroundColor: index % 2 === 0 ? "#ffffff" : "#f7f8fa",
                        "&:last-child td": { border: "none" },
                        "& td": { border: "none", py: 1.4 },
                      }}
                    >
                      <TableCell sx={{ color: "#1a1a2e", fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem" }}>
                        {form.title}
                        {form.description && (
                          <Typography sx={{ fontSize: 12, color: "#9ca3af", mt: 0.3 }} noWrap>{form.description}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={typeLabel(form.type)}
                          sx={{ bgcolor: form.type === "INTERNAL_SURVEY" ? "#eef2f7" : "#e3f2fd", color: "#1a4d6e", fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: "0.9rem" }}>{form.viewsCount}</TableCell>
                      <TableCell align="right" sx={{ fontSize: "0.9rem" }}>{form.submissionsCount}</TableCell>
                      <TableCell align="center">
                        <Switch size="small" checked={isActive} disabled={isToggling} onChange={() => handleToggle(form.id)} />
                      </TableCell>

                      <TableCell align="right">
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}>
                          <Tooltip title={t("settings.forms.lists.tooltips.edit")}>
                            <IconButton
                              onClick={() => navigate(`/settings/forms/edit/${form.id}`)}
                              size="small"
                              sx={{ color: "#64b5f6", "&:hover": { backgroundColor: "#e3f2fd" } }}
                            >
                              <FiEdit2 size={17} />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title={t("settings.forms.lists.tooltips.delete")}>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(form.id)}
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
      </Paper>
    </Box>
  );
};
