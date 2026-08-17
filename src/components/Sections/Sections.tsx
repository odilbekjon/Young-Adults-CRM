import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  TextField,
  CircularProgress,
  Popover,
} from "@mui/material";
import { FiList, FiPlus, FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import {
  useLeadsKanbanQuery,
  useLeadColumnForEditQuery,
  useCreateLeadColumnMutation,
  useUpdateLeadColumnMutation,
  useDeleteLeadColumnMutation,
} from "../../app/api/leadColumnsApi";
import { useCreateLeadSectionMutation } from "../../app/api/leadSectionsApi";
import { useToast } from "../../Context/ToastContext";
import { LeadSectionBlock } from "./LeadSectionBlock";

/* ── per-column edit/delete popover ── */
const ColumnMenu = ({
  columnId, anchorEl, onClose,
}: {
  columnId: string;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const open = Boolean(anchorEl);
  const { data: editData } = useLeadColumnForEditQuery(columnId, { skip: !open });
  const [updateLeadColumn, { isLoading: isUpdating }] = useUpdateLeadColumnMutation();
  const [deleteLeadColumn, { isLoading: isDeleting }] = useDeleteLeadColumnMutation();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (editData) setName(editData.data.name);
  }, [editData]);
  useEffect(() => {
    if (!open) { setEditing(false); setConfirmDelete(false); }
  }, [open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      await updateLeadColumn({ id: columnId, name: name.trim() }).unwrap();
      toast.success(t("leadsPage.columns.toast.updated"));
      onClose();
    } catch {
      toast.error(t("leadsPage.columns.toast.error"));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLeadColumn(columnId).unwrap();
      toast.success(t("leadsPage.columns.toast.deleted"));
      onClose();
    } catch {
      toast.error(t("leadsPage.columns.toast.error"));
    }
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      PaperProps={{ sx: { p: 1.5, width: 220, borderRadius: 2 } }}
    >
      {confirmDelete ? (
        <Box>
          <Typography sx={{ fontSize: 12.5, color: "#e53935", mb: 1 }}>{t("leadsPage.columns.confirmDelete")}</Typography>
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button size="small" onClick={() => setConfirmDelete(false)} sx={{ textTransform: "none" }}>{t("leadsPage.columns.cancel")}</Button>
            <Button size="small" color="error" variant="contained" onClick={handleDelete} disabled={isDeleting} sx={{ textTransform: "none" }}>
              {isDeleting ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : t("leadsPage.columns.delete")}
            </Button>
          </Box>
        </Box>
      ) : editing ? (
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          <TextField size="small" fullWidth value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <IconButton size="small" onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? <CircularProgress size={14} /> : <FiEdit2 size={13} />}
          </IconButton>
          <IconButton size="small" onClick={() => setEditing(false)}><FiX size={14} /></IconButton>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Button size="small" startIcon={<FiEdit2 size={13} />} onClick={() => setEditing(true)} sx={{ justifyContent: "flex-start", textTransform: "none", fontSize: 13 }}>
            {t("leadsPage.columns.edit")}
          </Button>
          <Button size="small" color="error" startIcon={<FiTrash2 size={13} />} onClick={() => setConfirmDelete(true)} sx={{ justifyContent: "flex-start", textTransform: "none", fontSize: 13 }}>
            {t("leadsPage.columns.delete")}
          </Button>
        </Box>
      )}
    </Popover>
  );
};

/* ── new column tile ── */
const AddColumnTile = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [createLeadColumn, { isLoading }] = useCreateLeadColumnMutation();

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createLeadColumn({ name: name.trim() }).unwrap();
      toast.success(t("leadsPage.columns.toast.created"));
      setName("");
      setAdding(false);
    } catch {
      toast.error(t("leadsPage.columns.toast.error"));
    }
  };

  return (
    <Box sx={{ width: 220, flexShrink: 0, p: 1.5 }}>
      {adding ? (
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
          <TextField
            size="small" fullWidth autoFocus value={name}
            placeholder={t("leadsPage.columns.newColumnPlaceholder")}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            sx={{ mb: 1, "& input": { fontSize: 13 } }}
          />
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button fullWidth size="small" variant="contained" disabled={isLoading || !name.trim()} onClick={handleCreate} sx={{ textTransform: "none" }}>
              {isLoading ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : t("leadsPage.columns.add")}
            </Button>
            <Button size="small" onClick={() => { setAdding(false); setName(""); }} sx={{ textTransform: "none" }}>{t("leadsPage.columns.cancel")}</Button>
          </Box>
        </Paper>
      ) : (
        <Button
          fullWidth variant="outlined" startIcon={<FiPlus size={14} />}
          onClick={() => setAdding(true)}
          sx={{ textTransform: "none", color: "text.secondary", borderColor: "divider", borderStyle: "dashed" }}
        >
          {t("leadsPage.columns.addColumn")}
        </Button>
      )}
    </Box>
  );
};

