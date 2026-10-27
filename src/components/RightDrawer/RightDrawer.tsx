// src/pages/groups/RightDrawer.tsx
import { MdClose } from "react-icons/md";
import { useHasOpened } from "../../hooks/useHasOpened";

export const RightDrawer = ({
  open, onClose, title, width = 480, onKeyDown, children,
}: {
  open: boolean; onClose: () => void; title: string; width?: number;
  // Key handler for the whole drawer (only while open — a closed one stays mounted off-screen),
  // e.g. submitOnEnter(...) so Enter presses the primary button.
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>; children: React.ReactNode;
}) => {
  const hasOpened = useHasOpened(open);

  return (
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
      <div onKeyDown={open ? onKeyDown : undefined} style={{
        position: "fixed", top: 0, right: 0,
        width, height: "100vh",
        background: "var(--color-surface)",
        zIndex: 1300,
        boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.28s cubic-bezier(.4,0,.2,1)",
        display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--color-border-subtle)",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: "var(--color-text-primary)" }}>{title}</span>
          <div onClick={onClose} style={{ cursor: "pointer", color: "var(--color-text-muted)", fontSize: 20, display: "flex" }}>
            <MdClose />
          </div>
        </div>
        <div style={{ padding: 24, flex: 1, overflowY: "auto" }}>
          {hasOpened && children}
        </div>
      </div>
    </>
  );
};

export default RightDrawer;
