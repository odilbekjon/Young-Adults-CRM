import { describe, expect, it } from "vitest";
import type { StaffUser, StaffUserForEdit } from "../../../../../app/api/usersApi/types";
import {
  EMPTY_FORM,
  buildCreatePayload,
  buildEditForm,
  buildUpdatePayload,
  pickPrimaryRolePermission,
  planRolePermissionChanges,
  resolveCreateBranchIds,
  validateStaffForm,
  type StaffForm,
} from "./staffForm";

const forEdit = (over: Partial<StaffUserForEdit> = {}): StaffUserForEdit => ({
  id: "u1",
  name: "Jasur Aliyev",
  email: "jasur@example.com",
  phone: "+998901234567",
  rolePermissionId: "rp-cashier",
  rolePermissionIds: ["rp-cashier"],
  jobTitle: "Kassa menejer",
  photo: null,
  gender: "MALE",
  birthdate: "1995-03-07T00:00:00.000Z",
  branchIds: ["b1", "b2"],
  ...over,
});

const listRow = (over: Partial<StaffUser> = {}): StaffUser => ({
  id: "u1",
  name: "Jasur Aliyev",
  email: "jasur@example.com",
  phone: "+998901234567",
  role: "ADMIN",
  rolePermission: { id: "rp-cashier", name: "Kassa Xodimi" },
  rolePermissions: [
    { id: "rp-cashier", name: "Kassa Xodimi" },
    { id: "rp-report", name: "Hisobot Ko'ruvchi" },
  ],
  jobTitle: "Kassa menejer",
  photo: null,
  status: "ACTIVE",
  createdAt: null,
  branches: [],
  ...over,
});

const form = (over: Partial<StaffForm> = {}): StaffForm => ({
  ...EMPTY_FORM,
  name: "Jasur Aliyev",
  phone: "901234567",
  rolePermissionIds: ["rp-cashier"],
  ...over,
});

describe("buildEditForm", () => {
  it("opens with everything the account already has", () => {
    const loaded = buildEditForm(forEdit(), listRow());

    expect(loaded).toEqual({
      name: "Jasur Aliyev",
      email: "jasur@example.com",
      phone: "901234567", // the +998 sits in the input's fixed prefix
      password: "",
      jobTitle: "Kassa menejer",
      role: "ADMIN",
      rolePermissionIds: ["rp-cashier", "rp-report"], // primary first, then the other position from the list
      branchIds: ["b1", "b2"],
      dateOfBirth: "1995-03-07",
      gender: "MALE",
      photo: null,
    });
  });

  it("never prefills a password", () => {
    expect(buildEditForm(forEdit(), listRow()).password).toBe("");
  });

  it("turns a birth-date datetime into the date picker's YYYY-MM-DD and tolerates none", () => {
    expect(buildEditForm(forEdit({ birthdate: "2001-12-31T19:00:00+05:00" })).dateOfBirth).toBe("2001-12-31");
    expect(buildEditForm(forEdit({ birthdate: null })).dateOfBirth).toBe("");
    expect(buildEditForm(forEdit({ birthdate: "n/a" })).dateOfBirth).toBe("");
  });

  it("maps the gender onto the radio values whatever its casing", () => {
    expect(buildEditForm(forEdit({ gender: "female" })).gender).toBe("FEMALE");
    expect(buildEditForm(forEdit({ gender: "Male" })).gender).toBe("MALE");
    expect(buildEditForm(forEdit({ gender: null })).gender).toBe("");
  });

  it("falls back to the list row for what for-edit leaves out", () => {
    const loaded = buildEditForm(
      forEdit({ email: null, phone: null, jobTitle: null, rolePermissionId: null, rolePermissionIds: [], branchIds: [] }),
      listRow({
        email: "row@example.com",
        phone: "998931112233",
        jobTitle: "Menejer",
        rolePermission: { id: "rp-x", name: "X" },
        rolePermissions: [{ id: "rp-x", name: "X" }],
        branches: [{ branchId: "b9", branch: { id: "b9", name: "Chilonzor" } }],
      })
    );

    expect(loaded.email).toBe("row@example.com");
    expect(loaded.phone).toBe("931112233");
    expect(loaded.jobTitle).toBe("Menejer");
    expect(loaded.rolePermissionIds).toEqual(["rp-x"]);
    expect(loaded.branchIds).toEqual(["b9"]);
  });

  it("works without a list row", () => {
    const loaded = buildEditForm(forEdit());
    expect(loaded.role).toBe("");
    expect(loaded.rolePermissionIds).toEqual(["rp-cashier"]);
  });
});

