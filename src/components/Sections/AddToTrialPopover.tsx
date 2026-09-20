import { useState } from "react";
import { Popover, Typography, TextField, MenuItem, Button, CircularProgress, Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useAllGroupsQuery } from "../../app/api/groupsApi";
import { useAddLeadToTrialMutation } from "../../app/api/leadsApi";
import { useToast } from "../../Context/ToastContext";
import { DatePickerField } from "../../pages/SingleGroup/DatePickerField";

interface Props {
  leadId: string;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

export const AddToTrialPopover = ({ leadId, anchorEl, onClose }: Props) => {
  const { t } = useTranslation();
  const toast = useToast();
  const open = Boolean(anchorEl);
  const { data: groupsData } = useAllGroupsQuery({ page: 1, limit: 100 });
  const [addLeadToTrial, { isLoading }] = useAddLeadToTrialMutation();
  const [groupId, setGroupId] = useState("");
  const [trialDate, setTrialDate] = useState("");
  const [notes, setNotes] = useState("");

  const groups = groupsData?.data ?? [];

  const reset = () => {
    setGroupId("");
    setTrialDate("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!groupId) return;
    try {
      await addLeadToTrial({
        id: leadId,
        groupId,
        trialDate: trialDate || undefined,
        notes: notes || undefined,
      }).unwrap();
      toast.success(t("leadsPage.addToTrial.toast.success"));
      reset();
      onClose();
    } catch {
      toast.error(t("leadsPage.addToTrial.toast.error"));
    }
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      PaperProps={{ sx: { p: 1.5, width: 240, borderRadius: 2 } }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>{t("leadsPage.addToTrial.title")}</Typography>
      <TextField
        size="small" select fullWidth value={groupId}
        onChange={(e) => setGroupId(e.target.value)}
        placeholder={t("leadsPage.addToTrial.selectGroup")}
        sx={{ mb: 1 }}
      >
        {groups.map((g) => (
          <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
        ))}
      </TextField>
      <Box sx={{ mb: 1 }}>
        <DatePickerField value={trialDate} onChange={setTrialDate} placeholder={t("leadsPage.addToTrial.trialDate")} />
      </Box>
      <TextField
        size="small" fullWidth multiline rows={2} value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t("leadsPage.addToTrial.notes")}
        sx={{ mb: 1 }}
      />
      <Button
        fullWidth variant="contained" size="small" disabled={!groupId || isLoading}
        onClick={handleSubmit} sx={{ textTransform: "none" }}
      >
        {isLoading ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : t("leadsPage.addToTrial.submit")}
      </Button>
    </Popover>
  );
};

export default AddToTrialPopover;
