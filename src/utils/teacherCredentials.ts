import { fromPhoneInput, toPhoneInput } from "./formatPhone";

// The rules for the login a teacher is handed (phone + password), shared by the
// two forms that set it: the Teachers page drawer and the teacher profile's edit
// drawer. A teacher logs in with the phone and password stored here, so both must
// be saved exactly as the login will later send them.

// POST /auth/login requires at least 6 characters (AUTH_ROLE_DOCS.md section 1),
// so a shorter password could never be used to log in.
export const MIN_PASSWORD_LENGTH = 6;

export type TeacherPhoneError = "phoneRequired" | "phoneInvalid";
export type TeacherPasswordError = "passwordTooShort";

// `input` is the text after the fixed "+998" box. A full number is 9 digits;
// `savedPhone` (when editing) lets a number saved in an odd shape stay as it is
// for as long as it isn't touched.
export const validateTeacherPhone = (input: string, savedPhone?: string | null): TeacherPhoneError | null => {
  const digits = toPhoneInput(input);
  if (!digits) return "phoneRequired";
  if (digits.length === 9) return null;
  if (savedPhone && digits === toPhoneInput(savedPhone)) return null;
  return "phoneInvalid";
};

// The phone as it must be sent: "+998" and 9 digits - the same shape staff,
// students and leads are saved in and the login normalizes to. A number that is
// not 9 digits (only possible for an untouched odd saved one) is not re-sent.
export const teacherPhoneForRequest = (input: string): string | undefined =>
  toPhoneInput(input).length === 9 ? fromPhoneInput(input) : undefined;

// An empty password means "leave it alone / none yet" and is fine; one that is
// typed is never altered (no trim) and must be long enough to log in with.
export const validateTeacherPassword = (password: string): TeacherPasswordError | null =>
  password !== "" && password.length < MIN_PASSWORD_LENGTH ? "passwordTooShort" : null;
