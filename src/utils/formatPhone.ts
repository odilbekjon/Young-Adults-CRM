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
