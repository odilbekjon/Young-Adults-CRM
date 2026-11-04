import { describe, expect, it } from "vitest";
import { API_BASE_URL } from "../baseApi";
import { coursesApi } from "./coursesApi";
import { setSelectedBranchId } from "../../store/branchSlice";
import { createTestStore } from "../../../test/testStore";
import { jsonResponse, stubFetch } from "../../../test/fetchStub";

const path = (url: string) => url.replace(API_BASE_URL, "");

describe("coursesApi.allCourses", () => {
  const read = async (arg: Parameters<typeof coursesApi.endpoints.allCourses.initiate>[0], selected: string | null = "b-ielts") => {
    const store = createTestStore();
    if (selected) store.dispatch(setSelectedBranchId(selected));
    const { requests } = stubFetch(() => jsonResponse({ data: [] }));
    await store.dispatch(coursesApi.endpoints.allCourses.initiate(arg));
    return requests[0];
  };

  it("follows the branch picked in the header when no branch is named", async () => {
    const request = await read(undefined);

    expect(path(request.url)).toBe("/courses");
    expect(request.headers.get("x-branch-id")).toBe("b-ielts");
  });

  it("sends no branch at all on 'All branches'", async () => {
    const request = await read(undefined, null);

    expect(path(request.url)).toBe("/courses");
    expect(request.headers.has("x-branch-id")).toBe(false);
  });

  it("names a branch in the query and in the header - the named one wins over the header's", async () => {
    const request = await read({ branchId: "b-grammar" });

    expect(path(request.url)).toBe("/courses?branchId=b-grammar");
    expect(request.headers.get("x-branch-id")).toBe("b-grammar");
  });

  it("'all' reads every branch's courses whatever the header says", async () => {
    const request = await read({ branchId: "all" });

    expect(path(request.url)).toBe("/courses");
    expect(request.headers.get("x-branch-id")).toBe("all");
  });

  it("keeps a list per branch", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ data: [] }));

    await store.dispatch(coursesApi.endpoints.allCourses.initiate({ branchId: "b-ielts" }));
    await store.dispatch(coursesApi.endpoints.allCourses.initiate({ branchId: "b-grammar" }));
    await store.dispatch(coursesApi.endpoints.allCourses.initiate({ branchId: "all" }));

    expect(requests.map((r) => path(r.url))).toEqual(["/courses?branchId=b-ielts", "/courses?branchId=b-grammar", "/courses"]);
  });

  it("normalizes a {data, meta} envelope to an array", async () => {
    const store = createTestStore();
    stubFetch(() => jsonResponse({ success: true, data: { data: [{ id: "c1" }], meta: {} } }));

    const { data } = await store.dispatch(coursesApi.endpoints.allCourses.initiate());

    expect(data?.data).toEqual([{ id: "c1" }]);
  });
});

describe("coursesApi.coursesSelect", () => {
  it("asks for the branch it is given", async () => {
    const store = createTestStore();
    store.dispatch(setSelectedBranchId("b-ielts"));
    const { requests } = stubFetch(() => jsonResponse({ data: [{ id: "c1", name: "IELTS" }] }));

    const { data } = await store.dispatch(coursesApi.endpoints.coursesSelect.initiate({ branchId: "b-ielts" }));

    expect(path(requests[0].url)).toBe("/courses/select?branchId=b-ielts");
    expect(requests[0].headers.get("x-branch-id")).toBe("b-ielts");
    expect(data).toEqual([{ id: "c1", name: "IELTS" }]);
  });

  it("asks for every branch with 'all', and with no argument", async () => {
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ data: [] }));

    await store.dispatch(coursesApi.endpoints.coursesSelect.initiate({ branchId: "all" }));
    await store.dispatch(coursesApi.endpoints.coursesSelect.initiate());

    expect(requests.map((r) => path(r.url))).toEqual(["/courses/select?branchId=all", "/courses/select?branchId=all"]);
  });

  it("is cached per branch: another branch is a new request, not the previous branch's answer", async () => {
    const store = createTestStore();
    const { requests } = stubFetch((request) =>
      jsonResponse({ data: request.url.endsWith("b-ielts") ? [{ id: "c-ielts", name: "IELTS" }] : [{ id: "c-grammar", name: "Grammar" }] }),
    );

    const ielts = await store.dispatch(coursesApi.endpoints.coursesSelect.initiate({ branchId: "b-ielts" }));
    const grammar = await store.dispatch(coursesApi.endpoints.coursesSelect.initiate({ branchId: "b-grammar" }));

    expect(requests).toHaveLength(2);
    expect(ielts.data).toEqual([{ id: "c-ielts", name: "IELTS" }]);
    expect(grammar.data).toEqual([{ id: "c-grammar", name: "Grammar" }]);
  });
});
