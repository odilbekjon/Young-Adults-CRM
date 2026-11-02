import { describe, expect, it } from "vitest";
import type { MeUser, Permission, PermissionAction, PermissionLabel, RolePermissionDetail } from "../../app/api/authApi/types";
import {
  collectUserLabels,
  hasCeoPosition,
  hasLabelAccess,
  hasPermission,
  isAdminRole,
  isCeoPositionName,
  isStudentRole,
  isSuperAdminRole,
  isTeacherRole,
  normalizeRole,
} from "../permissions";

type TestUser = Pick<MeUser, "role" | "rolePermissions"> & Partial<Pick<MeUser, "roles">>;

const position = (name: string, permissions: Permission[], labels?: PermissionLabel[]): RolePermissionDetail => ({
  id: name,
  name,
  description: null,
  labels: labels ?? [...new Set(permissions.map((p) => p.label))],
  permissions,
});

const userWith = (role: string, ...rolePermissions: RolePermissionDetail[]): TestUser => ({ role, rolePermissions });

const ACTIONS: PermissionAction[] = ["CREATE", "READ", "UPDATE", "DELETE", "GET_ARCHIVE", "MANAGE"];
const LABELS: PermissionLabel[] = [
  "STUDENTS", "TEACHERS", "USERS", "GROUPS", "COURSES", "ROOMS", "BRANCHES", "SETTINGS", "FINANCE", "PAYMENTS", "EXPENSES", "SALARIES", "LEADS",
];

describe("role helpers", () => {
  it("normalizes case, whitespace and a Spring-style ROLE_ prefix", () => {
    expect(normalizeRole("admin")).toBe("ADMIN");
    expect(normalizeRole("  Teacher ")).toBe("TEACHER");
    expect(normalizeRole("ROLE_SUPERADMIN")).toBe("SUPERADMIN");
    expect(normalizeRole(null)).toBe("");
    expect(normalizeRole(undefined)).toBe("");
  });

  it("treats CEO as an alias of SUPERADMIN", () => {
    expect(isSuperAdminRole("SUPERADMIN")).toBe(true);
    expect(isSuperAdminRole("ceo")).toBe(true);
    expect(isSuperAdminRole("ROLE_CEO")).toBe(true);
    expect(isSuperAdminRole("ADMIN")).toBe(false);
    expect(isSuperAdminRole(null)).toBe(false);
  });

  it("recognizes the other system roles regardless of spelling", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("TEACHER")).toBe(false);
    expect(isTeacherRole("ROLE_TEACHER")).toBe(true);
    expect(isStudentRole("Student")).toBe(true);
    expect(isStudentRole("")).toBe(false);
  });
});

describe("CEO position", () => {
  it("matches the position name case-insensitively", () => {
    expect(isCeoPositionName("CEO")).toBe(true);
    expect(isCeoPositionName(" ceo ")).toBe(true);
    expect(isCeoPositionName("CEO assistant")).toBe(false);
    expect(isCeoPositionName(null)).toBe(false);
  });

  it("is found in the flattened roles list", () => {
    expect(hasCeoPosition({ roles: ["ADMIN", "CEO"] })).toBe(true);
  });

  it("is found in an assigned RolePermission name", () => {
    expect(hasCeoPosition({ roles: ["ADMIN"], rolePermissions: [position("CEO", [])] })).toBe(true);
  });

  it("is absent for ordinary positions and for missing users", () => {
    expect(hasCeoPosition({ roles: ["ADMIN", "Manager"], rolePermissions: [position("Manager", [])] })).toBe(false);
    expect(hasCeoPosition(null)).toBe(false);
    expect(hasCeoPosition(undefined)).toBe(false);
    expect(hasCeoPosition({})).toBe(false);
  });
});

