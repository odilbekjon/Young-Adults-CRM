import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, TextField, Button, MenuItem, CircularProgress,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useCreateLeadMutation, useUpdateLeadMutation, useLeadForEditQuery } from "../../app/api/leadsApi";
import { useAllLeadSourcesQuery } from "../../app/api/leadSourcesApi";
import { useToast } from "../../Context/ToastContext";

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

  const { data: leadData, isLoading: leadLoading } = useLeadForEditQuery(leadId ?? "", { skip: !leadId || !open });
  const { data: sourcesData } = useAllLeadSourcesQuery();
  const sources = sourcesData?.data ?? [];

  const [createLead, { isLoading: isCreating }] = useCreateLeadMutation();
  const [updateLead, { isLoading: isUpdating }] = useUpdateLeadMutation();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [leadSourceId, setLeadSourceId] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (open) {
      if (leadData) {
        setName(leadData.data.name ?? "");
        setPhone(leadData.data.phone ?? "");
        setEmail(leadData.data.email ?? "");
        setLeadSourceId(leadData.data.leadSourceId ?? "");
        setComment(leadData.data.comment ?? "");
      } else if (!leadId) {
        setName(""); setPhone(""); setEmail(""); setLeadSourceId(""); setComment("");
      }
    }
  }, [open, leadData, leadId]);

  const isSaving = isCreating || isUpdating;

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      if (isEdit && leadId) {
        await updateLead({
          id: leadId,
          name: name.trim(),
          phone: phone || undefined,
          email: email || undefined,
          leadSourceId: leadSourceId || undefined,
          comment: comment || undefined,
        }).unwrap();
        toast.success(t("leadsPage.leadForm.toast.updated"));
      } else {
        await createLead({
          name: name.trim(),
          phone: phone || undefined,
          email: email || undefined,
          sectionId,
          leadSourceId: leadSourceId || undefined,
          comment: comment || undefined,
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
            <TextField size="small" label={t("leadsPage.leadForm.email")} value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField
              size="small" select label={t("leadsPage.leadForm.source")}
              value={leadSourceId} onChange={(e) => setLeadSourceId(e.target.value)}
            >
              <MenuItem value=""><em>{t("leadsPage.leadForm.noSource")}</em></MenuItem>
              {sources.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" label={t("leadsPage.leadForm.comment")} value={comment} onChange={(e) => setComment(e.target.value)} multiline rows={2} />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving} sx={{ textTransform: "none" }}>{t("leadsPage.leadForm.cancel")}</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isSaving || !name.trim()} sx={{ textTransform: "none" }}>
          {isSaving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : t("leadsPage.leadForm.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeadFormDialog;
