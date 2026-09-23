// src/pages/groups/StudentActionsMenu.tsx
import { useState } from "react";
import {
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Button,
} from "@mui/material";
import {
  TbColumns, TbWallet, TbFlag, TbInbox, TbTrash, TbClock, TbPlayerPlay, TbRocket,
} from "react-icons/tb";
import { HiBuildingLibrary } from "react-icons/hi2";
import { FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../hooks/useAuth";

export interface BranchOption {
  id: string;
  name: string;
}

interface StudentActionsMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  isArchived: boolean;
  isFrozen: boolean;
  isTrial?: boolean;
  onActivateArchived: () => void;
  onBackToTrialLesson: () => void;
  onGraduateTrial?: () => void;
  onActivate: () => void;
  onMakeFrozen: () => void;
  onAddPayment: () => void;
  onAddNote: () => void;
  onMoveGroup: () => void;
  onRemove: () => void;
  onReminders: () => void;
  branches: BranchOption[];
  isMovingBranch?: boolean;
  onMoveToBranch: (branchId: string) => Promise<boolean> | boolean;
}

const itemSx = {
  fontSize: 13.5,
  gap: 1.6,
  py: 1.3,
  px: 2.2,
  color: "#374151",
  "&:hover": { backgroundColor: "#f5f6f8" },
};

const iconColor = "#374151";

/* ══════════════════════════════════════════
   Move to Branch Modal — branch options come
   from the real backend (GET /branches), not
   a hardcoded list.
══════════════════════════════════════════ */
const MoveToBranchModal = ({
  open,
  onClose,
  onSubmit,
  branches,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (branchId: string) => Promise<boolean> | boolean;
  branches: BranchOption[];
  isSubmitting?: boolean;
}) => {
  const { t } = useTranslation();
  const [branch, setBranch] = useState("");

  const handleClose = () => {
    if (isSubmitting) return;
    setBranch("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!branch || isSubmitting) return;
    const success = await onSubmit(branch);
    if (success) {
      setBranch("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} PaperProps={{ sx: { width: 620, maxWidth: "95vw", borderRadius: 1 } }}>
      <DialogTitle sx={{ px: 3, py: 2, borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#2e2e2e" }}>
            {t("singleGroup.studentActionsMenu.moveToBranchModal.title")}
          </span>
          <IconButton size="small" onClick={handleClose} disabled={isSubmitting}>
            <FiX size={20} />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent sx={{ p: 4 }}>
        <select
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          disabled={isSubmitting}
          style={{
            width: "100%",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            height: 46,
            padding: "0 12px",
            color: branch ? "#1f2937" : "#a8b0bb",
            fontSize: 14,
            marginBottom: 18,
          }}
        >
          <option value="">{t("singleGroup.studentActionsMenu.moveToBranchModal.selectBranch")}</option>
          {branches.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!branch || isSubmitting}
          sx={{
            textTransform: "none",
            borderRadius: 999,
            bgcolor: "#66c4d8",
            px: 3.5,
            py: 1.2,
            fontWeight: 600,
            "&:hover": { bgcolor: "#55b3c7" },
          }}
        >
          {isSubmitting
            ? t("singleGroup.studentActionsMenu.moveToBranchModal.moving")
            : t("singleGroup.studentActionsMenu.moveToBranchModal.submit")}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export const StudentActionsMenu = ({
  anchorEl,
  onClose,
  isArchived,
  isFrozen,
  isTrial,
  onActivateArchived,
  onBackToTrialLesson,
  onGraduateTrial,
  onActivate,
  onMakeFrozen,
  onAddPayment,
  onAddNote,
  onMoveGroup,
  onRemove,
  onReminders,
  branches,
  isMovingBranch,
  onMoveToBranch,
}: StudentActionsMenuProps) => {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [branchModalOpen, setBranchModalOpen] = useState(false);

  const handleOpenBranchModal = () => {
    onClose();
    setBranchModalOpen(true);
  };

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={onClose}
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            minWidth: 230,
            boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
            border: "1px solid #f0f0f0",
            py: 0.5,
          },
        }}
      >
        {isArchived ? (
          <div>
            <MenuItem onClick={onActivateArchived} sx={itemSx}>
              <TbPlayerPlay size={18} color={iconColor} />
              {t("singleGroup.studentActionsMenu.activate")}
            </MenuItem>
            <MenuItem onClick={onBackToTrialLesson} sx={itemSx}>
              <TbClock size={18} color={iconColor} />
              {t("singleGroup.studentActionsMenu.backToTrialLesson")}
            </MenuItem>
          </div>
        ) : (
          <div>
            {isFrozen ? (
              <MenuItem onClick={onActivate} sx={itemSx}>
                <TbPlayerPlay size={18} color={iconColor} />
                {t("singleGroup.studentActionsMenu.activate")}
              </MenuItem>
            ) : (
              <MenuItem onClick={onMakeFrozen} sx={itemSx}>
                <TbColumns size={18} color={iconColor} />
                {t("singleGroup.studentActionsMenu.makeFrozen")}
              </MenuItem>
            )}
            {isTrial && onGraduateTrial && (
              <MenuItem onClick={onGraduateTrial} sx={itemSx}>
                <TbRocket size={18} color={iconColor} />
                {t("singleGroup.studentActionsMenu.graduateTrial")}
              </MenuItem>
            )}
            {hasPermission("PAYMENTS", "CREATE") && (
              <MenuItem onClick={onAddPayment} sx={itemSx}>
                <TbWallet size={18} color={iconColor} />
                {t("singleGroup.studentActionsMenu.addPayment")}
              </MenuItem>
            )}
            <MenuItem onClick={onAddNote} sx={itemSx}>
              <TbFlag size={18} color={iconColor} />
              {t("singleGroup.studentActionsMenu.addNewNote")}
            </MenuItem>
            <MenuItem onClick={onMoveGroup} sx={itemSx}>
              <TbInbox size={18} color={iconColor} />
              {t("singleGroup.studentActionsMenu.moveStudentToGroup")}
            </MenuItem>
            <MenuItem onClick={handleOpenBranchModal} sx={itemSx}>
              <HiBuildingLibrary size={18} color={iconColor} />
              {t("singleGroup.studentActionsMenu.moveStudentToBranch")}
            </MenuItem>
            <MenuItem onClick={onRemove} sx={itemSx}>
              <TbTrash size={18} color={iconColor} />
              {t("singleGroup.studentActionsMenu.removeFromGroup")}
            </MenuItem>
            <MenuItem onClick={onReminders} sx={itemSx}>
              <TbClock size={18} color={iconColor} />
              {t("singleGroup.studentActionsMenu.reminders")}
            </MenuItem>
          </div>
        )}
      </Menu>

      <MoveToBranchModal
        open={branchModalOpen}
        onClose={() => setBranchModalOpen(false)}
        onSubmit={onMoveToBranch}
        branches={branches}
        isSubmitting={isMovingBranch}
      />
    </>
  );
};

export default StudentActionsMenu;