describe("hasPermission", () => {
  it("denies a missing user", () => {
    expect(hasPermission(null, "STUDENTS", "READ")).toBe(false);
    expect(hasPermission(undefined, "STUDENTS", "READ")).toBe(false);
  });

  it("lets SUPERADMIN (and its CEO alias) do everything without any assigned permission", () => {
    for (const role of ["SUPERADMIN", "CEO", "ROLE_SUPERADMIN"]) {
      for (const label of LABELS) {
        for (const action of ACTIONS) {
          expect(hasPermission(userWith(role), label, action)).toBe(true);
        }
      }
    }
  });

  it("lets an ADMIN holding the CEO position do everything", () => {
    const ceo = { role: "ADMIN", roles: ["ADMIN", "CEO"], rolePermissions: [] } as TestUser;
    expect(hasPermission(ceo, "FINANCE", "DELETE")).toBe(true);
    const viaPermission = userWith("ADMIN", position("CEO", []));
    expect(hasPermission(viaPermission, "SALARIES", "MANAGE")).toBe(true);
  });

  it("grants exactly the label and action that are assigned", () => {
    const user = userWith("ADMIN", position("Reception", [{ label: "STUDENTS", action: "READ" }]));
    expect(hasPermission(user, "STUDENTS", "READ")).toBe(true);
    expect(hasPermission(user, "STUDENTS", "UPDATE")).toBe(false);
    expect(hasPermission(user, "GROUPS", "READ")).toBe(false);
  });

  it("lets MANAGE cover every action of its own label only", () => {
    const user = userWith("ADMIN", position("Groups lead", [{ label: "GROUPS", action: "MANAGE" }]));
    for (const action of ACTIONS) {
      expect(hasPermission(user, "GROUPS", action)).toBe(true);
    }
    expect(hasPermission(user, "STUDENTS", "READ")).toBe(false);
  });

  it("combines permissions from several assigned positions", () => {
    const user = userWith(
      "ADMIN",
      position("A", [{ label: "STUDENTS", action: "READ" }]),
      position("B", [{ label: "PAYMENTS", action: "CREATE" }]),
    );
    expect(hasPermission(user, "STUDENTS", "READ")).toBe(true);
    expect(hasPermission(user, "PAYMENTS", "CREATE")).toBe(true);
    expect(hasPermission(user, "PAYMENTS", "DELETE")).toBe(false);
  });

  it("gives teachers and students nothing implicitly", () => {
    expect(hasPermission(userWith("TEACHER"), "GROUPS", "READ")).toBe(false);
    expect(hasPermission(userWith("STUDENT"), "PAYMENTS", "READ")).toBe(false);
    // an unknown staff role is label-driven too
    expect(hasPermission(userWith("MANAGER"), "STUDENTS", "READ")).toBe(false);
  });

  it("survives positions without a permissions list", () => {
    const broken = { role: "ADMIN", rolePermissions: [{ id: "x", name: "x", description: null, labels: [] }] } as unknown as TestUser;
    expect(hasPermission(broken, "STUDENTS", "READ")).toBe(false);
  });
});

describe("hasLabelAccess", () => {
  it("denies a missing user and a user without permissions", () => {
    expect(hasLabelAccess(null, "STUDENTS")).toBe(false);
    expect(hasLabelAccess(userWith("ADMIN"), "STUDENTS")).toBe(false);
  });

  it("allows SUPERADMIN and the CEO position every label", () => {
    for (const label of LABELS) {
      expect(hasLabelAccess(userWith("SUPERADMIN"), label)).toBe(true);
      expect(hasLabelAccess(userWith("ADMIN", position("CEO", [])), label)).toBe(true);
    }
  });

  it("allows a label when any action on it is assigned", () => {
    const user = userWith("ADMIN", position("Archive viewer", [{ label: "TEACHERS", action: "GET_ARCHIVE" }]));
    expect(hasLabelAccess(user, "TEACHERS")).toBe(true);
    expect(hasLabelAccess(user, "STUDENTS")).toBe(false);
  });
});

describe("collectUserLabels", () => {
  it("returns every distinct label from labels and permissions, uppercased", () => {
    const user = {
      rolePermissions: [
        position("A", [{ label: "STUDENTS", action: "READ" }], ["STUDENTS"]),
        position("B", [{ label: "STUDENTS", action: "UPDATE" }, { label: "GROUPS", action: "READ" }], ["groups" as PermissionLabel, "FINANCE"]),
      ],
    };
    expect(collectUserLabels(user).sort()).toEqual(["FINANCE", "GROUPS", "STUDENTS"]);
  });

  it("returns an empty list for no user or no positions", () => {
    expect(collectUserLabels(null)).toEqual([]);
    expect(collectUserLabels(undefined)).toEqual([]);
    expect(collectUserLabels({ rolePermissions: [] })).toEqual([]);
  });
});
