import { useState } from "react";
import { act, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL } from "../../app/api/baseApi";
import { store } from "../../app/store";
import { logout, setRole, setToken } from "../../app/store/authSlice";
import { setSelectedBranchId } from "../../app/store/branchSlice";
import { jsonResponse, stubFetch, type SentRequest } from "../../test/fetchStub";
import { renderWithStore } from "../../test/renderWithStore";
import { BranchDropdown } from "./Header";

// Each test renders the real header picker inside the app's real store.
vi.setConfig({ testTimeout: 20_000 });

const IELTS = { id: "b-ielts", name: "YA IELTS Campus", status: "ACTIVE" };
const GRAMMAR = { id: "b-grammar", name: "Grammar Campus", status: "ACTIVE" };
const ALL_BRANCHES = [IELTS, GRAMMAR];

const path = (request: SentRequest) => request.url.replace(API_BASE_URL, "");

// A branch director: ADMIN holding the "Filial direktori" position, attached to
// the Grammar Campus only.
const DIRECTOR = {
  id: "u-director", name: "Dilshod Direktor", email: "dilshod@ya.uz", phone: "+998901112233",
  role: "ADMIN", roles: ["ADMIN", "Filial direktori"],
  rolePermissions: [{ id: "rp-1", name: "Filial direktori", labels: ["STUDENTS"], permissions: [{ action: "READ", label: "STUDENTS" }] }],
  branchId: GRAMMAR.id, branchIds: [GRAMMAR.id], branches: [{ branchId: GRAMMAR.id, branch: GRAMMAR }],
};
const CEO = { id: "u-ceo", name: "CEO", email: "ceo@ya.uz", role: "SUPERADMIN", roles: ["SUPERADMIN"], rolePermissions: [], branchIds: [] as string[], branches: [] };

// A backend that refuses GET /auth/me when the request names a branch the account
// doesn't own (the failure that left a branch director stuck on "Account").
const backend = (me: typeof DIRECTOR | typeof CEO, options: { branchesForbidden?: boolean } = {}) => (request: SentRequest) => {
  const p = path(request);
  if (p.startsWith("/auth/me")) {
    const named = request.headers.get("x-branch-id");
    const owned = me.branchIds.length === 0 || me.branchIds.includes(named ?? "");
    return named && !owned ? jsonResponse({ success: false, error: ["Forbidden"], statusCode: 403 }, { status: 403 }) : jsonResponse({ success: true, data: me });
  }
  if (p.startsWith("/auth/sidebar")) return jsonResponse({ success: true, data: { allAccess: me.role === "SUPERADMIN", labels: [] } });
  if (p.startsWith("/branches")) {
    return options.branchesForbidden
      ? jsonResponse({ success: false, error: ["Forbidden"], statusCode: 403 }, { status: 403 })
      : jsonResponse({ success: true, data: ALL_BRANCHES });
  }
  return jsonResponse({ success: true, data: [] });
};

const Picker = ({ onBranch }: { onBranch?: (name: string) => void }) => {
  const [branch, setBranch] = useState("all");
  return (
    <BranchDropdown
      branch={branch}
      setBranch={(name) => {
        onBranch?.(name);
        setBranch(name);
      }}
    />
  );
};

const signIn = (role: string) => {
  localStorage.setItem("ACCESS_TOKEN", "tok");
  store.dispatch(setToken("tok"));
  store.dispatch(setRole(role));
};
const leaveBranchSelected = (id: string) => {
  localStorage.setItem("selectedBranchId", id);
  store.dispatch(setSelectedBranchId(id));
};
const label = () => screen.getByRole("button").textContent;

beforeEach(() => {
  store.dispatch(logout());
});
afterEach(() => {
  act(() => {
    store.dispatch(logout());
  });
});

