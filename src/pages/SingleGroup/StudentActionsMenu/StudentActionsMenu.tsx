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
  TbColumns, TbWallet, TbFlag, TbInbox, TbTrash, TbClock, TbPlayerPlay,
} from "react-icons/tb";
import { HiBuildingLibrary } from "react-icons/hi2";
import { FiX } from "react-icons/fi";
import { BRANCH_OPTIONS, type BranchId } from "../../../Context/BranchContext";

interface StudentActionsMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  isArchived: boolean;
  isFrozen: boolean;
  onActivateArchived: () => void;
  onBackToTrialLesson: () => void;
  onActivate: () => void;
  onMakeFrozen: () => void;
  onAddPayment: () => void;
  onAddNote: () => void;
  onMoveGroup: () => void;
  onRemove: () => void;
  onReminders: () => void;
  onMoveToBranch: (branch: BranchId) => void;
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
   Move to Branch Modal — options come from
   the same BRANCH_OPTIONS used in the Header
══════════════════════════════════════════ */
const MoveToBranchModal = ({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (branch: BranchId) => void;
}) => {
  const [branch, setBranch] = useState<BranchId | "">("");

  const handleClose = () => {
    setBranch("");
    onClose();
  };

  const handleSubmit = () => {
    if (!branch) return;
    onSubmit(branch);
    setBranch("");
  };

  return (
    <Dialog open={open} onClose={handleClose} PaperProps={{ sx: { width: 620, maxWidth: "95vw", borderRadius: 1 } }}>
      <DialogTitle sx={{ px: 3, py: 2, borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#2e2e2e" }}>
            Move student to branch
          </span>
          <IconButton size="small" onClick={handleClose}>
            <FiX size={20} />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent sx={{ p: 4 }}>
        <select
          value={branch}
          onChange={(e) => setBranch(e.target.value as BranchId)}
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
          <option value="">Select branch</option>
          {BRANCH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!branch}
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
          Move to branch
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
  onActivateArchived,
  onBackToTrialLesson,
  onActivate,
  onMakeFrozen,
  onAddPayment,
  onAddNote,
  onMoveGroup,
  onRemove,
  onReminders,
  onMoveToBranch,
}: StudentActionsMenuProps) => {
  const [branchModalOpen, setBranchModalOpen] = useState(false);

  const handleOpenBranchModal = () => {
    onClose();
    setBranchModalOpen(true);
  };

  const handleSubmitBranch = (branch: BranchId) => {
    onMoveToBranch(branch);
    setBranchModalOpen(false);
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
              Activate
            </MenuItem>
            <MenuItem onClick={onBackToTrialLesson} sx={itemSx}>
              <TbClock size={18} color={iconColor} />
              Back to trial lesson
            </MenuItem>
          </div>
        ) : (
          <div>
            {isFrozen ? (
              <MenuItem onClick={onActivate} sx={itemSx}>
                <TbPlayerPlay size={18} color={iconColor} />
                Activate
              </MenuItem>
            ) : (
              <MenuItem onClick={onMakeFrozen} sx={itemSx}>
                <TbColumns size={18} color={iconColor} />
                Make Frozen
              </MenuItem>
            )}
            <MenuItem onClick={onAddPayment} sx={itemSx}>
              <TbWallet size={18} color={iconColor} />
              Add payment
            </MenuItem>
            <MenuItem onClick={onAddNote} sx={itemSx}>
              <TbFlag size={18} color={iconColor} />
              Add new note
            </MenuItem>
            <MenuItem onClick={onMoveGroup} sx={itemSx}>
              <TbInbox size={18} color={iconColor} />
              Move student to group
            </MenuItem>
            <MenuItem onClick={handleOpenBranchModal} sx={itemSx}>
              <HiBuildingLibrary size={18} color={iconColor} />
              Move student to branch
            </MenuItem>
            <MenuItem onClick={onRemove} sx={itemSx}>
              <TbTrash size={18} color={iconColor} />
              Remove from group
            </MenuItem>
            <MenuItem onClick={onReminders} sx={itemSx}>
              <TbClock size={18} color={iconColor} />
              Reminders
            </MenuItem>
          </div>
        )}
      </Menu>

      <MoveToBranchModal
        open={branchModalOpen}
        onClose={() => setBranchModalOpen(false)}
        onSubmit={handleSubmitBranch}
      />
    </>
  );
};

export default StudentActionsMenu;