import { describe, expect, it } from "vitest";
import { createTestStore } from "../../test/testStore";
import { logout, loginSuccess } from "./authSlice";
import { changeSelectedBranch, setSelectedBranchId } from "./branchSlice";

// The selected branch is persisted in localStorage and sent as x-branch-id with
// every request, so one left over from an earlier session on this browser must
// never be inherited by the next account that signs in.
const STORED_BRANCH = "selectedBranchId";

const leaveBranchSelected = (store: ReturnType<typeof createTestStore>, id = "branch-of-someone-else") => {
  store.dispatch(setSelectedBranchId(id));
  localStorage.setItem(STORED_BRANCH, id);
};

describe("loginSuccess", () => {
  it.each([
    ["a branch director (ADMIN)", "ADMIN"],
    ["a CEO (SUPERADMIN)", "SUPERADMIN"],
    ["a teacher", "TEACHER"],
    ["a student", "STUDENT"],
    ["a role the login response did not name", undefined],
  ])("starts %s with no branch selected, state and storage alike", (_who, role) => {
    const store = createTestStore();
    leaveBranchSelected(store);

    store.dispatch(loginSuccess("tok", "ref", role) as never);

    expect(store.getState().branch.selectedBranchId).toBeNull();
    expect(localStorage.getItem(STORED_BRANCH)).toBeNull();
    expect(store.getState().auth.token).toBe("tok");
    expect(store.getState().auth.role).toBe(role ?? null);
    expect(localStorage.getItem("ACCESS_TOKEN")).toBe("tok");
    expect(localStorage.getItem("REFRESH_TOKEN")).toBe("ref");
  });

  it("clears the branch before the token is stored, so no request can go out with it", () => {
    const store = createTestStore();
    leaveBranchSelected(store);
    const seen: Array<{ token: string | null; branch: string | null }> = [];
    store.subscribe(() => seen.push({ token: store.getState().auth.token, branch: store.getState().branch.selectedBranchId }));

    store.dispatch(loginSuccess("tok", undefined, "ADMIN") as never);

    expect(seen.some((s) => s.token === "tok" && s.branch !== null)).toBe(false);
  });
});

describe("logout", () => {
  it("forgets the branch selected during the session", () => {
    const store = createTestStore();
    store.dispatch(loginSuccess("tok", "ref", "SUPERADMIN") as never);
    store.dispatch(changeSelectedBranch("branch-a") as never);
    expect(localStorage.getItem(STORED_BRANCH)).toBe("branch-a");

    store.dispatch(logout() as never);

    expect(store.getState().branch.selectedBranchId).toBeNull();
    expect(localStorage.getItem(STORED_BRANCH)).toBeNull();
    expect(store.getState().auth.token).toBeNull();
    expect(localStorage.getItem("ACCESS_TOKEN")).toBeNull();
  });
});

describe("changeSelectedBranch", () => {
  it("keeps storage in line with the request even when the state already matches", () => {
    const store = createTestStore();
    store.dispatch(setSelectedBranchId("branch-a"));

    store.dispatch(changeSelectedBranch("branch-a") as never);

    expect(localStorage.getItem(STORED_BRANCH)).toBe("branch-a");
  });
});