/* ── new section affordance (lives inside a column) ── */
const AddSectionRow = ({ columnId }: { columnId: string }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [createLeadSection, { isLoading }] = useCreateLeadSectionMutation();

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createLeadSection({ columnId, name: name.trim() }).unwrap();
      toast.success(t("leadsPage.sections.toast.created"));
      setName("");
      setAdding(false);
    } catch {
      toast.error(t("leadsPage.sections.toast.error"));
    }
  };

  if (adding) {
    return (
      <Paper variant="outlined" sx={{ p: 1, borderRadius: 1.5 }}>
        <TextField
          size="small" fullWidth autoFocus value={name}
          placeholder={t("leadsPage.sections.newSectionPlaceholder")}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          sx={{ mb: 1, "& input": { fontSize: 12.5 } }}
        />
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button fullWidth size="small" variant="contained" disabled={isLoading || !name.trim()} onClick={handleCreate} sx={{ textTransform: "none", fontSize: 12 }}>
            {isLoading ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : t("leadsPage.sections.add")}
          </Button>
          <Button size="small" onClick={() => { setAdding(false); setName(""); }} sx={{ textTransform: "none", fontSize: 12 }}>{t("leadsPage.sections.cancel")}</Button>
        </Box>
      </Paper>
    );
  }
  return (
    <Button
      fullWidth size="small" startIcon={<FiPlus size={12} />}
      onClick={() => setAdding(true)}
      sx={{ textTransform: "none", fontSize: 12, color: "text.secondary", borderColor: "divider", border: "1px dashed", borderRadius: 1.5 }}
    >
      {t("leadsPage.sections.addSection")}
    </Button>
  );
};

export const Sections = () => {
  const { t } = useTranslation();
  const { data: columns, isLoading, isError } = useLeadsKanbanQuery();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuColumnId, setMenuColumnId] = useState<string | null>(null);

  const openColumnMenu = (e: React.MouseEvent<HTMLElement>, columnId: string) => {
    setMenuAnchor(e.currentTarget);
    setMenuColumnId(columnId);
  };
  const closeColumnMenu = () => { setMenuAnchor(null); setMenuColumnId(null); };

  if (isLoading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>;
  }
  if (isError) {
    return <Typography sx={{ color: "#e53935", fontSize: 14, textAlign: "center", py: 6 }}>{t("leadsPage.board.loadError")}</Typography>;
  }

  return (
    <Box sx={{ display: "flex", gap: 0, mr: 2, alignItems: "flex-start" }}>
      <Box
        sx={{
          display: "flex",
          border: "0.5px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
          backgroundColor: "#fff",
          minHeight: 500,
          flex: 1,
        }}
      >
        {(columns ?? []).length === 0 ? (
          <Box sx={{ p: 4, width: "100%", textAlign: "center" }}>
            <Typography sx={{ color: "#9ca3af", fontSize: 14 }}>{t("leadsPage.board.emptyState")}</Typography>
          </Box>
        ) : (
          (columns ?? []).map((column, i) => {
            const totalLeads = column.sections.reduce((sum, s) => sum + s.leads.length, 0);
            return (
              <Box
                key={column.id}
                sx={{
                  flex: 1,
                  minWidth: 240,
                  borderRight: i < (columns?.length ?? 0) - 1 ? "0.5px solid" : "none",
                  borderColor: "divider",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Header */}
                <Box sx={{ px: 2, py: 1.25, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid", borderColor: "divider" }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", color: "text.primary" }}>
                    {column.name.toUpperCase()} ({totalLeads})
                  </Typography>
                  <IconButton size="small" sx={{ color: "text.disabled" }} onClick={(e) => openColumnMenu(e, column.id)}>
                    <FiList size={14} />
                  </IconButton>
                </Box>

                {/* Body */}
                <Box sx={{ px: 1.5, py: 1.5, flex: 1, display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
                  {column.sections.map((section) => (
                    <LeadSectionBlock key={section.id} section={section} />
                  ))}
                  <AddSectionRow columnId={column.id} />
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      <AddColumnTile />

      {menuColumnId && (
        <ColumnMenu columnId={menuColumnId} anchorEl={menuAnchor} onClose={closeColumnMenu} />
      )}
    </Box>
  );
};
