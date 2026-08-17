import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Button, IconButton, CircularProgress, Collapse,
} from "@mui/material";
import { FiEdit2, FiTrash2, FiPlus, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import {
  useAllLeadSourcesQuery,
  useLeadSourceForEditQuery,
  useCreateLeadSourceMutation,
  useUpdateLeadSourceMutation,
  useDeleteLeadSourceMutation,
} from "../../app/api/leadSourcesApi";
import { useToast } from "../../Context/ToastContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

export const ManageLeadSourcesDialog = ({ open, onClose }: Props) => {
  const { t } = useTranslation();
  const toast = useToast();

  const { data: sourcesData, isLoading, isError } = useAllLeadSourcesQuery(undefined, { skip: !open });
  const [createLeadSource, { isLoading: isCreating }] = useCreateLeadSourceMutation();
  const [updateLeadSource, { isLoading: isUpdating }] = useUpdateLeadSourceMutation();
  const [deleteLeadSource, { isLoading: isDeleting }] = useDeleteLeadSourceMutation();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: editData } = useLeadSourceForEditQuery(editingId ?? "", { skip: !editingId });

  useEffect(() => {
    if (editData) setEditName(editData.data.name);
  }, [editData]);

  useEffect(() => {
    if (!open) {
      setNewName("");
      setEditingId(null);
      setConfirmDeleteId(null);
    }
  }, [open]);

  const sources = sourcesData?.data ?? [];

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createLeadSource({ name: newName.trim() }).unwrap();
      toast.success(t("leadsPage.sources.toast.created"));
      setNewName("");
    } catch {
      toast.error(t("leadsPage.sources.toast.error"));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateLeadSource({ id: editingId, name: editName.trim() }).unwrap();
      toast.success(t("leadsPage.sources.toast.updated"));
      setEditingId(null);
    } catch {
      toast.error(t("leadsPage.sources.toast.error"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLeadSource(id).unwrap();
      toast.success(t("leadsPage.sources.toast.deleted"));
      setConfirmDeleteId(null);
    } catch {
      toast.error(t("leadsPage.sources.toast.error"));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 600 }}>{t("leadsPage.sources.title")}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <TextField
            size="small" fullWidth value={newName}
            placeholder={t("leadsPage.sources.newSourcePlaceholder")}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          />
          <Button
            variant="contained" onClick={handleCreate} disabled={isCreating || !newName.trim()}
            sx={{ textTransform: "none", flexShrink: 0 }}
            startIcon={isCreating ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <FiPlus size={14} />}
          >
            {t("leadsPage.sources.add")}
          </Button>
        </Box>

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={24} /></Box>
        ) : isError ? (
          <Typography sx={{ color: "#e53935", fontSize: 13, textAlign: "center", py: 3 }}>{t("leadsPage.sources.loadError")}</Typography>
        ) : sources.length === 0 ? (
          <Typography sx={{ color: "#9ca3af", fontSize: 13, textAlign: "center", py: 3 }}>{t("leadsPage.sources.emptyState")}</Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {sources.map((src) => (
              <Box key={src.id} sx={{ border: "1px solid #eee", borderRadius: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1 }}>
                  {editingId === src.id ? (
                    <>
                      <TextField size="small" fullWidth value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                      <Button size="small" onClick={handleSaveEdit} disabled={isUpdating} sx={{ textTransform: "none" }}>
                        {isUpdating ? <CircularProgress size={14} /> : t("leadsPage.sources.save")}
                      </Button>
                      <IconButton size="small" onClick={() => setEditingId(null)}><FiX size={14} /></IconButton>
                    </>
                  ) : (
                    <>
                      <Typography sx={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{src.name}</Typography>
                      <IconButton size="small" onClick={() => setEditingId(src.id)}><FiEdit2 size={13} /></IconButton>
                      <IconButton size="small" onClick={() => setConfirmDeleteId(src.id)} sx={{ color: "#e53935" }}><FiTrash2 size={13} /></IconButton>
                    </>
                  )}
                </Box>

                <Collapse in={confirmDeleteId === src.id}>
                  <Box sx={{ px: 1.5, pb: 1.5, display: "flex", alignItems: "center", gap: 1, borderTop: "1px solid #f5f5f5", pt: 1 }}>
                    <Typography sx={{ fontSize: 12.5, color: "#e53935", flex: 1 }}>{t("leadsPage.sources.confirmDelete")}</Typography>
                    <Button size="small" onClick={() => setConfirmDeleteId(null)} sx={{ textTransform: "none" }}>{t("leadsPage.sources.cancel")}</Button>
                    <Button size="small" color="error" variant="contained" onClick={() => handleDelete(src.id)} disabled={isDeleting} sx={{ textTransform: "none" }}>
                      {isDeleting ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : t("leadsPage.sources.delete")}
                    </Button>
                  </Box>
                </Collapse>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>{t("leadsPage.sources.close")}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManageLeadSourcesDialog;
