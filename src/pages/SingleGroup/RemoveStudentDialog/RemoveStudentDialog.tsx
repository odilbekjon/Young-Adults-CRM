// src/pages/groups/RemoveStudentDialog.tsx
import { Checkbox, FormControl, FormControlLabel, Radio, RadioGroup, Switch, Tooltip } from "@mui/material";
import { MdClose } from "react-icons/md";
import { useTranslation } from "react-i18next";

interface ReasonOption {
  id: string;
  name: string;
}

interface RemoveStudentDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  reasonId: string;
  onReasonIdChange: (v: string) => void;
  reasons: ReasonOption[];
  // GET /reasons/select state — the select shows a loading / empty / error
  // placeholder instead of silently rendering with no options.
  reasonsLoading?: boolean;
  reasonsError?: boolean;
  comment: string;
  onCommentChange: (v: string) => void;
  recalculate: boolean;
  onRecalculateChange: (v: boolean) => void;
  scope: "current" | "all";
  onScopeChange: (v: "current" | "all") => void;
  loading?: boolean;
  // The "Recalculate the balance" + "Current group/All groups" block only
  // makes sense when the caller is scoped to one specific group membership
  // (SingleGroup). Callers with no such context (e.g. the flat Students
  // list, where "delete" always targets the whole account) hide it.
  showGroupScope?: boolean;
  // Overrides the left/off-toggle label, which otherwise reads "Remove from
  // group" — not accurate for a caller with no group context.
  archiveLabel?: string;
  // Shows the "Remove from group | Delete student" toggle from the reference
  // design. "Delete student" never hard-deletes: permanent deletion is
  // deliberately only reachable from the Archive page (see commit 6b20273),
  // so this side ARCHIVES the student's whole account (the caller decides
  // how — SingleGroup ends every membership, then POST /students/{id}/status
  // INACTIVE with the reason). Without `onDeleteModeChange` the switch stays
  // rendered locked on the "Remove from group" side (previous behaviour).
  showDeleteToggle?: boolean;
  deleteMode?: boolean;
  onDeleteModeChange?: (v: boolean) => void;
}

const BLUE = "#2f80ed";
const FIELD_BORDER = "1px solid #d7dce3";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: FIELD_BORDER,
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 14,
  fontFamily: "inherit",
  color: "#1a1a1a",
  background: "#fff",
  outline: "none",
};

// Inline chevron so the native <select> matches the textarea's box exactly
// (appearance: none drops the OS arrow, which differs per browser).
const chevron =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%239aa3af' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")";