describe("header branch picker - a branch director on a browser that had another branch selected", () => {
  it("is not locked out by the stale selection: /auth/me is asked without it, and they land in their own branch", async () => {
    signIn("ADMIN");
    leaveBranchSelected(IELTS.id); // picked earlier by a CEO on this browser
    const { requests } = stubFetch(backend(DIRECTOR));
    const seen: string[] = [];

    renderWithStore(<Picker onBranch={(name) => seen.push(name)} />);

    await waitFor(() => expect(store.getState().branch.selectedBranchId).toBe(GRAMMAR.id));
    await waitFor(() => expect(label()).toBe(GRAMMAR.name));
    expect(localStorage.getItem("selectedBranchId")).toBe(GRAMMAR.id);
    expect(seen).toContain(GRAMMAR.name);

    const meRequests = requests.filter((r) => path(r).startsWith("/auth/me"));
    expect(meRequests.length).toBeGreaterThan(0);
    expect(meRequests.every((r) => !r.headers.has("x-branch-id"))).toBe(true);
    // and the data requests that follow are scoped to the director's own branch
    await waitFor(() =>
      expect(requests.some((r) => path(r).startsWith("/branches") && r.headers.get("x-branch-id") === GRAMMAR.id)).toBe(true),
    );
  });

  it("lands in their own branch on a fresh browser too (nothing selected)", async () => {
    signIn("ADMIN");
    stubFetch(backend(DIRECTOR));

    renderWithStore(<Picker />);

    await waitFor(() => expect(store.getState().branch.selectedBranchId).toBe(GRAMMAR.id));
    await waitFor(() => expect(label()).toBe(GRAMMAR.name));
  });

  it("keeps their own branch across a reload, and never offers 'All branches'", async () => {
    signIn("ADMIN");
    leaveBranchSelected(GRAMMAR.id);
    stubFetch(backend(DIRECTOR));

    renderWithStore(<Picker />);

    await waitFor(() => expect(label()).toBe(GRAMMAR.name));
    expect(store.getState().branch.selectedBranchId).toBe(GRAMMAR.id);
    act(() => screen.getByRole("button").click());
    expect(screen.queryByText("All branches")).toBeNull();
  });

  it("is not left without a branch when GET /branches is refused and /auth/me lists no branch objects", async () => {
    signIn("ADMIN");
    leaveBranchSelected(IELTS.id);
    stubFetch(backend({ ...DIRECTOR, branches: [] }, { branchesForbidden: true }));

    renderWithStore(<Picker />);

    await waitFor(() => expect(store.getState().branch.selectedBranchId).toBe(GRAMMAR.id));
    expect(label()).toBe("Branch");
  });

  it("recovers when the first /auth/me answer lists no branches and the next one does", async () => {
    signIn("ADMIN");
    leaveBranchSelected(IELTS.id);
    let meCalls = 0;
    stubFetch((request) => {
      if (path(request).startsWith("/auth/me") && ++meCalls === 1) {
        return jsonResponse({ success: true, data: { ...DIRECTOR, branchId: null, branchIds: [], branches: [] } });
      }
      return backend(DIRECTOR)(request);
    });

    renderWithStore(<Picker />);

    // the leftover selection is dropped for an account that (momentarily) has no
    // branch, and the account's own branch is picked up as soon as it is known
    await waitFor(() => expect(store.getState().branch.selectedBranchId).toBe(GRAMMAR.id));
    await waitFor(() => expect(label()).toBe(GRAMMAR.name));
    expect(meCalls).toBeGreaterThan(1);
  });
});

describe("header branch picker - a CEO", () => {
  it("still sees 'All branches' and keeps a selection that exists", async () => {
    signIn("SUPERADMIN");
    leaveBranchSelected(IELTS.id);
    stubFetch(backend(CEO));

    renderWithStore(<Picker />);

    await waitFor(() => expect(label()).toBe(IELTS.name));
    expect(store.getState().branch.selectedBranchId).toBe(IELTS.id);
    act(() => screen.getByRole("button").click());
    expect(screen.getByText("All branches")).toBeTruthy();
    expect(screen.getByText(GRAMMAR.name)).toBeTruthy();
  });

  it("reads 'All branches' with nothing selected, and falls back to it when the selected branch no longer exists", async () => {
    signIn("SUPERADMIN");
    leaveBranchSelected("deleted-branch");
    stubFetch(backend(CEO));

    renderWithStore(<Picker />);

    await waitFor(() => expect(store.getState().branch.selectedBranchId).toBeNull());
    await waitFor(() => expect(label()).toBe("All branches"));
  });
});
