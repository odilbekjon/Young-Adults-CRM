// src/pages/groups/TopDropdown.tsx
import { useEffect, useRef, useState } from "react";

export const TopDropdown = ({
  open, onClose, anchorRef, children, width = 320,
}: {
  open: boolean; onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  children: React.ReactNode; width?: number;
}) => {
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: Math.min(rect.left, window.innerWidth - width - 12) });
    }
  }, [open, anchorRef, width]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={dropRef}
      style={{
        position: "fixed",
        top: pos.top, left: pos.left,
        zIndex: 1400,
        background: "#fff",
        border: "1px solid #e8e8e8",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
        padding: 20,
        width,
        animation: "dropDown 0.18s ease",
      }}
    >
      <style>{`@keyframes dropDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }`}</style>
      {children}
    </div>
  );
};

export default TopDropdown;