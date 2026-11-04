// Text handling for money fields typed by staff (the payment modals): the digits
// are shown grouped by thousands with a plain space ("300 000") while the value
// the form keeps - and sends to the API - stays the bare digit string ("300000").
//
// Whole sums only. Money in this app is UZS: every amount on screen is formatted
// without fractions (toLocaleString("ru-RU") / maximumFractionDigits 0, the All
// payments "Sum" filter is digits-only) and no amount input ever had a `step`,
// so a fraction was never a valid entry. "," and "." can also mean "thousands"
// or "decimal" depending on who typed them, so a typed separator is simply
// ignored instead of being guessed at.

// 12 digits = 999 999 999 999 sum: far beyond any real payment, and well inside
// what Number() keeps exact (15 digits) and what a decimal column takes.
export const MONEY_MAX_DIGITS = 12;

const GROUP_SEPARATOR = " ";

export interface MoneyEdit {
  // The canonical value: digits only, no leading zeros (except a lone "0"), "" when empty.
  digits: string;
  // What the field shows: `digits` grouped by thousands with a regular space.
  text: string;
  // Where the caret belongs in `text` after the edit.
  caret: number;
}

export interface MoneyEditOptions {
  maxDigits?: number;
  // The value (digits) before this edit - needed to recognise a Backspace/Delete that only ate a separator.
  previousDigits?: string;
  // `inputType` of the edit when it was a single-character delete.
  deletion?: "backward" | "forward";
}

// Every ASCII digit of `text`, nothing else: letters, "-", "e", "+", any kind of
// space (incl. U+00A0 / U+202F, which toLocaleString("ru-RU") produces) and
// "," / "." are all dropped.
export const moneyDigits = (text: string): string => text.replace(/\D/g, "");

const withoutLeadingZeros = (digits: string): string => digits.replace(/^0+(?=\d)/, "");

// "1250000" -> "1 250 000".
export const formatMoney = (value: string): string =>
  withoutLeadingZeros(moneyDigits(value)).replace(/\B(?=(\d{3})+$)/g, GROUP_SEPARATOR);

// A stored amount as the field's value: 1250000 -> "1250000". A fraction (the
// backend stores decimals) is rounded to a whole sum; a value that is not a
// positive, safe number gives "" (an empty field).
export const moneyToDigits = (amount: number | null | undefined): string => {
  if (amount == null || !Number.isFinite(amount)) return "";
  const whole = Math.round(amount);
  return whole > 0 && Number.isSafeInteger(whole) ? String(whole) : "";
};

// Index in `text` right after its n-th digit (0 when n <= 0, the end when n is
// past the last digit) - how a caret is carried across re-grouping: it always
// stays behind the same count of digits.
export const caretAfterDigits = (text: string, count: number): number => {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (/\d/.test(text[i]) && ++seen === count) return i + 1;
  }
  return text.length;
};

// The digits a pasted text stands for. "300 000", "300,000", "300.000" and
// "300000" (also with NBSP / narrow spaces, a currency word or a sign) are all
// 300000. A trailing "," / "." followed by one or two digits is a fraction
// ("1 500,50", "300.00"), which is dropped - reading it as thousands would turn
// 1 500,50 into 150 050.
export const moneyPasteDigits = (text: string): string =>
  moneyDigits(text.replace(/[^\d.,]/g, "").replace(/[.,]\d{1,2}$/, ""));

// An edit of the field. `raw` is the field's text right after the browser
// applied the key press (or any other change) and `caret` its caret position;
// the result is the value to keep, the text to show and where the caret goes,
// counted in digits left of the caret so that typing / deleting in the middle of
// "1 250 000" does not throw the caret to the end.
export const editMoney = (raw: string, caret: number, options: MoneyEditOptions = {}): MoneyEdit => {
  const { maxDigits = MONEY_MAX_DIGITS, previousDigits, deletion } = options;
  const at = Math.min(Math.max(caret, 0), raw.length);
  let digits = moneyDigits(raw);
  let left = moneyDigits(raw.slice(0, at)).length;

  // Backspace / Delete next to a group separator removed only the space, so the
  // number is unchanged and the key would look dead. It deletes the digit on
  // that side of the space instead.
  if (deletion && previousDigits !== undefined && digits === previousDigits) {
    const index = deletion === "backward" ? left - 1 : left;
    if (index >= 0 && index < digits.length) {
      digits = digits.slice(0, index) + digits.slice(index + 1);
      left = index;
    }
  }

  // "007" -> "7", "000" -> "0".
  const trimmed = withoutLeadingZeros(digits);
  left = Math.max(0, left - (digits.length - trimmed.length));
  digits = trimmed;

  // Over the limit: what was just inserted (it sits left of the caret) is the part
  // that does not fit, like a native maxlength; anything still over is cut off the end.
  if (digits.length > maxDigits) {
    const cut = Math.min(digits.length - maxDigits, left);
    digits = digits.slice(0, left - cut) + digits.slice(left);
    left -= cut;
    digits = digits.slice(0, maxDigits);
  }

  const text = formatMoney(digits);
  return { digits, text, caret: caretAfterDigits(text, Math.min(left, digits.length)) };
};

// Pasting `pasted` over the selection [start, end) of the field's current text.
// null when the pasted text holds no digits (nothing to insert).
export const pasteMoney = (
  currentText: string, start: number, end: number, pasted: string, maxDigits = MONEY_MAX_DIGITS,
): MoneyEdit | null => {
  const insert = moneyPasteDigits(pasted);
  if (!insert) return null;
  const from = Math.min(Math.max(start, 0), currentText.length);
  const to = Math.min(Math.max(end, from), currentText.length);
  return editMoney(currentText.slice(0, from) + insert + currentText.slice(to), from + insert.length, { maxDigits });
};