export const RemoveStudentDialog = ({
  open, onClose, onConfirm,
  reasonId, onReasonIdChange,
  reasons, reasonsLoading, reasonsError,
  comment, onCommentChange,
  recalculate, onRecalculateChange,
  scope, onScopeChange,
  loading,
  showGroupScope = true,
  archiveLabel,
  showDeleteToggle = false,
  deleteMode = false,
  onDeleteModeChange,
}: RemoveStudentDialogProps) => {
  const { t } = useTranslation();
  if (!open) return null;

  const toggleEnabled = Boolean(onDeleteModeChange);
  const archiving = toggleEnabled && deleteMode;

  const placeholder = reasonsLoading
    ? t("singleGroup.removeStudentDialog.reasonsLoading")
    : t("singleGroup.removeStudentDialog.reasonsForRemoval");

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", background: "#fff", borderRadius: 14, width: 520, maxWidth: "95vw", maxHeight: "95vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
      >
        <MdClose
          size={22}
          style={{ position: "absolute", top: 16, right: 16, cursor: "pointer", color: "#8a8f98" }}
          onClick={onClose}
        />

        <div style={{ padding: "34px 36px 30px" }}>
          <div style={{ textAlign: "center", fontSize: 20, fontWeight: 500, color: "#2e2e2e", marginBottom: 20 }}>
            {t("singleGroup.removeStudentDialog.title")}
          </div>

          {showDeleteToggle ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 22 }}>
              <span style={{ fontSize: 14, fontWeight: archiving ? 400 : 500, color: archiving ? "#8a8f98" : BLUE }}>
                {archiveLabel ?? t("singleGroup.removeStudentDialog.removeFromGroup")}
              </span>
              <Tooltip
                title={t(toggleEnabled
                  ? "singleGroup.removeStudentDialog.deleteStudentHint"
                  : "singleGroup.removeStudentDialog.deleteOnlyInArchive")}
                arrow
              >
                {/* span wrapper — a disabled control doesn't emit the hover events a Tooltip needs */}
                <span>
                  <Switch
                    checked={archiving}
                    disabled={!toggleEnabled || loading}
                    onChange={(e) => onDeleteModeChange?.(e.target.checked)}
                    sx={{
                      "& .MuiSwitch-track": { backgroundColor: "#cfd6de", opacity: 1 },
                      "& .MuiSwitch-thumb": { backgroundColor: "#fff" },
                      "& .Mui-checked + .MuiSwitch-track": { backgroundColor: "#d93f4f", opacity: 1 },
                      "& .Mui-checked .MuiSwitch-thumb": { backgroundColor: "#fff" },
                    }}
                  />
                </span>
              </Tooltip>
              <span style={{ fontSize: 14, fontWeight: archiving ? 500 : 400, color: archiving ? "#d93f4f" : "#8a8f98" }}>
                {t("singleGroup.removeStudentDialog.deleteStudent")}
              </span>
            </div>
          ) : (
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <span style={{ fontSize: 14, color: BLUE, fontWeight: 500 }}>
                {archiveLabel ?? t("singleGroup.removeStudentDialog.removeFromGroup")}
              </span>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <select
              style={{
                ...fieldStyle,
                height: 48,
                paddingRight: 38,
                appearance: "none",
                WebkitAppearance: "none",
                backgroundImage: chevron,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 14px center",
                color: reasonId ? "#1a1a1a" : "#9aa3af",
                cursor: reasonsLoading ? "wait" : "pointer",
              }}
              value={reasonId}
              disabled={reasonsLoading}
              onChange={(e) => onReasonIdChange(e.target.value)}
            >
              <option value="">{placeholder}</option>
              {!reasonsLoading && reasons.length === 0 && (
                <option value="" disabled>{t("singleGroup.removeStudentDialog.reasonsEmpty")}</option>
              )}
              {reasons.map((r) => (
                <option key={r.id} value={r.id} style={{ color: "#1a1a1a" }}>{r.name}</option>
              ))}
            </select>
            {reasonsError && (
              <div style={{ fontSize: 12, color: "#d93f4f", marginTop: 6 }}>
                {t("singleGroup.removeStudentDialog.reasonsError")}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <textarea
              style={{ ...fieldStyle, minHeight: 96, resize: "vertical", color: "#3f3f3f" }}
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder={t("singleGroup.removeStudentDialog.commentPlaceholder")}
            />
          </div>

          {showGroupScope && (
            <div style={{ marginBottom: 26 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={recalculate}
                    onChange={(e) => onRecalculateChange(e.target.checked)}
                    size="small"
                    sx={{ color: "#9aa3af", "&.Mui-checked": { color: BLUE } }}
                  />
                }
                label={<span style={{ fontSize: 14, color: "#3f3f3f" }}>{t("singleGroup.removeStudentDialog.recalculateBalance")}</span>}
                sx={{ ml: "-11px", mr: 0, mt: 0, mb: 0.5 }}
              />

              <FormControl component="fieldset" sx={{ display: "block" }}>
                <RadioGroup
                  row
                  value={archiving ? "all" : scope}
                  onChange={(e) => onScopeChange(e.target.value as "current" | "all")}
                  sx={{ gap: 2 }}
                >
                  <FormControlLabel
                    value="current"
                    disabled={archiving}
                    control={<Radio size="small" sx={{ color: "#9aa3af", "&.Mui-checked": { color: BLUE } }} />}
                    label={<span style={{ fontSize: 14, color: "#3f3f3f" }}>{t("singleGroup.removeStudentDialog.currentGroup")}</span>}
                  />
                  <FormControlLabel
                    value="all"
                    disabled={archiving}
                    control={<Radio size="small" sx={{ color: "#9aa3af", "&.Mui-checked": { color: BLUE } }} />}
                    label={<span style={{ fontSize: 14, color: "#3f3f3f" }}>{t("singleGroup.removeStudentDialog.allGroups")}</span>}
                  />
                </RadioGroup>
              </FormControl>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 24, marginTop: showGroupScope ? 0 : 8 }}>
            <button
              style={{
                background: "#d93f4f", color: "#fff", border: "none",
                borderRadius: 999, padding: "12px 38px", fontSize: 15,
                fontWeight: 600, cursor: loading ? "default" : "pointer",
                boxShadow: "0 3px 8px rgba(217,63,79,0.35)",
                opacity: loading ? 0.7 : 1,
              }}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? "…" : t("singleGroup.removeStudentDialog.yes")}
            </button>
            <button
              style={{ background: "transparent", border: "none", color: "#8a8a8a", fontSize: 15, padding: "0 8px", cursor: loading ? "default" : "pointer" }}
              onClick={onClose}
              disabled={loading}
            >
              {t("singleGroup.removeStudentDialog.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemoveStudentDialog;
