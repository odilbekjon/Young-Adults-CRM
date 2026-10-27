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
import { DatePickerField } from "../DatePickerField";
import { submitOnEnter } from "../../../utils/submitOnEnter";

// Local calendar date (toISOString() is UTC, still "yesterday" just after
// midnight in UTC+5).
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

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
  onMoveToBranch: (branchId: string, reason: string | undefined, paymentEndDate: string) => Promise<boolean> | boolean;
}

const itemSx = {
  fontSize: 13.5,
  gap: 1.6,
  py: 1.3,
  px: 2.2,
  color: "var(--color-text-primary)",
  "&:hover": { backgroundColor: "var(--color-surface-alt)" },
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
  onSubmit: (branchId: string, reason: string | undefined, paymentEndDate: string) => Promise<boolean> | boolean;
  branches: BranchOption[];
  isSubmitting?: boolean;
}) => {
  const { t } = useTranslation();
  const [branch, setBranch] = useState("");
  const [reason, setReason] = useState("");
  const [paymentEndDate, setPaymentEndDate] = useState(todayISO());

  const handleClose = () => {
    if (isSubmitting) return;
    setBranch("");
    setReason("");
    setPaymentEndDate(todayISO());
    onClose();
  };

  const handleSubmit = async () => {
    if (!branch || !paymentEndDate || isSubmitting) return;
    const success = await onSubmit(branch, reason.trim() || undefined, paymentEndDate);
    if (success) {
      setBranch("");
      setReason("");
      setPaymentEndDate(todayISO());
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} onKeyDown={submitOnEnter(handleSubmit)} PaperProps={{ sx: { width: 620, maxWidth: "95vw", borderRadius: 1 } }}>
      <DialogTitle sx={{ px: 3, py: 2, borderBottom: "1px solid var(--color-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)" }}>
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
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            height: 46,
            padding: "0 12px",
            color: branch ? "var(--color-text-primary)" : "#a8b0bb",
            fontSize: 14,
            marginBottom: 12,
          }}
        >
          <option value="">{t("singleGroup.studentActionsMenu.moveToBranchModal.selectBranch")}</option>
          {branches.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
        {/* POST /students/{id}/transfer-branch takes a `reason` alongside the
            branch (Swagger body {newBranchId, reason}) — optional here, a
            default is sent when it's left empty (see handleMoveToBranch). */}
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={isSubmitting}
          placeholder={t("singleGroup.studentActionsMenu.moveToBranchModal.reasonPlaceholder")}
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            height: 42,
            padding: "0 12px",
            color: "var(--color-text-primary)",
            fontSize: 14,
            marginBottom: 12,
          }}
        />
        {/* paymentEndDate (Swagger body field): last day of payment accounting
            in the old branch — the backend closes the old groups and settles
            the balance up to it. */}
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>
          {t("singleGroup.studentActionsMenu.moveToBranchModal.paymentEndDate")}
        </div>
        <div style={{ marginBottom: 18 }}>
          <DatePickerField value={paymentEndDate} onChange={setPaymentEndDate} disabled={isSubmitting} />
        </div>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!branch || !paymentEndDate || isSubmitting}
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
            border: "1px solid var(--color-border-subtle)",
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