// src/pages/groups/RemoveStudentDialog.tsx
import { Checkbox, FormControl, FormControlLabel, Radio, RadioGroup, Switch } from "@mui/material";
import { MdClose } from "react-icons/md";
import { inputStyle } from "../styles";
import { RemoveReason } from "../types";

interface RemoveStudentDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleteMode: boolean;
  onDeleteModeChange: (v: boolean) => void;
  reason: RemoveReason;
  onReasonChange: (v: RemoveReason) => void;
  comment: string;
  onCommentChange: (v: string) => void;
  recalculate: boolean;
  onRecalculateChange: (v: boolean) => void;
  scope: "current" | "all";
  onScopeChange: (v: "current" | "all") => void;
}

export const RemoveStudentDialog = ({
  open, onClose, onConfirm,
  deleteMode, onDeleteModeChange,
  reason, onReasonChange,
  comment, onCommentChange,
  recalculate, onRecalculateChange,
  scope, onScopeChange,
}: RemoveStudentDialogProps) => {
  if (!open) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 12, width: 600, maxWidth: "95vw", overflow: "hidden" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #ececec" }}>
          <span style={{ fontSize: 16, fontWeight: 500, color: "#2e2e2e" }}>Do you realy want to delete it?</span>
          <MdClose size={22} style={{ cursor: "pointer", color: "#888" }} onClick={onClose} />
        </div>
        <div style={{ padding: "22px 34px 30px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 22 }}>
            <span style={{ fontSize: 14, color: deleteMode ? "#7d7d7d" : "#5f9bb8" }}>Remove from group</span>
            <Switch
              checked={deleteMode}
              onChange={(e) => onDeleteModeChange(e.target.checked)}
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": { color: "#3d87ad" },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#3d87ad" },
              }}
            />
            <span style={{ fontSize: 14, color: deleteMode ? "#2f2f2f" : "#7d7d7d" }}>Delete student</span>
          </div>

          <div style={{ marginBottom: 14 }}>
            <select
              style={{ ...inputStyle, height: 48, color: reason ? "#1a1a1a" : "#b0b0b0", fontSize: 14 }}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value as RemoveReason)}
            >
              <option value="">Reasons for removal</option>
              <option value="No attendance">No attendance</option>
              <option value="Discipline problem">Discipline problem</option>
              <option value="Moved to another center">Moved to another center</option>
              <option value="Parent request">Parent request</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <textarea
              style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontSize: 14, color: "#555" }}
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="Comment"
            />
          </div>

          <FormControlLabel
            control={
              <Checkbox
                checked={recalculate}
                onChange={(e) => onRecalculateChange(e.target.checked)}
                size="small"
              />
            }
            label={<span style={{ fontSize: 14, color: "#3f3f3f" }}>Recalculate the balance</span>}
            sx={{ m: 0, mb: 1.2 }}
          />

          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <RadioGroup
              row
              value={scope}
              onChange={(e) => onScopeChange(e.target.value as "current" | "all")}
              sx={{ gap: 2 }}
            >
              <FormControlLabel value="current" control={<Radio size="small" />} label={<span style={{ fontSize: 14 }}>Current group</span>} />
              <FormControlLabel value="all" control={<Radio size="small" />} label={<span style={{ fontSize: 14 }}>All groups</span>} />
            </RadioGroup>
          </FormControl>

          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 26 }}>
            <button
              style={{
                background: "#d93f4f", color: "#fff", border: "none",
                borderRadius: 999, padding: "12px 34px", fontSize: 15,
                fontWeight: 600, cursor: "pointer",
                boxShadow: "0 3px 8px rgba(217,63,79,0.35)",
              }}
              onClick={onConfirm}
            >
              Yes
            </button>
            <button
              style={{ background: "#fff", border: "none", color: "#8a8a8a", fontSize: 15, padding: "0 8px", cursor: "pointer" }}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemoveStudentDialog;