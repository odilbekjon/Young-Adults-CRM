import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, TextField, Button, MenuItem, CircularProgress,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useCreateLeadMutation, useUpdateLeadMutation, useLeadForEditQuery } from "../../app/api/leadsApi";
import { useAllLeadSourcesQuery } from "../../app/api/leadSourcesApi";
import { useToast } from "../../Context/ToastContext";
import type { RootState } from "../../app/store";

interface Props {
  open: boolean;
  onClose: () => void;
  sectionId: string;
  leadId?: string;
}

export const LeadFormDialog = ({ open, onClose, sectionId, leadId }: Props) => {
  const { t } = useTranslation();
  const toast = useToast();
  const isEdit = Boolean(leadId);
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const { data: leadData, isLoading: leadLoading } = useLeadForEditQuery(leadId ?? "", { skip: !leadId || !open });
  const { data: sourcesData } = useAllLeadSourcesQuery();
  const sources = sourcesData?.data ?? [];

  const [createLead, { isLoading: isCreating }] = useCreateLeadMutation();
  const [updateLead, { isLoading: isUpdating }] = useUpdateLeadMutation();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      if (leadData) {
        setName(leadData.data.name ?? "");
        setPhone(leadData.data.phone ?? "");
        setSourceId(leadData.data.sourceId ?? "");
        setNotes(leadData.data.notes ?? "");
      } else if (!leadId) {
        setName(""); setPhone(""); setSourceId(""); setNotes("");
      }
    }
  }, [open, leadData, leadId]);

  const isSaving = isCreating || isUpdating;

  const handleSubmit = async () => {
    if (!name.trim()) return;
    // POST /leads requires phone (Swagger); PATCH doesn't, so only enforce on create.
    if (!isEdit && !phone.trim()) return;
    try {
      if (isEdit && leadId) {
        await updateLead({
          id: leadId,
          name: name.trim(),
          phone: phone || undefined,
          sourceId: sourceId || undefined,
          notes: notes || undefined,
        }).unwrap();
        toast.success(t("leadsPage.leadForm.toast.updated"));
      } else {
        await createLead({
          name: name.trim(),
          phone: phone.trim(),
          sectionId,
          sourceId: sourceId || undefined,
          notes: notes || undefined,
          branchId: selectedBranchId || undefined,
        }).unwrap();
        toast.success(t("leadsPage.leadForm.toast.created"));
      }
      onClose();
    } catch {
      toast.error(t("leadsPage.leadForm.toast.error"));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 600 }}>
        {isEdit ? t("leadsPage.leadForm.editTitle") : t("leadsPage.leadForm.addTitle")}
      </DialogTitle>
      <DialogContent dividers>
        {leadLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={24} /></Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}>
            <TextField size="small" label={t("leadsPage.leadForm.name")} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <TextField size="small" label={t("leadsPage.leadForm.phone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <TextField
              size="small" select label={t("leadsPage.leadForm.source")}
              value={sourceId} onChange={(e) => setSourceId(e.target.value)}
            >
              <MenuItem value=""><em>{t("leadsPage.leadForm.noSource")}</em></MenuItem>
              {sources.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" label={t("leadsPage.leadForm.comment")} value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={2} />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving} sx={{ textTransform: "none" }}>{t("leadsPage.leadForm.cancel")}</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isSaving || !name.trim() || (!isEdit && !phone.trim())} sx={{ textTransform: "none" }}>
          {isSaving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : t("leadsPage.leadForm.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeadFormDialog;