describe("resolveCreateBranchIds / buildCreatePayload", () => {
  it("attaches a new account only to the branch selected in the header", () => {
    expect(resolveCreateBranchIds([], "b7")).toEqual(["b7"]);
    expect(resolveCreateBranchIds(["b1", "b2"], "b7")).toEqual(["b7"]);
  });

  it("with All branches selected, only the branches the creator picked", () => {
    expect(resolveCreateBranchIds(["b1", "b2"], null)).toEqual(["b1", "b2"]);
    expect(resolveCreateBranchIds([], null)).toBeUndefined();
  });

  it("sends a CEO the same way as any other position: never expanded to every branch", () => {
    // The position is only an id here; nothing in the payload knows it is the CEO one.
    const payload = buildCreatePayload(form({ rolePermissionIds: ["rp-ceo"] }), "b7");
    expect(payload.rolePermissionId).toBe("rp-ceo");
    expect(payload.branchIds).toEqual(["b7"]);
    expect(buildCreatePayload(form({ rolePermissionIds: ["rp-ceo"], branchIds: ["b2"] }), null).branchIds).toEqual(["b2"]);
  });

  it("sends the first position as the primary one, the ADMIN role and a +998 phone", () => {
    const payload = buildCreatePayload(
      form({ name: " Jasur ", email: " ", jobTitle: " Menejer ", rolePermissionIds: ["rp-a", "rp-b"], gender: "FEMALE", dateOfBirth: "1990-01-02", password: "secret1" }),
      null
    );
    expect(payload).toMatchObject({
      name: "Jasur",
      rolePermissionId: "rp-a",
      role: "ADMIN",
      phone: "+998901234567",
      email: undefined,
      jobTitle: "Menejer",
      gender: "FEMALE",
      birthdate: "1990-01-02",
      password: "secret1",
    });
  });
});

describe("pickPrimaryRolePermission / planRolePermissionChanges", () => {
  it("keeps the account's primary position primary while it is still ticked", () => {
    expect(pickPrimaryRolePermission(["a", "b"], ["b", "a", "c"])).toEqual({ primary: "a", others: ["b", "c"] });
    expect(pickPrimaryRolePermission([], ["x", "y"])).toEqual({ primary: "x", others: ["y"] });
    expect(pickPrimaryRolePermission(["a"], ["b", "c"])).toEqual({ primary: "b", others: ["c"] });
  });

  it("changes nothing when the positions are left alone", () => {
    expect(planRolePermissionChanges(["a", "b"], ["a", "b"])).toEqual({ rolePermissionId: undefined, assign: [], remove: [] });
    // the same set ticked in another order is still nothing
    expect(planRolePermissionChanges(["a", "b"], ["b", "a"])).toEqual({ rolePermissionId: undefined, assign: [], remove: [] });
  });

  it("attaches only the newly ticked positions", () => {
    expect(planRolePermissionChanges(["a"], ["a", "c"])).toEqual({ rolePermissionId: undefined, assign: ["c"], remove: [] });
  });

  it("detaches the unticked ones, not just the primary", () => {
    expect(planRolePermissionChanges(["a", "b", "c"], ["a"])).toEqual({ rolePermissionId: undefined, assign: [], remove: ["b", "c"] });
  });

  it("swapping the primary sends it and re-attaches every other pick", () => {
    expect(planRolePermissionChanges(["a", "b"], ["c", "b"])).toEqual({ rolePermissionId: "c", assign: ["b"], remove: ["a"] });
  });

  it("an account whose positions were unknown gets all of them", () => {
    expect(planRolePermissionChanges([], ["a", "b"])).toEqual({ rolePermissionId: "a", assign: ["b"], remove: [] });
  });
});

