// src/pages/groups/TopModal.tsx
import { MdClose } from "react-icons/md";

export const TopModal = ({
  open, onClose, title, maxWidth = 520, children,
}: {
  open: boolean; onClose: () => void; title: string; maxWidth?: number; children: React.ReactNode;
}) => (
  <>
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.18)",
        zIndex: 1200,
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.25s",
      }}
    />
    <div
      style={{
        position: "fixed",
        top: 0,
        left: "50%",
        width: "100%",
        maxWidth,
        maxHeight: "85vh",
        background: "#fff",
        zIndex: 1300,
        borderRadius: "0 0 12px 12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
        transform: open ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(-110%)",
        transition: "transform 0.28s cubic-bezier(.4,0,.2,1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 24px 14px", borderBottom: "1px solid #f0f0f0", flexShrink: 0,
      }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: "#1a1a1a" }}>{title}</span>
        <div onClick={onClose} style={{ cursor: "pointer", color: "#888", fontSize: 20, display: "flex" }}>
          <MdClose />
        </div>
      </div>
      <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>{children}</div>
    </div>
  </>
);

export default TopModal;