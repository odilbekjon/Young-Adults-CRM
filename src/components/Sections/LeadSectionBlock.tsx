import { useEffect, useState } from "react";
import { Box, Typography, Button, IconButton, TextField, Menu, MenuItem, CircularProgress } from "@mui/material";
import { FiMoreHorizontal, FiPlus } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import type { KanbanSection } from "../../app/api/leadColumnsApi/types";
import {
  useLeadSectionForEditQuery,
  useUpdateLeadSectionMutation,
  useDeleteLeadSectionMutation,
  useCreateGroupFromSectionMutation,
} from "../../app/api/leadSectionsApi";
import { useMoveLeadSectionMutation } from "../../app/api/leadsApi";
import { useToast } from "../../Context/ToastContext";
import { LeadCard } from "./LeadCard";
import { LeadFormDialog } from "./LeadFormDialog";

interface Props {
  section: KanbanSection;
}

export const LeadSectionBlock = ({ section }: Props) => {
  const { t } = useTranslation();
  const toast = useToast();

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(section.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | undefined>(undefined);

  const { data: editData } = useLeadSectionForEditQuery(section.id, { skip: !renaming });
  const [updateLeadSection, { isLoading: isUpdating }] = useUpdateLeadSectionMutation();
  const [deleteLeadSection, { isLoading: isDeleting }] = useDeleteLeadSectionMutation();
  const [createGroupFromSection, { isLoading: isCreatingGroup }] = useCreateGroupFromSectionMutation();
  const [moveLeadSection] = useMoveLeadSectionMutation();

  useEffect(() => {
    if (editData) setName(editData.data.name);
  }, [editData]);

  const handleRename = async () => {
    if (!name.trim()) return;
    try {
      await updateLeadSection({ id: section.id, name: name.trim() }).unwrap();
      toast.success(t("leadsPage.sections.toast.updated"));
      setRenaming(false);
    } catch {
      toast.error(t("leadsPage.sections.toast.error"));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLeadSection(section.id).unwrap();
      toast.success(t("leadsPage.sections.toast.deleted"));
    } catch {
      toast.error(t("leadsPage.sections.toast.error"));
    } finally {
      setConfirmDelete(false);
      setMenuAnchor(null);
    }
  };

  const handleCreateGroup = async () => {
    try {
      await createGroupFromSection({ id: section.id }).unwrap();
      toast.success(t("leadsPage.sections.toast.groupCreated"));
    } catch {
      toast.error(t("leadsPage.sections.toast.error"));
    }
    setMenuAnchor(null);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const leadId = e.dataTransfer.getData("text/plain");
    if (!leadId) return;
    try {
      await moveLeadSection({ id: leadId, sectionId: section.id }).unwrap();
    } catch {
      toast.error(t("leadsPage.leadForm.toast.error"));
    }
  };

  return (
    <Box
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      sx={{
        border: dragOver ? "1.5px dashed #2196f3" : "1.5px dashed transparent",
        borderRadius: 1.5,
        p: dragOver ? 0.5 : 0,
        transition: "all 0.1s",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 0.75, gap: 0.5 }}>
        {renaming ? (
          <>
            <TextField size="small" value={name} onChange={(e) => setName(e.target.value)} autoFocus sx={{ flex: 1, "& input": { fontSize: 12 } }} />
            <IconButton size="small" onClick={handleRename} disabled={isUpdating}>
              {isUpdating ? <CircularProgress size={12} /> : <Typography sx={{ fontSize: 11 }}>{t("leadsPage.sections.save")}</Typography>}
            </IconButton>
          </>
        ) : (
          <>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: "text.disabled", flex: 1, textTransform: "uppercase" }}>
              {section.name} ({section.leads.length})
            </Typography>
            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ color: "text.disabled", p: 0.25 }}>
              <FiMoreHorizontal size={13} />
            </IconButton>
          </>
        )}
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {section.leads.map((lead, idx) => (
          <LeadCard key={lead.id} lead={lead} index={idx} onEdit={() => { setEditingLeadId(lead.id); setLeadDialogOpen(true); }} />
        ))}
      </Box>

      <Button
        fullWidth size="small" startIcon={<FiPlus size={12} />}
        onClick={() => { setEditingLeadId(undefined); setLeadDialogOpen(true); }}
        sx={{ mt: 1, textTransform: "none", fontSize: 11.5, color: "text.secondary", justifyContent: "flex-start" }}
      >
        {t("leadsPage.leadForm.addLead")}
      </Button>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setRenaming(true); setMenuAnchor(null); }}>{t("leadsPage.sections.edit")}</MenuItem>
        <MenuItem onClick={handleCreateGroup} disabled={isCreatingGroup}>
          {isCreatingGroup ? <CircularProgress size={13} sx={{ mr: 1 }} /> : null}{t("leadsPage.sections.createGroup")}
        </MenuItem>
        {confirmDelete ? (
          <MenuItem onClick={handleDelete} disabled={isDeleting} sx={{ color: "error.main" }}>
            {isDeleting ? <CircularProgress size={13} sx={{ mr: 1 }} /> : null}{t("leadsPage.sections.confirmDeleteShort")}
          </MenuItem>
        ) : (
          <MenuItem onClick={() => setConfirmDelete(true)} sx={{ color: "error.main" }}>{t("leadsPage.sections.delete")}</MenuItem>
        )}
      </Menu>

      <LeadFormDialog
        open={leadDialogOpen}
        onClose={() => setLeadDialogOpen(false)}
        sectionId={section.id}
        leadId={editingLeadId}
      />
    </Box>
  );
};

export default LeadSectionBlock;
