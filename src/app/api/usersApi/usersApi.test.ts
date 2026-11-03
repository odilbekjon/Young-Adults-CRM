import { describe, expect, it } from "vitest";
import { API_BASE_URL } from "../baseApi";
import { usersApi } from "./usersApi";
import { createTestStore } from "../../../test/testStore";
import { jsonResponse, readFormData, stubFetch } from "../../../test/fetchStub";

const path = (url: string) => url.replace(API_BASE_URL, "");

describe("usersApi.staffUserForEdit", () => {
  const load = async (body: unknown) => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse(body));
    const { data } = await store.dispatch(usersApi.endpoints.staffUserForEdit.initiate("u1"));
    return { data, requests };
  };

  it("reads the documented flat shape", async () => {
    const { data, requests } = await load({
      success: true,
      data: {
        id: "u1",
        name: "Jasur",
        email: "j@example.com",
        phone: "+998901234567",
        rolePermissionId: "rp1",
        jobTitle: "Menejer",
        photo: "uploads/j.png",
        gender: "MALE",
        birthdate: "1995-03-07T00:00:00.000Z",
        branchIds: ["b1", "b2"],
      },
    });

    expect(path(requests[0].url)).toBe("/users/u1/for-edit");
    expect(data).toEqual({
      id: "u1",
      name: "Jasur",
      email: "j@example.com",
      phone: "+998901234567",
      rolePermissionId: "rp1",
      rolePermissionIds: ["rp1"],
      jobTitle: "Menejer",
      photo: "uploads/j.png",
      gender: "MALE",
      birthdate: "1995-03-07T00:00:00.000Z",
      branchIds: ["b1", "b2"],
    });
  });

  it("finds the positions and branches when they come nested, as GET /users sends them", async () => {
    const { data } = await load({
      data: {
        id: "u1",
        name: "Jasur",
        rolePermission: { id: "rp1", name: "Kassa" },
        rolePermissions: [{ rolePermission: { id: "rp2", name: "Hisobot" } }, { id: "rp1", name: "Kassa" }],
        branches: [{ branchId: "b1", branch: { id: "b1", name: "Chilonzor" } }, { branch: { id: "b2" } }],
        birthDate: "1990-01-02",
      },
    });

    expect(data?.rolePermissionId).toBe("rp1");
    expect(data?.rolePermissionIds).toEqual(["rp1", "rp2"]);
    expect(data?.branchIds).toEqual(["b1", "b2"]);
    expect(data?.birthdate).toBe("1990-01-02");
  });

  it("accepts position and branch ids given as plain lists or records", async () => {
    const { data } = await load({
      data: { id: "u1", name: "J", rolePermissionIds: ["rp1", { id: "rp2" }, "rp1"], branchIds: [{ id: "b1" }, "b2"] },
    });

    expect(data?.rolePermissionIds).toEqual(["rp1", "rp2"]);
    expect(data?.branchIds).toEqual(["b1", "b2"]);
  });

  it("gives empty values, not holes, for a bare record", async () => {
    const { data } = await load({ data: { id: "u1", name: "J" } });

    expect(data).toMatchObject({ rolePermissionId: null, rolePermissionIds: [], branchIds: [], email: null, phone: null, gender: null, birthdate: null });
  });
});

describe("usersApi.updateStaffUser", () => {
  it("PATCHes multipart with only the fields it is given, branches as branchIds[]", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ success: true }));

    await store.dispatch(usersApi.endpoints.updateStaffUser.initiate({ id: "u1", jobTitle: "Bosh kassir", branchIds: ["b1", "b2"], password: undefined, email: "" }));

    expect(requests[0].method).toBe("PATCH");
    expect(path(requests[0].url)).toBe("/users/u1");
    expect(await readFormData(requests[0])).toEqual([
      ["jobTitle", "Bosh kassir"],
      ["branchIds[]", "b1"],
      ["branchIds[]", "b2"],
    ]);
  });
});

describe("usersApi.createStaffUser", () => {
  it("POSTs the chosen branches and nothing the creator did not pick", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ success: true, data: { id: "new" } }));

    await store.dispatch(
      usersApi.endpoints.createStaffUser.initiate({ name: "CEO Person", rolePermissionId: "rp-ceo", role: "ADMIN", phone: "+998901234567", branchIds: ["b7"] })
    );

    expect(requests[0].method).toBe("POST");
    expect(path(requests[0].url)).toBe("/users");
    expect(await readFormData(requests[0])).toEqual([
      ["name", "CEO Person"],
      ["rolePermissionId", "rp-ceo"],
      ["role", "ADMIN"],
      ["phone", "+998901234567"],
      ["branchIds[]", "b7"],
    ]);
  });
});
