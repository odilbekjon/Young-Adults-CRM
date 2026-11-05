import { describe, expect, it } from "vitest";
import { API_BASE_URL } from "../baseApi";
import { teachersApi } from "./teachersApi";
import { createTestStore } from "../../../test/testStore";
import { jsonResponse, readFormData, stubFetch } from "../../../test/fetchStub";

const path = (url: string) => url.replace(API_BASE_URL, "");
const API_ORIGIN = new URL(API_BASE_URL).origin;

describe("teachersApi.teachersSelect", () => {
  const select = async (body: unknown, branchId = "all") => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse(body));
    const { data } = await store.dispatch(teachersApi.endpoints.teachersSelect.initiate({ branchId }));
    return { data, requests };
  };

  it("lists each teacher once, by id, keeping the first entry (branchId=all repeats people per branch)", async () => {
    const { data } = await select({
      data: [
        { id: "t1", name: "Aziz" },
        { id: "t2", name: "Bobur" },
        { id: "t1", name: "Aziz (second branch)" },
        { id: "t2", name: "Bobur (second branch)" },
        { id: "t3", name: "Dilnoza" },
      ],
    });

    expect(data).toEqual([
      { id: "t1", name: "Aziz" },
      { id: "t2", name: "Bobur" },
      { id: "t3", name: "Dilnoza" },
    ]);
  });

  it("drops entries without an id", async () => {
    const { data } = await select({ data: [{ id: "t1", name: "Aziz" }, { name: "No id" }, null, { id: "", name: "Empty id" }] });
    expect(data).toEqual([{ id: "t1", name: "Aziz" }]);
  });

  it("reads a {data, meta} envelope and an empty or odd body", async () => {
    expect((await select({ data: { data: [{ id: "t1", name: "Aziz" }] } })).data).toEqual([{ id: "t1", name: "Aziz" }]);
    expect((await select({})).data).toEqual([]);
    expect((await select({ data: null })).data).toEqual([]);
  });

  it("asks for the branch, URL-encoded", async () => {
    const { requests } = await select({ data: [] }, "all");
    expect(path(requests[0].url)).toBe("/teachers/select?branchId=all");

    const odd = await select({ data: [] }, "a b&c");
    expect(path(odd.requests[0].url)).toBe("/teachers/select?branchId=a%20b%26c");
  });
});

describe("teachersApi.allTeachers", () => {
  const load = async (body: unknown, args?: Parameters<typeof teachersApi.endpoints.allTeachers.initiate>[0]) => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse(body));
    const { data } = await store.dispatch(teachersApi.endpoints.allTeachers.initiate(args));
    return { data, requests };
  };

  it("sends page and limit, plus only the filters that are set", async () => {
    expect(path((await load({ data: [] })).requests[0].url)).toBe("/teachers?page=1&limit=10");
    expect(path((await load({ data: [] }, { page: 3, limit: 50, search: "az", status: "ACTIVE", branchId: "b1" })).requests[0].url)).toBe(
      "/teachers?page=3&limit=50&search=az&status=ACTIVE&branchId=b1",
    );
  });

  it("keeps the envelope and reads the photo from whichever field carries it", async () => {
    const { data } = await load({
      success: true,
      meta: { total: 4 },
      data: [
        { id: "t1", name: "A", photo: "uploads/a.jpg" },
        { id: "t2", name: "B", photoUrl: "https://cdn.example.com/b.jpg" },
        { id: "t3", name: "C", user: { photo: "/uploads/c.jpg" } },
        { id: "t4", name: "D" },
      ],
    });

    expect(data?.meta).toEqual({ total: 4 });
    expect(data?.data.map((t) => t.photo)).toEqual([
      `${API_ORIGIN}/uploads/a.jpg`, // a path relative to the API host is made absolute
      "https://cdn.example.com/b.jpg", // an absolute URL is left alone
      `${API_ORIGIN}/uploads/c.jpg`,
      null,
    ]);
  });

  it("accepts the list nested one level deeper", async () => {
    const { data } = await load({ data: { data: [{ id: "t1", name: "A" }] } });
    expect(data?.data).toHaveLength(1);
    expect(data?.data[0].id).toBe("t1");
  });
});

