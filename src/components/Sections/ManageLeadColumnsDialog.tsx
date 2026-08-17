import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Button, IconButton, CircularProgress, Collapse,
} from "@mui/material";
import { FiEdit2, FiTrash2, FiInfo, FiPlus, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import {
  useAllLeadColumnsQuery,
  useLeadColumnByIdQuery,
  useLeadColumnForEditQuery,
  useCreateLeadColumnMutation,
  useUpdateLeadColumnMutation,
  useDeleteLeadColumnMutation,
} from "../../app/api/leadColumnsApi";
import { useToast } from "../../Context/ToastContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

export const ManageLeadColumnsDialog = ({ open, onClose }: Props) => {
  const { t } = useTranslation();
  const toast = useToast();

  const { data: columnsData, isLoading, isError } = useAllLeadColumnsQuery(undefined, { skip: !open });
  const [createLeadColumn, { isLoading: isCreating }] = useCreateLeadColumnMutation();
  const [updateLeadColumn, { isLoading: isUpdating }] = useUpdateLeadColumnMutation();
  const [deleteLeadColumn, { isLoading: isDeleting }] = useDeleteLeadColumnMutation();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: editData } = useLeadColumnForEditQuery(editingId ?? "", { skip: !editingId });
  const { data: detailsData, isLoading: detailsLoading } = useLeadColumnByIdQuery(detailsId ?? "", { skip: !detailsId });

  useEffect(() => {
    if (editData) setEditName(editData.data.name);
  }, [editData]);

  useEffect(() => {
    if (!open) {
      setNewName("");
      setEditingId(null);
      setDetailsId(null);
      setConfirmDeleteId(null);
    }
  }, [open]);

  const columns = columnsData?.data ?? [];

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createLeadColumn({ name: newName.trim() }).unwrap();
      toast.success(t("leadsPage.columns.toast.created"));
      setNewName("");
    } catch {
      toast.error(t("leadsPage.columns.toast.error"));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateLeadColumn({ id: editingId, name: editName.trim() }).unwrap();
      toast.success(t("leadsPage.columns.toast.updated"));
      setEditingId(null);
    } catch {
      toast.error(t("leadsPage.columns.toast.error"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLeadColumn(id).unwrap();
      toast.success(t("leadsPage.columns.toast.deleted"));
      setConfirmDeleteId(null);
    } catch {
      toast.error(t("leadsPage.columns.toast.error"));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 600 }}>{t("leadsPage.columns.title")}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <TextField
            size="small" fullWidth value={newName}
            placeholder={t("leadsPage.columns.newColumnPlaceholder")}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          />
          <Button
            variant="contained" onClick={handleCreate} disabled={isCreating || !newName.trim()}
            sx={{ textTransform: "none", flexShrink: 0 }}
            startIcon={isCreating ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <FiPlus size={14} />}
          >
            {t("leadsPage.columns.add")}
          </Button>
        </Box>

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={24} /></Box>
        ) : isError ? (
          <Typography sx={{ color: "#e53935", fontSize: 13, textAlign: "center", py: 3 }}>{t("leadsPage.columns.loadError")}</Typography>
        ) : columns.length === 0 ? (
          <Typography sx={{ color: "#9ca3af", fontSize: 13, textAlign: "center", py: 3 }}>{t("leadsPage.columns.emptyState")}</Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {columns.map((col) => (
              <Box key={col.id} sx={{ border: "1px solid #eee", borderRadius: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1 }}>
                  {editingId === col.id ? (
                    <>
                      <TextField size="small" fullWidth value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                      <Button size="small" onClick={handleSaveEdit} disabled={isUpdating} sx={{ textTransform: "none" }}>
                        {isUpdating ? <CircularProgress size={14} /> : t("leadsPage.columns.save")}
                      </Button>
                      <IconButton size="small" onClick={() => setEditingId(null)}><FiX size={14} /></IconButton>
                    </>
                  ) : (
                    <>
                      <Typography sx={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{col.name}</Typography>
                      <IconButton size="small" onClick={() => setDetailsId(detailsId === col.id ? null : col.id)}><FiInfo size={14} /></IconButton>
                      <IconButton size="small" onClick={() => setEditingId(col.id)}><FiEdit2 size={13} /></IconButton>
                      <IconButton size="small" onClick={() => setConfirmDeleteId(col.id)} sx={{ color: "#e53935" }}><FiTrash2 size={13} /></IconButton>
                    </>
                  )}
                </Box>

                <Collapse in={detailsId === col.id}>
                  <Box sx={{ px: 1.5, pb: 1.5, borderTop: "1px solid #f5f5f5", pt: 1 }}>
                    {detailsLoading ? (
                      <CircularProgress size={16} />
                    ) : (
                      <>
                        <Typography sx={{ fontSize: 12, color: "#888" }}>ID: {detailsData?.data.id ?? col.id}</Typography>
                        {detailsData?.data.createdAt && (
                          <Typography sx={{ fontSize: 12, color: "#888" }}>
                            {t("leadsPage.columns.createdAt")}: {new Date(detailsData.data.createdAt).toLocaleString()}
                          </Typography>
                        )}
                      </>
                    )}
                  </Box>
                </Collapse>

                <Collapse in={confirmDeleteId === col.id}>
                  <Box sx={{ px: 1.5, pb: 1.5, display: "flex", alignItems: "center", gap: 1, borderTop: "1px solid #f5f5f5", pt: 1 }}>
                    <Typography sx={{ fontSize: 12.5, color: "#e53935", flex: 1 }}>{t("leadsPage.columns.confirmDelete")}</Typography>
                    <Button size="small" onClick={() => setConfirmDeleteId(null)} sx={{ textTransform: "none" }}>{t("leadsPage.columns.cancel")}</Button>
                    <Button size="small" color="error" variant="contained" onClick={() => handleDelete(col.id)} disabled={isDeleting} sx={{ textTransform: "none" }}>
                      {isDeleting ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : t("leadsPage.columns.delete")}
                    </Button>
                  </Box>
                </Collapse>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>{t("leadsPage.columns.close")}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManageLeadColumnsDialog;
