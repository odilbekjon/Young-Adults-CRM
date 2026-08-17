import { useState } from "react";
import { Box, Typography, Paper, Avatar, IconButton, Menu, MenuItem, CircularProgress } from "@mui/material";
import { BsThreeDotsVertical } from "react-icons/bs";
import { FiEdit2, FiTrash2, FiUserPlus } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import type { KanbanLead } from "../../app/api/leadColumnsApi/types";
import { useDeleteLeadMutation } from "../../app/api/leadsApi";
import { useToast } from "../../Context/ToastContext";
import { AddToTrialPopover } from "./AddToTrialPopover";

const AVATAR_COLORS = ["#f59e42", "#4f8ef7", "#a78bfa", "#34d399", "#f87171"];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

interface Props {
  lead: KanbanLead;
  index: number;
  onEdit: () => void;
}

export const LeadCard = ({ lead, index, onEdit }: Props) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [trialAnchor, setTrialAnchor] = useState<null | HTMLElement>(null);
  const [deleteLead, { isLoading: isDeleting }] = useDeleteLeadMutation();

  const handleDelete = async () => {
    setMenuAnchor(null);
    try {
      await deleteLead(lead.id).unwrap();
      toast.success(t("leadsPage.leadForm.toast.deleted"));
    } catch {
      toast.error(t("leadsPage.leadForm.toast.error"));
    }
  };

  return (
    <Paper
      variant="outlined"
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", lead.id); e.dataTransfer.effectAllowed = "move"; }}
      sx={{ borderRadius: 1.5, overflow: "hidden", cursor: "grab", opacity: isDeleting ? 0.5 : 1 }}
    >
      <Box sx={{ px: 1.5, py: 1, display: "flex", alignItems: "center", gap: 1 }}>
        <Avatar sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 700, backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length], flexShrink: 0 }}>
          {getInitials(lead.name)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3, color: "text.primary" }} noWrap>{lead.name}</Typography>
          {lead.phone && <Typography sx={{ fontSize: 12, color: "text.secondary", lineHeight: 1.3 }} noWrap>{lead.phone}</Typography>}
        </Box>
        <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ color: "text.disabled", flexShrink: 0 }}>
          <BsThreeDotsVertical size={13} />
        </IconButton>
      </Box>
      {lead.createdAt && (
        <Box sx={{ backgroundColor: "#f9f9f9", borderTop: "0.5px solid", borderColor: "divider", px: 1.5, py: 0.5 }}>
          <Typography sx={{ fontSize: 11, color: "text.disabled" }}>{new Date(lead.createdAt).toLocaleDateString()}</Typography>
        </Box>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setMenuAnchor(null); onEdit(); }}>
          <FiEdit2 size={13} style={{ marginRight: 8 }} /> {t("leadsPage.leadForm.edit")}
        </MenuItem>
        <MenuItem onClick={(e) => { setTrialAnchor(e.currentTarget); setMenuAnchor(null); }}>
          <FiUserPlus size={13} style={{ marginRight: 8 }} /> {t("leadsPage.addToTrial.menuLabel")}
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: "error.main" }} disabled={isDeleting}>
          {isDeleting ? <CircularProgress size={13} sx={{ mr: 1 }} /> : <FiTrash2 size={13} style={{ marginRight: 8 }} />} {t("leadsPage.leadForm.delete")}
        </MenuItem>
      </Menu>

      <AddToTrialPopover leadId={lead.id} anchorEl={trialAnchor} onClose={() => setTrialAnchor(null)} />
    </Paper>
  );
};

export default LeadCard;
