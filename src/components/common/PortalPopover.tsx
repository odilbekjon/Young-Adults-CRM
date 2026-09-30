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

/** Gap between the anchor and the popup, and minimum distance kept from the viewport edges. */
const GAP = 6;
const VIEWPORT_MARGIN = 8;

interface Pos { top: number; left: number; width?: number }

export const PortalPopover = ({
  open, onClose, anchorRef, children, matchAnchorWidth, zIndex = 1500,
}: PortalPopoverProps) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos | null>(null);

  // Measures the anchor and the (already mounted) popup, then places the
  // popup below the anchor — flipping above it when it does not fit below,
  // and shifting it left when it would overflow the right viewport edge.
  const updatePosition = () => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const popup = popupRef.current;
    const ph = popup?.offsetHeight ?? 0;
    const pw = popup?.offsetWidth ?? 0;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceBelow = vh - rect.bottom - GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - GAP - VIEWPORT_MARGIN;
    const placeAbove = ph > spaceBelow && spaceAbove > spaceBelow;

    let top = placeAbove ? rect.top - GAP - ph : rect.bottom + GAP;
    top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - ph - VIEWPORT_MARGIN));

    const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.left, vw - pw - VIEWPORT_MARGIN));
    const width = matchAnchorWidth ? rect.width : undefined;

    setPos((prev) =>
      prev && prev.top === top && prev.left === left && prev.width === width ? prev : { top, left, width }
    );
  };

  useLayoutEffect(() => {
    if (open) updatePosition();
    else setPos(null);
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
    // Esc closes only the popup, not the Dialog/Drawer it is opened inside
    // (capture + stopPropagation runs before MUI's own keydown handling).
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    const handleReposition = () => updatePosition();
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey, true);
    // capture:true so this also catches scrolling inside a Dialog's own
    // scrollable content, not just the window.
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    // The popup's own size can change while open (e.g. Calendar switching
    // between day / month / year views), which may require flipping again.
    const ro = typeof ResizeObserver !== "undefined" && popupRef.current
      ? new ResizeObserver(handleReposition)
      : null;
    if (ro && popupRef.current) ro.observe(popupRef.current);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey, true);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  // Rendered hidden on the first pass so it can be measured before it is
  // shown at its final position (avoids a visible jump).
  return createPortal(
    <div
      ref={popupRef}
      style={{
        position: "fixed",
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        width: pos?.width,
        maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
        zIndex,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export default PortalPopover;
