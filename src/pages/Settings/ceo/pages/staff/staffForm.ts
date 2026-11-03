// src/pages/Settings/ceo/pages/staff/staffForm.ts
// The Staff drawer's form state and the pure rules around it: how a loaded
// account becomes form values, what the form must satisfy, and which request
// it turns into (kept apart from staff.tsx so they can be tested).
import type { CreateUserRequest, StaffUser, StaffUserForEdit, UpdateUserRequest } from "../../../../../app/api/usersApi/types";
import { fromPhoneInput, toPhoneInput } from "../../../../../utils/formatPhone";
import { parseTrainingDate } from "../../../../../utils/formatTrainingDate";

// POST /users' `role` (SUPERADMIN/ADMIN) is a legacy field, optional per
// Swagger (unlike `rolePermissionId`, which is required and is what actually
// "belgilaydi" — determines — the account's position and permissions). A
// dedicated "System role" picker duplicated what Position already controls,
// so this form no longer surfaces one — every staff account created here is
// sent as ADMIN, the tier this endpoint documents itself as being for
// ("Faqat SUPERADMIN va ADMIN foydalana oladi"); an existing account's role
// is never sent back when editing.
export const DEFAULT_STAFF_ROLE = "ADMIN";

export interface StaffForm {
  name: string;
  email: string;
  // The digits after the fixed "+998" box (see toPhoneInput/fromPhoneInput).
  phone: string;
  password: string;
  jobTitle: string;
  // Informational on edit (the account's current system role); the system
  // role of a new account is always DEFAULT_STAFF_ROLE.
  role: string;
  // A user can hold more than one lavozim (AUTH_ROLE_DOCS.md's
  // UserRolePermission is many-to-many) — POST/PATCH /users itself only
  // accepts a single primary `rolePermissionId`, so any additional selected
  // ids here are attached afterwards via assign-user (see planRolePermissionChanges).
  rolePermissionIds: string[];
  branchIds: string[];
  // YYYY-MM-DD, or "".
  dateOfBirth: string;
  // "MALE" | "FEMALE", or "".
  gender: string;
  photo: File | null;
}

export const EMPTY_FORM: StaffForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  jobTitle: "",
  role: DEFAULT_STAFF_ROLE,
  rolePermissionIds: [],
  branchIds: [],
  dateOfBirth: "",
  gender: "",
  photo: null,
};

const unique = (ids: Array<string | null | undefined>): string[] => [...new Set(ids.filter((id): id is string => Boolean(id)))];

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));

// "2000-01-31T00:00:00.000Z" -> "2000-01-31" (the date picker's format), "" if it isn't a date.
const toDateOnly = (value?: string | null): string => {
  const parsed = parseTrainingDate(value);
  if (!parsed) return "";
  return `${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`;
};

// The radio group only knows "MALE" / "FEMALE"; the backend's casing isn't guaranteed.
const toGender = (value?: string | null): string => {
  const v = (value ?? "").trim().toUpperCase();
  if (v === "MALE" || v === "M") return "MALE";
  if (v === "FEMALE" || v === "F") return "FEMALE";
  return "";
};

// Everything the drawer opens with when editing an account. GET
// /users/{id}/for-edit is the main source (it alone carries gender, birth date
// and branchIds); the row from the already loaded list fills whatever it
// leaves out — notably the member's other positions, which for-edit may only
// name one of. The password is never prefilled.
export const buildEditForm = (forEdit: StaffUserForEdit, row?: StaffUser | null): StaffForm => ({
  name: forEdit.name || row?.name || "",
  email: forEdit.email ?? row?.email ?? "",
  phone: toPhoneInput(forEdit.phone ?? row?.phone),
  password: "",
  jobTitle: forEdit.jobTitle ?? row?.jobTitle ?? "",
  role: row?.role ?? "",
  // Primary first: it is the one POST/PATCH /users takes as rolePermissionId.
  rolePermissionIds: unique([
    forEdit.rolePermissionId,
    ...forEdit.rolePermissionIds,
    row?.rolePermission?.id,
    ...(row?.rolePermissions ?? []).map((rp) => rp.id),
  ]),
  branchIds: forEdit.branchIds.length ? forEdit.branchIds : unique((row?.branches ?? []).map((b) => b.branchId)),
  dateOfBirth: toDateOnly(forEdit.birthdate),
  gender: toGender(forEdit.gender),
  photo: null,
});

export type StaffFormField = "name" | "rolePermissionId" | "phone" | "email" | "password" | "branches";

