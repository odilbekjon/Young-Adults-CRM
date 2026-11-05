// Behaviour of a student row that opens a TeacherStudentHoverCard: the card opens
// on mouse hover (after a short delay, so a pointer that only passes over the row
// does not flash it, and with a grace period on leaving so the pointer can travel
// into the card), on keyboard focus and on a tap, and closes on blur, Escape or a
// press anywhere else.
//
//   const { open, triggerProps, cardProps, anchorRef } = useStudentCardTrigger<HTMLLIElement>();
//   <ListItem {...triggerProps}>…</ListItem>
//   <TeacherStudentHoverCard student={student} open={open} anchorRef={anchorRef} {...cardProps} />
import { useCallback, useEffect, useId, useRef, useState } from "react";

const OPEN_DELAY_MS = 150;
const CLOSE_DELAY_MS = 200;

export const useStudentCardTrigger = <T extends HTMLElement>() => {
  const cardId = useId();
  const anchorRef = useRef<T>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const show = useCallback(() => { clearTimer(); setOpen(true); }, [clearTimer]);
  const hide = useCallback(() => { clearTimer(); setOpen(false); }, [clearTimer]);
  const showSoon = useCallback(() => {
    clearTimer();
    timer.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
  }, [clearTimer]);
  const hideSoon = useCallback(() => {
    clearTimer();
    timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [clearTimer]);
  useEffect(() => clearTimer, [clearTimer]);

  // While the card is open, a press outside both the row and the card (a tap
  // elsewhere on a touch screen) or Escape closes it.
  useEffect(() => {
    if (!open) return;
    const onPress = (e: Event) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || cardRef.current?.contains(target)) return;
      hide();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") hide(); };
    document.addEventListener("pointerdown", onPress);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPress);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, hide]);

  return {
    open,
    anchorRef,
    // Spread onto the row element.
    triggerProps: {
      ref: anchorRef,
      tabIndex: 0,
      onMouseEnter: showSoon,
      onMouseLeave: hideSoon,
      onFocus: show,
      onBlur: hide,
      onClick: show,
      "aria-describedby": open ? cardId : undefined,
    },
    // Spread onto <TeacherStudentHoverCard>, next to `open` and `anchorRef`.
    cardProps: { id: cardId, cardRef, onMouseEnter: clearTimer, onMouseLeave: hideSoon },
  };
};
