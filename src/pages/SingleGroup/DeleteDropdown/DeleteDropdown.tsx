// src/pages/groups/DeleteDropdown.tsx
import { MdClose } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { CircularProgress } from "@mui/material";
import { TopDropdown } from "../../../components/TopDropdown";
import { cancelBtn, submitBtn } from "../styles";

export const DeleteDropdown = ({
  open, onClose, anchorRef, groupName, onConfirm, loading,
}: {
  open: boolean; onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  groupName: string; onConfirm: () => void;
  loading?: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <TopDropdown open={open} onClose={onClose} anchorRef={anchorRef} width={300}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#c0392b" }}>🗑 {t("singleGroup.deleteDropdown.title")}</span>
        <MdClose size={16} color="#aaa" style={{ cursor: "pointer" }} onClick={onClose} />
      </div>
      <p style={{ fontSize: 13, color: "#555", margin: "0 0 16px" }}>
        <b>{groupName}</b> {t("singleGroup.deleteDropdown.confirmMessage")}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={cancelBtn} onClick={onClose} disabled={loading}>{t("singleGroup.deleteDropdown.cancel")}</button>
        <button
          style={{ ...submitBtn, background: "#c0392b", opacity: loading ? 0.7 : 1 }}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : t("singleGroup.deleteDropdown.delete")}
        </button>
      </div>
    </TopDropdown>
  );
};

export default DeleteDropdown;