describe("buildUpdatePayload", () => {
  const initial = buildEditForm(forEdit(), listRow());
  const noPositionChange = planRolePermissionChanges(initial.rolePermissionIds, initial.rolePermissionIds);

  it("sends nothing when nothing was touched", () => {
    expect(buildUpdatePayload({ ...initial }, initial, noPositionChange)).toEqual({});
  });

  it("sends only what changed, never the password or role when they were left alone", () => {
    const payload = buildUpdatePayload({ ...initial, jobTitle: "Bosh kassir", phone: "931112233" }, initial, noPositionChange);
    expect(payload).toEqual({ jobTitle: "Bosh kassir", phone: "+998931112233" });
    expect(payload).not.toHaveProperty("password");
    expect(payload).not.toHaveProperty("role");
  });

  it("sends a password only once one is typed", () => {
    expect(buildUpdatePayload({ ...initial, password: "" }, initial, noPositionChange)).not.toHaveProperty("password");
    expect(buildUpdatePayload({ ...initial, password: "newpass1" }, initial, noPositionChange).password).toBe("newpass1");
  });

  it("sends the whole branch list when it changed, and nothing when only its order did", () => {
    expect(buildUpdatePayload({ ...initial, branchIds: ["b2", "b1"] }, initial, noPositionChange)).toEqual({});
    expect(buildUpdatePayload({ ...initial, branchIds: ["b1", "b2", "b3"] }, initial, noPositionChange).branchIds).toEqual(["b1", "b2", "b3"]);
  });

  it("does not send a field that was emptied (the request can't clear it)", () => {
    expect(buildUpdatePayload({ ...initial, email: "", jobTitle: "  " }, initial, noPositionChange)).toEqual({});
  });

  it("carries the new primary position and a chosen photo", () => {
    const photo = new File(["x"], "me.png", { type: "image/png" });
    const plan = planRolePermissionChanges(initial.rolePermissionIds, ["rp-report"]); // the primary was unticked
    const payload = buildUpdatePayload({ ...initial, photo }, initial, plan);
    expect(payload.rolePermissionId).toBe("rp-report");
    expect(payload.photo).toBe(photo);
  });
});

describe("validateStaffForm", () => {
  it("accepts a complete new account", () => {
    expect(validateStaffForm(form(), null)).toEqual({});
  });

  it("requires a name, a position and a way to log in", () => {
    const errors = validateStaffForm(form({ name: " ", rolePermissionIds: [], phone: "", email: "" }), null);
    expect(errors).toEqual({
      name: "settings.ceo.staff.validation.nameRequired",
      rolePermissionId: "settings.ceo.staff.validation.rolePermissionIdRequired",
      phone: "settings.ceo.staff.validation.contactRequired",
    });
  });

  it("accepts an email alone and a phone alone", () => {
    expect(validateStaffForm(form({ phone: "", email: "a@b.uz" }), null)).toEqual({});
    expect(validateStaffForm(form({ phone: "901234567", email: "" }), null)).toEqual({});
  });

  it("checks the phone has its 9 digits and the email its shape", () => {
    expect(validateStaffForm(form({ phone: "90123" }), null).phone).toBe("settings.ceo.staff.validation.phoneInvalid");
    expect(validateStaffForm(form({ email: "nope" }), null).email).toBe("settings.ceo.staff.validation.emailInvalid");
    expect(validateStaffForm(form({ phone: "+998 90 123 45 67" }), null)).toEqual({});
  });

  it("requires 6 characters of password only when one is typed", () => {
    expect(validateStaffForm(form({ password: "" }), null)).toEqual({});
    expect(validateStaffForm(form({ password: "12345" }), null).password).toBe("settings.ceo.staff.validation.passwordTooShort");
  });

  it("on edit, leaves an unchanged phone/email alone even if it would not pass today", () => {
    const stored = buildEditForm(forEdit({ phone: "12345", email: "legacy" }));
    expect(validateStaffForm({ ...stored }, stored)).toEqual({});
    expect(validateStaffForm({ ...stored, phone: "1234" }, stored).phone).toBe("settings.ceo.staff.validation.phoneInvalid");
  });

  it("on edit, will not let every branch be unticked, since that could not be saved", () => {
    const stored = buildEditForm(forEdit());
    expect(validateStaffForm({ ...stored, branchIds: [] }, stored).branches).toBe("settings.ceo.staff.validation.branchesRequired");
    // a new account may have none
    expect(validateStaffForm(form({ branchIds: [] }), null).branches).toBeUndefined();
  });
});