// Field -> i18n key of what is wrong with it; empty when the form can be sent.
// On edit only the fields the user changed are checked for format, so an
// account whose stored phone/email doesn't match today's rules can still be
// saved after editing something else.
export const validateStaffForm = (form: StaffForm, initial: StaffForm | null): Partial<Record<StaffFormField, string>> => {
  const errors: Partial<Record<StaffFormField, string>> = {};
  const key = (name: string) => `settings.ceo.staff.validation.${name}`;
  const email = form.email.trim();
  const phoneDigits = toPhoneInput(form.phone);

  if (!form.name.trim()) errors.name = key("nameRequired");
  if (form.rolePermissionIds.length === 0) errors.rolePermissionId = key("rolePermissionIdRequired");
  // The account logs in with its email or phone, so one of them must stay.
  if (!email && !phoneDigits) errors.phone = key("contactRequired");
  else if (phoneDigits && phoneDigits.length !== 9 && (!initial || phoneDigits !== toPhoneInput(initial.phone))) {
    errors.phone = key("phoneInvalid");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (!initial || email !== initial.email.trim())) {
    errors.email = key("emailInvalid");
  }
  // Same minimum as login (AUTH_ROLE_DOCS.md §1) — this is the same
  // password field a created account will log in with.
  if (form.password && form.password.length < 6) errors.password = key("passwordTooShort");
  // The API can only add branches or swap them: an empty list isn't sent, so
  // clearing every branch would silently change nothing.
  if (initial && initial.branchIds.length > 0 && form.branchIds.length === 0) errors.branches = key("branchesRequired");
  return errors;
};

// A new account goes to the branch selected in the header (the branch picker is
// hidden then); with "All branches" the picker decides. This holds for every
// position alike — a CEO is not linked to extra branches on its own.
export const resolveCreateBranchIds = (pickedBranchIds: string[], selectedBranchId: string | null): string[] | undefined =>
  selectedBranchId ? [selectedBranchId] : pickedBranchIds.length ? pickedBranchIds : undefined;

// The positions to send for a form: `primary` is the one POST/PATCH /users takes
// as rolePermissionId, `others` get attached through assign-user. On edit the
// account's current primary stays primary for as long as it is still selected,
// so re-ticking boxes in a different order changes nothing.
export const pickPrimaryRolePermission = (original: string[], selected: string[]) => {
  const primary = original[0] && selected.includes(original[0]) ? original[0] : selected[0];
  return { primary, others: selected.filter((id) => id !== primary) };
};

export interface RolePermissionPlan {
  // Set only when the primary position changed (it is then part of the PATCH).
  rolePermissionId?: string;
  // Positions to attach with POST /role-permissions/{id}/assign-user/{userId}.
  assign: string[];
  // Positions the member held that are now unticked: DELETE .../remove-user/{userId}.
  remove: string[];
}

export const planRolePermissionChanges = (original: string[], selected: string[]): RolePermissionPlan => {
  const { primary, others } = pickPrimaryRolePermission(original, selected);
  const primaryChanged = primary !== undefined && primary !== original[0];
  return {
    rolePermissionId: primaryChanged ? primary : undefined,
    // Swapping the primary may reset the account's other positions on the
    // server, so then every other pick is attached again (assign-user is
    // idempotent); otherwise only the newly ticked ones need attaching.
    assign: primaryChanged ? others : others.filter((id) => !original.includes(id)),
    remove: original.filter((id) => !selected.includes(id)),
  };
};

export const buildCreatePayload = (form: StaffForm, selectedBranchId: string | null): CreateUserRequest => ({
  name: form.name.trim(),
  rolePermissionId: pickPrimaryRolePermission([], form.rolePermissionIds).primary,
  email: form.email.trim() || undefined,
  phone: fromPhoneInput(form.phone) || undefined,
  password: form.password || undefined,
  jobTitle: form.jobTitle.trim() || undefined,
  role: form.role.trim() || DEFAULT_STAFF_ROLE,
  branchIds: resolveCreateBranchIds(form.branchIds, selectedBranchId),
  birthdate: form.dateOfBirth || undefined,
  gender: form.gender || undefined,
  photo: form.photo ?? undefined,
});

// PATCH /users/{id} carries only what the user actually changed: a field left
// alone is never re-sent (so an unchanged email/phone can't trip the
// duplicate check, nothing is overwritten with a stale copy, and an empty
// password never replaces the real one). The account's role is never sent.
// A field emptied in the form isn't sent either — the multipart body skips
// empty values, so it keeps its stored value.
export const buildUpdatePayload = (form: StaffForm, initial: StaffForm, plan: RolePermissionPlan): Omit<UpdateUserRequest, "id"> => {
  const payload: Omit<UpdateUserRequest, "id"> = {};
  const name = form.name.trim();
  if (name && name !== initial.name.trim()) payload.name = name;
  const email = form.email.trim();
  if (email && email !== initial.email.trim()) payload.email = email;
  if (toPhoneInput(form.phone) && toPhoneInput(form.phone) !== toPhoneInput(initial.phone)) payload.phone = fromPhoneInput(form.phone);
  const jobTitle = form.jobTitle.trim();
  if (jobTitle && jobTitle !== initial.jobTitle.trim()) payload.jobTitle = jobTitle;
  if (form.password) payload.password = form.password;
  if (form.dateOfBirth && form.dateOfBirth !== initial.dateOfBirth) payload.birthdate = form.dateOfBirth;
  if (form.gender && form.gender !== initial.gender) payload.gender = form.gender;
  if (form.branchIds.length > 0 && !sameSet(form.branchIds, initial.branchIds)) payload.branchIds = form.branchIds;
  if (form.photo) payload.photo = form.photo;
  if (plan.rolePermissionId) payload.rolePermissionId = plan.rolePermissionId;
  return payload;
};
