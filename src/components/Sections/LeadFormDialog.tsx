import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, InputAdornment, Button, MenuItem, CircularProgress,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import {
  useCreateLeadMutation, useUpdateLeadMutation, useLeadForEditQuery, useLazyAllLeadsQuery,
} from "../../app/api/leadsApi";
import { useAllLeadSourcesQuery } from "../../app/api/leadSourcesApi";
import { useCoursesSelectQuery } from "../../app/api/coursesApi";
import { useToast } from "../../Context/ToastContext";
import { fromPhoneInput, toPhoneInput } from "../../utils/formatPhone";
import type { RootState } from "../../app/store";
import { withApiDetail } from "./withApiDetail";

// Phones are compared by their national number (last 9 digits), however they
// were typed or stored.
const phoneKey = (value: string) => value.replace(/\D/g, "").slice(-9);

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
  const { data: sourcesData } = useAllLeadSourcesQuery(undefined, { skip: !open });
  const sources = sourcesData?.data ?? [];
  const { data: courses } = useCoursesSelectQuery(undefined, { skip: !open });

  const [createLead, { isLoading: isCreating }] = useCreateLeadMutation();
  const [updateLead, { isLoading: isUpdating }] = useUpdateLeadMutation();
  const [fetchLeads] = useLazyAllLeadsQuery();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [notes, setNotes] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  // Names of the other leads already using the entered phone. Warns once:
  // while it is set, the next submit skips the check ("Save anyway").
  const [duplicateNames, setDuplicateNames] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setDuplicateNames([]);
      if (leadData) {
        setName(leadData.data.name ?? "");
        setPhone(toPhoneInput(leadData.data.phone));
        setSourceId(leadData.data.sourceId ?? "");
        setCourseId(leadData.data.courseId ?? "");
        setNotes(leadData.data.notes ?? "");
      } else if (!leadId) {
        setName(""); setPhone(""); setSourceId(""); setCourseId(""); setNotes("");
      }
    }
  }, [open, leadData, leadId]);

  const isSaving = isCreating || isUpdating || isChecking;

  // A stored number that isn't a plain 9-digit Uzbek one (e.g. a foreign
  // number) is left alone unless the user edits it, so saving the other
  // fields can't corrupt it.
  const phoneChanged = !isEdit || phone !== toPhoneInput(leadData?.data.phone);
  const phoneInvalid = phoneChanged && phone.replace(/\D/g, "").length !== 9;

  const findDuplicateNames = async (): Promise<string[]> => {
    const key = phoneKey(phone);
    try {
      // GET /leads' `search` matches name or phone, so the national number
      // narrows the list down to the leads that already use it.
      const res = await fetchLeads({ page: 1, limit: 20, search: key }).unwrap();
      return res.data.filter((l) => l.id !== leadId && phoneKey(l.phone ?? "") === key).map((l) => l.name);
    } catch {
      // The check is only a courtesy — if it can't run, saving goes ahead.
      return [];
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || phoneInvalid) return;
    if (phoneChanged && duplicateNames.length === 0) {
      setIsChecking(true);
      const names = await findDuplicateNames();
      setIsChecking(false);
      if (names.length > 0) {
        setDuplicateNames(names);
        return;
      }
    }
    try {
      if (isEdit && leadId) {
        await updateLead({
          id: leadId,
          name: name.trim(),
          phone: phoneChanged ? fromPhoneInput(phone) : undefined,
          sourceId: sourceId || undefined,
          courseId: courseId || undefined,
          // Sent as "" when the comment was emptied, so it can be cleared.
          notes: notes !== (leadData?.data.notes ?? "") ? notes.trim() : undefined,
        }).unwrap();
        toast.success(t("leadsPage.leadForm.toast.updated"));
      } else {
        await createLead({
          name: name.trim(),
          phone: fromPhoneInput(phone),
          sectionId,
          sourceId: sourceId || undefined,
          courseId: courseId || undefined,
          notes: notes.trim() || undefined,
          branchId: selectedBranchId || undefined,
        }).unwrap();
        toast.success(t("leadsPage.leadForm.toast.created"));
      }
      onClose();
    } catch (err) {
      toast.error(withApiDetail(t("leadsPage.leadForm.toast.error"), err));
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
            <TextField
              size="small" type="tel" label={t("leadsPage.leadForm.phone")} placeholder="90 123 45 67" value={phone}
              onChange={(e) => { setPhone(e.target.value); setDuplicateNames([]); }}
              error={phone !== "" && phoneInvalid}
              helperText={phone !== "" && phoneInvalid ? t("leadsPage.leadForm.phoneInvalid") : undefined}
              InputProps={{ startAdornment: <InputAdornment position="start">+998</InputAdornment> }}
            />
            <TextField
              size="small" select label={t("leadsPage.leadForm.source")}
              value={sourceId} onChange={(e) => setSourceId(e.target.value)}
            >
              <MenuItem value=""><em>{t("leadsPage.leadForm.noSource")}</em></MenuItem>
              {sources.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              size="small" select label={t("leadsPage.leadForm.course")}
              value={courseId} onChange={(e) => setCourseId(e.target.value)}
            >
              <MenuItem value=""><em>{t("leadsPage.leadForm.noCourse")}</em></MenuItem>
              {(courses ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" label={t("leadsPage.leadForm.comment")} value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={2} />
            {duplicateNames.length > 0 && (
              <Typography sx={{ fontSize: 12.5, color: "#b45309", backgroundColor: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 1, px: 1.5, py: 1 }}>
                {t("leadsPage.leadForm.duplicatePhone", { names: duplicateNames.join(", ") })}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving} sx={{ textTransform: "none" }}>{t("leadsPage.leadForm.cancel")}</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isSaving || !name.trim() || phoneInvalid} sx={{ textTransform: "none" }}>
          {isSaving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : duplicateNames.length > 0 ? t("leadsPage.leadForm.saveAnyway") : t("leadsPage.leadForm.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeadFormDialog;
