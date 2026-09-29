// Shared floating-panel primitive for small inline pickers (date/time
// pickers, filter popovers) that render a popup anchored to a trigger
// element. Fixes the bug class where DatePickerField/TimeSelectField/
// Groups.tsx's DateFilter each rendered their popup as a plain
// `position: absolute` child at the call site — invisible or clipped the
// moment that call site sat inside a MUI Dialog/Drawer, since both
// `.MuiDialog-paper` and `.MuiDialogContent-root` default to
// `overflow-y: auto` with a height cap. Rendering through a portal to
// document.body with `position: fixed` computed from the trigger's own
// getBoundingClientRect() escapes any ancestor's overflow/clipping and
// keeps working regardless of which dialog/drawer it's opened inside.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface PortalPopoverProps {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  /** Match the popup's width to the anchor's width (e.g. a dropdown list) instead of the popup's own natural width. */
  matchAnchorWidth?: boolean;
  /** Above MUI's theme.zIndex.modal (1300) so it always renders over any Dialog/Drawer it's opened inside. */
  zIndex?: number;
}

export const PortalPopover = ({
  open, onClose, anchorRef, children, matchAnchorWidth, zIndex = 1500,
}: PortalPopoverProps) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width?: number } | null>(null);

  const updatePosition = () => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      left: rect.left,
      width: matchAnchorWidth ? rect.width : undefined,
    });
  };

  useLayoutEffect(() => {
    if (open) updatePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      onClose();
    };
    const handleReposition = () => updatePosition();
    document.addEventListener("mousedown", handleOutside);
    // capture:true so this also catches scrolling inside a Dialog's own
    // scrollable content, not just the window.
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !pos) return null;

  return createPortal(
    <div
      ref={popupRef}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex,
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export default PortalPopover;
