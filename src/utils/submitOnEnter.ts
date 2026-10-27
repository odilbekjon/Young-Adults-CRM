import type { KeyboardEvent } from "react";

// Targets where Enter already means something else: it activates a button or
// link, adds a line in a textarea, opens/picks from a dropdown (MUI Select,
// the date/time pickers' role="button" triggers) or confirms an option in an
// open popup. A search box can opt out with `data-no-enter-submit`.
const OWN_ENTER_TARGET = [
  "textarea", "select", "button", "a[href]", "summary",
  "input[type='button']", "input[type='submit']", "input[type='reset']", "input[type='file']", "input[type='image']",
  "[contenteditable]:not([contenteditable='false'])",
  "[role='button']", "[role='link']", "[role='tab']", "[role='menuitem']", "[role='option']",
  "[role='combobox']:not(input)", "[aria-expanded='true']",
  "[data-no-enter-submit]",
].join(",");

// onKeyDown handler for the root of a modal / drawer that lets Enter press its
// primary action. Pass the same handler the action button calls, and its
// disabled state so Enter can never submit what the button would refuse (empty
// form, request already in flight). Not for confirm/delete dialogs, where an
// accidental Enter must not be enough, or for modals whose only field is a
// textarea.
export const submitOnEnter = (onSubmit: () => void, disabled = false) => (event: KeyboardEvent<HTMLElement>) => {
  if (event.key !== "Enter" || event.defaultPrevented || event.repeat) return;
  if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
  // keyCode 229 is how Safari reports the Enter that ends an IME composition.
  if (event.nativeEvent.isComposing || event.keyCode === 229) return;
  const target = event.target;
  // React events bubble through portals too (date-picker popups, menus, a
  // dialog opened from inside this one): only keys pressed in this surface count.
  if (!(target instanceof Element) || !event.currentTarget.contains(target)) return;
  if (target.closest(OWN_ENTER_TARGET)) return;
  event.preventDefault();
  // Consumed even while disabled, so it never falls through to an outer
  // surface (a modal opened inside a drawer) or to the page behind.
  event.stopPropagation();
  if (!disabled) onSubmit();
};