describe("teachersApi.teacherById", () => {
  it("normalizes the photo of the single teacher", async () => {
    const store = createTestStore();
    stubFetch(() => jsonResponse({ success: true, data: { id: "t1", name: "A", image: "media/t1.png" } }));

    const { data } = await store.dispatch(teachersApi.endpoints.teacherById.initiate("t1"));

    expect(data?.data.photo).toBe(`${API_ORIGIN}/media/t1.png`);
  });

  it("passes a body without data through untouched", async () => {
    const store = createTestStore();
    stubFetch(() => jsonResponse({ success: false }));

    const { data } = await store.dispatch(teachersApi.endpoints.teacherById.initiate("t1"));

    expect(data).toEqual({ success: false });
  });
});

describe("teachersApi.teacherHistory", () => {
  it("maps rows to type/title/actor/device and tolerates the wrapper keys", async () => {
    const store = createTestStore();
    stubFetch(() =>
      jsonResponse({
        data: {
          history: [
            {
              id: "h1",
              action: "Mevericks guruhiga biriktirildi",
              date: "2026-05-01T10:00:00Z",
              device: { deviceName: "Chrome on Windows" },
              user: { name: "Admin" },
            },
            { id: "h2", type: "created", createdAt: "2026-04-01", detail: "Profile created" },
          ],
        },
      }),
    );

    const { data } = await store.dispatch(teachersApi.endpoints.teacherHistory.initiate("t1"));

    expect(data).toEqual([
      {
        id: "h1",
        type: "",
        title: "Mevericks guruhiga biriktirildi",
        detail: "",
        createdAt: "2026-05-01T10:00:00Z",
        actor: "Admin",
        device: "Chrome on Windows",
      },
      { id: "h2", type: "CREATED", title: "", detail: "Profile created", createdAt: "2026-04-01", actor: null, device: null },
    ]);
  });

  it("returns an empty list when there is nothing to map", async () => {
    const store = createTestStore();
    stubFetch(() => jsonResponse({ data: null }));

    const { data } = await store.dispatch(teachersApi.endpoints.teacherHistory.initiate("t1"));

    expect(data).toEqual([]);
  });
});

describe("teachersApi - the login a teacher is created or edited with", () => {
  const send = async (call: "create" | "update", data: Record<string, unknown>) => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ success: true, data: { id: "t1" } }));
    if (call === "create") await store.dispatch(teachersApi.endpoints.createTeacher.initiate(data as never));
    else await store.dispatch(teachersApi.endpoints.updateTeacher.initiate({ id: "t1", ...data } as never));
    return { request: requests[0], fields: Object.fromEntries(await readFormData(requests[0])) };
  };

  it("sends the phone as given and the password exactly as typed - spaces and all", async () => {
    const created = await send("create", { name: "Aziz", phone: "+998901234567", password: " pass 123 ", branchIds: ["b1"] });
    expect(created.request.method).toBe("POST");
    expect(created.fields).toMatchObject({ phone: "+998901234567", password: " pass 123 ", branchIds: "b1" });

    const updated = await send("update", { phone: "+998901234567", password: "  x y z  " });
    expect(updated.request.method).toBe("PATCH");
    expect(updated.fields).toMatchObject({ phone: "+998901234567", password: "  x y z  " });
  });

  it("leaves the password out when none is set, so an edit keeps the current one", async () => {
    const created = await send("create", { name: "Aziz", phone: "+998901234567", password: undefined });
    expect(created.fields).not.toHaveProperty("password");

    const updated = await send("update", { name: "Aziz B", password: "" });
    expect(updated.fields).not.toHaveProperty("password");
  });
});
