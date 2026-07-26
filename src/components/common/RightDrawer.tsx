import { MdClose } from "react-icons/md";

export const RightDrawer = ({
  open, onClose, title, width = 460, children,
}: {
  open: boolean; onClose: () => void; title: string; width?: number; children: React.ReactNode;
}) => (
  <>
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.18)",
        zIndex: 1200, opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none", transition: "opacity 0.25s",
      }}
    />
    <div
      style={{
        position: "fixed", top: 0, right: 0,
        width, height: "100vh", background: "#fff",
        zIndex: 1300, boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.28s cubic-bezier(.4,0,.2,1)",
        display: "flex", flexDirection: "column",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 24px", borderBottom: "1px solid #f0f0f0", flexShrink: 0,
      }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: "#1a1a1a" }}>{title}</span>
        <div onClick={onClose} style={{ cursor: "pointer", color: "#aaa", display: "flex" }}>
          <MdClose size={20} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        {children}
      </div>
    </div>
  </>
);