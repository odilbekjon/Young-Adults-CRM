import { useLayoutEffect, useRef, type ChangeEvent, type ClipboardEvent, type InputHTMLAttributes } from "react";
import { MONEY_MAX_DIGITS, editMoney, formatMoney, moneyDigits, pasteMoney, type MoneyEdit } from "../../utils/moneyInput";

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onPaste" | "type" | "inputMode"> & {
  // The amount as bare digits ("300000", "" when empty) - never contains spaces, so
  // Number(value) and `!value` work exactly as they did with a type="number" field.
  value: string;
  onChange: (digits: string) => void;
  maxDigits?: number;
};

// Amount field for the payment modals. Shows the digits grouped by thousands with
// a space ("300 000", "1 250 000") while it is typed, deleted from or pasted into,
// and keeps the caret where the user is working instead of at the end. Only digits
// are accepted (letters, "-", "e", separators are ignored), a leading zero is
// dropped ("007" -> "7"), and the length is capped (MONEY_MAX_DIGITS).
export const MoneyInput = ({ value, onChange, maxDigits = MONEY_MAX_DIGITS, placeholder = "0", ...rest }: MoneyInputProps) => {
  const ref = useRef<HTMLInputElement>(null);
  const caretAfterRender = useRef<number | null>(null);

  // The grouped text is rewritten by the browser into the field, so React would
  // leave the caret at the end; put it back once the new value is committed.
  useLayoutEffect(() => {
    const input = ref.current;
    const caret = caretAfterRender.current;
    caretAfterRender.current = null;
    if (input && caret !== null && document.activeElement === input && input.selectionStart !== caret) {
      input.setSelectionRange(caret, caret);
    }
  });

  // Writes the edit into the field right away (value + caret, so a rejected key
  // press also leaves the caret in place) and reports the digits to the form.
  const commit = (input: HTMLInputElement, edit: MoneyEdit) => {
    if (input.value !== edit.text) input.value = edit.text;
    input.setSelectionRange(edit.caret, edit.caret);
    if (edit.digits !== moneyDigits(value)) caretAfterRender.current = edit.caret;
    onChange(edit.digits);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const inputType = (event.nativeEvent as InputEvent).inputType;
    commit(input, editMoney(input.value, input.selectionStart ?? input.value.length, {
      maxDigits,
      previousDigits: moneyDigits(value),
      deletion: inputType === "deleteContentBackward" ? "backward" : inputType === "deleteContentForward" ? "forward" : undefined,
    }));
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    // Pasted text is read here (not from the change it would cause) so "1 500,50"
    // can be told apart from a typed number - see moneyPasteDigits.
    event.preventDefault();
    const start = input.selectionStart ?? input.value.length;
    const edit = pasteMoney(input.value, start, input.selectionEnd ?? start, event.clipboardData.getData("text"), maxDigits);
    if (edit) commit(input, edit);
  };

  return (
    <input
      autoComplete="off"
      {...rest}
      ref={ref}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={formatMoney(value)}
      onChange={handleChange}
      onPaste={handlePaste}
    />
  );
};
