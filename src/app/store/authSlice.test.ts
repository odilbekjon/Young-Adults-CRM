import { beforeEach, describe, expect, it } from "vitest";
import { createTestStore } from "../../test/testStore";
import { adoptSessionUser, logout, loginSuccess, setToken } from "./authSlice";
import { changeSelectedBranch, setSelectedBranchId } from "./branchSlice";
import { recallBranch, rememberBranch } from "../../utils/branchMemory";

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

// What an account had open when it left is given back to THAT account at its
// next login: the header's branch and the filters of its pages.
describe("signing in again", () => {
  const FILTERS = "ya-crm:state:groups:filters";
  beforeEach(() => sessionStorage.clear());

  const session = (userId: string, role = "SUPERADMIN") => {
    const store = createTestStore();
    store.dispatch(loginSuccess("tok", "ref", role, userId) as never);
    return store;
  };

  it("opens the branch the account had selected when it logged out", () => {
    const first = session("u-ceo");
    first.dispatch(changeSelectedBranch("branch-a") as never);
    first.dispatch(logout() as never);
    expect(first.getState().branch.selectedBranchId).toBeNull();

    const second = session("u-ceo");

    expect(second.getState().branch.selectedBranchId).toBe("branch-a");
    expect(localStorage.getItem(STORED_BRANCH)).toBe("branch-a");
    expect(second.getState().auth.userId).toBe("u-ceo");
    expect(localStorage.getItem("USER_ID")).toBe("u-ceo");
  });

  it("selects the branch before the token is stored, so the first requests are already scoped to it", () => {
    rememberBranch("u-ceo", "branch-a");
    const store = createTestStore();
    const seen: Array<{ token: string | null; branch: string | null }> = [];
    store.subscribe(() => seen.push({ token: store.getState().auth.token, branch: store.getState().branch.selectedBranchId }));

    store.dispatch(loginSuccess("tok", "ref", "SUPERADMIN", "u-ceo") as never);

    expect(seen.filter((s) => s.token === "tok").every((s) => s.branch === "branch-a")).toBe(true);
  });

  it("follows every change of branch, so the last one before the logout is the one that comes back", () => {
    const first = session("u-ceo");
    first.dispatch(changeSelectedBranch("branch-a") as never);
    first.dispatch(changeSelectedBranch("branch-b") as never);
    first.dispatch(logout() as never);

    expect(session("u-ceo").getState().branch.selectedBranchId).toBe("branch-b");
  });

  it("keeps a CEO on All branches when that is what they left with", () => {
    const first = session("u-ceo");
    first.dispatch(changeSelectedBranch("branch-a") as never);
    first.dispatch(changeSelectedBranch(null) as never);
    first.dispatch(logout() as never);
    expect(recallBranch("u-ceo")).toBeNull();

    expect(session("u-ceo").getState().branch.selectedBranchId).toBeNull();
  });

  it("never hands one account the branch of another", () => {
    const ceo = session("u-ceo");
    ceo.dispatch(changeSelectedBranch("branch-a") as never);
    ceo.dispatch(logout() as never);

    const director = session("u-director", "ADMIN");

    expect(director.getState().branch.selectedBranchId).toBeNull();
    expect(localStorage.getItem(STORED_BRANCH)).toBeNull();
    // and the CEO still finds theirs afterwards
    director.dispatch(changeSelectedBranch("branch-d") as never);
    director.dispatch(logout() as never);
    expect(session("u-ceo").getState().branch.selectedBranchId).toBe("branch-a");
    expect(recallBranch("u-director")).toBe("branch-d");
  });

  it("starts with no branch when the login response names no account, and remembers nothing for it", () => {
    rememberBranch("u-ceo", "branch-a");
    const store = createTestStore();

    store.dispatch(loginSuccess("tok", "ref", "SUPERADMIN") as never);
    store.dispatch(changeSelectedBranch("branch-x") as never);

    expect(store.getState().auth.userId).toBeNull();
    expect(recallBranch("u-ceo")).toBe("branch-a");
  });

  it("gives the page filters back to the same account, in the tab it signs in from", () => {
    const first = session("u-ceo");
    sessionStorage.setItem(FILTERS, JSON.stringify({ status: "ACTIVE" }));
    sessionStorage.setItem("something-else", "kept");
    first.dispatch(logout() as never);
    // the tab no longer holds them once the account is out
    expect(sessionStorage.getItem(FILTERS)).toBeNull();
    expect(sessionStorage.getItem("something-else")).toBe("kept");

    session("u-ceo");

    expect(JSON.parse(sessionStorage.getItem(FILTERS) ?? "null")).toEqual({ status: "ACTIVE" });
  });

  it("does not show one account the filters another left behind", () => {
    const ceo = session("u-ceo");
    sessionStorage.setItem(FILTERS, JSON.stringify({ status: "ACTIVE" }));
    ceo.dispatch(logout() as never);

    session("u-director", "ADMIN");

    expect(sessionStorage.getItem(FILTERS)).toBeNull();
  });

  it("brings the account back with no filters when it left with none", () => {
    const first = session("u-ceo");
    sessionStorage.setItem(FILTERS, JSON.stringify({ status: "ACTIVE" }));
    first.dispatch(logout() as never);
    const second = session("u-ceo");
    sessionStorage.removeItem(FILTERS); // cleared the filters, then left
    second.dispatch(logout() as never);

    session("u-ceo");

    expect(sessionStorage.getItem(FILTERS)).toBeNull();
  });
});

// A session that was already signed in before the account id was kept (or whose
// login response had none) learns it from GET /auth/me.
describe("adoptSessionUser", () => {
  beforeEach(() => sessionStorage.clear());
  const signedIn = () => {
    const store = createTestStore();
    store.dispatch(setToken("tok"));
    return store;
  };

  it("records the account and takes the branch selected right now as its choice", () => {
    const store = signedIn();
    store.dispatch(setSelectedBranchId("branch-a"));

    store.dispatch(adoptSessionUser("u-ceo") as never);

    expect(store.getState().auth.userId).toBe("u-ceo");
    expect(localStorage.getItem("USER_ID")).toBe("u-ceo");
    expect(store.getState().branch.selectedBranchId).toBe("branch-a");
    expect(recallBranch("u-ceo")).toBe("branch-a");
  });

  it("brings the remembered branch back when none is selected", () => {
    rememberBranch("u-ceo", "branch-a");
    const store = signedIn();

    store.dispatch(adoptSessionUser("u-ceo") as never);

    expect(store.getState().branch.selectedBranchId).toBe("branch-a");
    expect(localStorage.getItem(STORED_BRANCH)).toBe("branch-a");
  });

  it("leaves All branches alone when nothing is remembered, and does nothing while signed out", () => {
    const store = signedIn();
    store.dispatch(adoptSessionUser("u-ceo") as never);
    expect(store.getState().branch.selectedBranchId).toBeNull();
    expect(recallBranch("u-ceo")).toBeUndefined();

    const out = createTestStore();
    out.dispatch(adoptSessionUser("u-ceo") as never);
    expect(out.getState().auth.userId).toBeNull();
  });

  it("changes nothing for a session that already knows its account", () => {
    const store = createTestStore();
    store.dispatch(loginSuccess("tok", "ref", "SUPERADMIN", "u-ceo") as never);
    rememberBranch("u-ceo", "branch-a"); // e.g. chosen in another tab meanwhile

    store.dispatch(adoptSessionUser("u-ceo") as never);

    expect(store.getState().branch.selectedBranchId).toBeNull();
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
