// src/pages/groups/StudentActionsMenu.tsx
import { Menu, MenuItem } from "@mui/material";
import {
  TbColumns, TbWallet, TbFlag, TbInbox, TbTrash, TbClock, TbPlayerPlay,
} from "react-icons/tb";

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
}: StudentActionsMenuProps) => (
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
);

export default StudentActionsMenu;