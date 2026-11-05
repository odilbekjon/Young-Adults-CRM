import { describe, expect, it } from "vitest";
import { API_BASE_URL, isBranchAgnosticRequest } from "./index";
import { authApi } from "../authApi";
import { groupsApi } from "../groupsApi";
import { setSelectedBranchId } from "../../store/branchSlice";
import { setToken } from "../../store/authSlice";
import { createTestStore } from "../../../test/testStore";
import { jsonResponse, stubFetch } from "../../../test/fetchStub";

const path = (url: string) => url.replace(API_BASE_URL, "");

// A branch left selected by an earlier session on this browser - or one the
// account doesn't own - must not be able to make the backend refuse the calls that
// tell the app who the user is (the header then stays on "Account", the branch
// picker has no branches and every page stays empty, with no way out).
const withStaleBranch = () => {
  localStorage.setItem("ACCESS_TOKEN", "tok-123");
  const store = createTestStore();
  store.dispatch(setSelectedBranchId("branch-of-someone-else"));
  return store;
};

describe("baseApi identity calls", () => {
  it("sends GET /auth/me and GET /auth/sidebar without x-branch-id (but with the token)", async () => {
    const store = withStaleBranch();
    const { requests } = stubFetch(() => jsonResponse({ success: true, data: {} }));

    await store.dispatch(authApi.endpoints.getMe.initiate());
    await store.dispatch(authApi.endpoints.getSidebar.initiate());

    expect(requests.map((r) => path(r.url))).toEqual(["/auth/me", "/auth/sidebar"]);
    for (const request of requests) {
      expect(request.headers.has("x-branch-id")).toBe(false);
      expect(request.headers.get("authorization")).toBe("Bearer tok-123");
      expect(request.headers.get("x-lang")).toBe("en");
    }
  });

  it("sends the login without x-branch-id and without a token left over from an earlier session", async () => {
    const store = withStaleBranch();
    const { requests } = stubFetch(() => jsonResponse({ success: true, data: { token: "t" } }));

    await store.dispatch(authApi.endpoints.login.initiate({ identifier: "a@b.uz", password: "secret1" }));

    expect(requests).toHaveLength(1);
    expect(path(requests[0].url)).toBe("/auth/login");
    expect(requests[0].headers.has("x-branch-id")).toBe(false);
    expect(requests[0].headers.has("authorization")).toBe(false);
  });

  it("still scopes every other request to the selected branch", async () => {
    const store = withStaleBranch();
    const { requests } = stubFetch(() => jsonResponse({ data: [] }));

    await store.dispatch(groupsApi.endpoints.groupsSelect.initiate());

    expect(requests[0].headers.get("x-branch-id")).toBe("branch-of-someone-else");
  });

  it("recognizes the identity paths however the request is written", () => {
    expect(isBranchAgnosticRequest("auth/me")).toBe(true);
    expect(isBranchAgnosticRequest("/auth/me?x=1")).toBe(true);
    expect(isBranchAgnosticRequest({ url: "auth/sidebar", method: "GET" })).toBe(true);
    expect(isBranchAgnosticRequest({ url: "auth/login", method: "POST" })).toBe(true);
    expect(isBranchAgnosticRequest({ url: "auth/refresh", method: "POST" })).toBe(true);
    expect(isBranchAgnosticRequest("groups/select")).toBe(false);
    expect(isBranchAgnosticRequest("students/auth/me")).toBe(false);
    expect(isBranchAgnosticRequest(undefined)).toBe(false);
  });

  it("answers a 401 to the login as plain wrong credentials: no token refresh, no logout", async () => {
    localStorage.setItem("ACCESS_TOKEN", "tok-old");
    localStorage.setItem("REFRESH_TOKEN", "ref-old");
    const store = createTestStore();
    store.dispatch(setToken("tok-old"));
    const { requests } = stubFetch(() =>
      jsonResponse({ success: false, error: ["Login yoki parol noto'g'ri"], statusCode: 401 }, { status: 401 }),
    );

    const result = await store.dispatch(authApi.endpoints.login.initiate({ identifier: "a@b.uz", password: "secret1" }));

    expect(requests.some((r) => r.url.endsWith("/auth/refresh"))).toBe(false);
    expect(result).toMatchObject({ error: { status: 401 } });
    // the stored session was not touched
    expect(store.getState().auth.token).toBe("tok-old");
    expect(localStorage.getItem("REFRESH_TOKEN")).toBe("ref-old");
  });

  it("keeps renewing an expired session for any other call, the renewal carrying no branch either", async () => {
    localStorage.setItem("ACCESS_TOKEN", "tok-old");
    localStorage.setItem("REFRESH_TOKEN", "ref-old");
    const store = createTestStore();
    store.dispatch(setToken("tok-old"));
    store.dispatch(setSelectedBranchId("branch-a"));
    const { requests } = stubFetch((request) => {
      if (request.url.endsWith("/auth/refresh")) return jsonResponse({ data: { token: "tok-new", refreshToken: "ref-new" } });
      return request.headers.get("authorization") === "Bearer tok-new"
        ? jsonResponse({ data: { id: "u1" } })
        : jsonResponse({ error: "expired" }, { status: 401 });
    });

    const result = await store.dispatch(authApi.endpoints.getMe.initiate());

    expect(result.data).toEqual({ data: { id: "u1" } });
    expect(requests.map((r) => path(r.url))).toEqual(["/auth/me", "/auth/refresh", "/auth/me"]);
    expect(requests[1].headers.has("x-branch-id")).toBe(false);
  });
});
