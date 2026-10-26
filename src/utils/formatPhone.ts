// Uzbek mobile numbers shown as "(91) 517-97-74". Accepts "+998915179774",
// "998 91 517 97 74", "915179774" or an already formatted value; anything that
// doesn't reduce to 9 national digits is returned untouched.
export const formatPhone = (value?: string | null): string => {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  const national = digits.length === 12 && digits.startsWith("998") ? digits.slice(3) : digits;
  if (national.length !== 9) return value;
  return `(${national.slice(0, 2)}) ${national.slice(2, 5)}-${national.slice(5, 7)}-${national.slice(7)}`;
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
