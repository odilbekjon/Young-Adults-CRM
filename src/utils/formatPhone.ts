// The 9 national digits of an Uzbek mobile number — "+998915179774",
// "998 91 517 97 74", "915179774" or an already formatted value all give
// "915179774" — or null when the value doesn't reduce to that.
const nationalDigits = (value: string): string | null => {
  const digits = value.replace(/\D/g, "");
  const national = digits.length === 12 && digits.startsWith("998") ? digits.slice(3) : digits;
  return national.length === 9 ? national : null;
};

// Uzbek mobile numbers shown as "(91) 517-97-74"; anything that doesn't reduce
// to 9 national digits is returned untouched.
export const formatPhone = (value?: string | null): string => {
  if (!value) return "";
  const national = nationalDigits(value);
  if (!national) return value;
  return `(${national.slice(0, 2)}) ${national.slice(2, 5)}-${national.slice(5, 7)}-${national.slice(7)}`;
};

// The same number as plain spaced digits, "91 517 97 74": no +998, no brackets.
export const formatPhoneSpaced = (value?: string | null): string => {
  if (!value) return "";
  const national = nationalDigits(value);
  if (!national) return value;
  return `${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5, 7)} ${national.slice(7)}`;
};

// Edit forms show the number after a fixed "+998" box: "+998950640912" ->
// "950640912" for the input, and back to "+998950640912" for the request
// (empty input -> empty string).
export const toPhoneInput = (value?: string | null): string => {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length > 9 && digits.startsWith("998") ? digits.slice(3) : digits;
};
export const fromPhoneInput = (input: string): string => {
  const digits = input.replace(/\D/g, "");
  return digits ? `+998${digits.length > 9 && digits.startsWith("998") ? digits.slice(3) : digits}` : "";
};

// Characters that ride along with a pasted login without being visible:
// zero-width spaces/joiners, direction marks (messengers add them) and the BOM.
const INVISIBLE_CHARS = /[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g;

// What the "email or phone" login field holds, minus surrounding blanks (the
// no-break space included) and invisible characters. The password never goes
// through this - it is sent exactly as typed.
export const cleanIdentifier = (raw: string): string => raw.replace(INVISIBLE_CHARS, "").trim();

// The identifier spellings to try, in order, for one thing the user typed. The
// backend takes "+998901234567", "901234567" or an email (AUTH_ROLE_DOCS.md
// section 1) but only an exact spelling is known to match what an account stored,
// so a phone number is sent the way the forms store it (+998 and 9 digits, see
// fromPhoneInput) first, then as the bare 9 digits, then - for numbers saved
// before the forms normalized them, e.g. "90 123 45 67" - as it was typed.
// An email is tried as typed, then lower-cased (phone keyboards capitalize the
// first letter). Anything else is passed on untouched for the backend to judge.
export const loginIdentifierCandidates = (raw: string): string[] => {
  const cleaned = cleanIdentifier(raw);
  if (!cleaned) return [];
  if (cleaned.includes("@")) {
    const lower = cleaned.toLowerCase();
    return lower === cleaned ? [cleaned] : [cleaned, lower];
  }
  const national = nationalDigits(cleaned);
  if (!national) return [cleaned];
  return [...new Set([`+998${national}`, national, cleaned])];
};
