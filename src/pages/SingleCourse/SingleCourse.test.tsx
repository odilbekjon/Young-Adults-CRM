import { screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL, baseApi } from "../../app/api/baseApi";
import { store } from "../../app/store";
import { setToken } from "../../app/store/authSlice";
import { setSelectedBranchId } from "../../app/store/branchSlice";
import { ToastProvider } from "../../Context/ToastContext";
import { jsonResponse, stubFetch, type SentRequest } from "../../test/fetchStub";
import { renderWithStore } from "../../test/renderWithStore";
import { SingleCourse } from "./SingleCourse";

vi.setConfig({ testTimeout: 20_000 });

const IELTS = "b-ielts";
const GRAMMAR = "b-grammar";

const COURSES = [
  { id: "c-ielts", name: "IELTS Intensive", status: "ACTIVE", branchId: IELTS, price: 100000, branch: { id: IELTS, name: "YA IELTS Campus" } },
  { id: "c-grammar", name: "Grammar Basic", status: "ACTIVE", branchId: GRAMMAR, price: 80000, branch: { id: GRAMMAR, name: "Grammar Campus" } },
];

const path = (request: SentRequest) => request.url.replace(API_BASE_URL, "");

const BRANCHES = [
  { id: IELTS, name: "YA IELTS Campus", status: "ACTIVE" },
  { id: GRAMMAR, name: "Grammar Campus", status: "ACTIVE" },
];

// GET /auth/me for a CEO (sees every branch) and for a branch director / admin tied
// to one branch.
const CEO_ME = { id: "u-ceo", role: "SUPERADMIN", roles: [], rolePermissions: [], branchIds: [], branches: [] };
const directorOf = (branch: (typeof BRANCHES)[number]) => ({
  id: "u-director", role: "ADMIN", roles: ["ADMIN"], rolePermissions: [],
  branchIds: [branch.id], branches: [{ branchId: branch.id, branch }],
});

// A backend that honours the branch: an id narrows GET /courses, "all" does not -
// and, like it does for a branch director or an admin, it refuses "all".
const backend = (me: unknown = CEO_ME) => (request: SentRequest) => {
  const p = path(request);
  if (p.startsWith("/auth/me")) return jsonResponse({ success: true, data: me });
  if (p.startsWith("/auth/sidebar")) return jsonResponse({ success: true, data: { allAccess: false, labels: [] } });
  if (p.startsWith("/branches")) return jsonResponse({ success: true, data: BRANCHES });
  if (p.startsWith("/courses")) {
    const named = new URL(request.url).searchParams.get("branchId") ?? request.headers.get("x-branch-id");
    if (named === "all") return jsonResponse({ success: false, error: ["Forbidden"], statusCode: 403 }, { status: 403 });
    return jsonResponse({ success: true, data: named ? COURSES.filter((c) => c.branchId === named) : COURSES });
  }
  return jsonResponse({ success: true, data: [] });
};

const renderCourse = (id: string) =>
  renderWithStore(
    <MemoryRouter initialEntries={[`/courses/${id}`]}>
      <ToastProvider>
        <Routes>
          <Route path="/courses/:id" element={<SingleCourse />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
  store.dispatch(setSelectedBranchId(null));
  store.dispatch(setToken("test-token"));
});

const courseReads = (requests: SentRequest[]) => requests.filter((r) => path(r).startsWith("/courses"));

describe("SingleCourse opens a course by id, whatever branch the header is on", () => {
  it("opens a course of another branch than the header's", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    const { requests } = stubFetch(backend());
    renderCourse("c-grammar");

    expect(await screen.findByRole("heading", { name: "Grammar Basic" })).toBeTruthy();

    // each branch is read with the request a branch of its own is read with; "all" is never sent
    expect(courseReads(requests).map(path).sort()).toEqual([`/courses?branchId=${GRAMMAR}`, `/courses?branchId=${IELTS}`]);
    expect(courseReads(requests).some((r) => r.headers.get("x-branch-id") === "all")).toBe(false);
    expect(screen.queryByText("Course not found.")).toBeNull();
  });

  it("opens a course of the header's own branch too", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    stubFetch(backend());
    renderCourse("c-ielts");

    expect(await screen.findByRole("heading", { name: "IELTS Intensive" })).toBeTruthy();
  });

  it("opens the course of a branch director's own branch, although 'all' would be refused to them", async () => {
    store.dispatch(setSelectedBranchId(GRAMMAR));
    const { requests } = stubFetch(backend(directorOf(BRANCHES[1])));
    renderCourse("c-grammar");

    expect(await screen.findByRole("heading", { name: "Grammar Basic" })).toBeTruthy();
    expect(courseReads(requests).map(path)).toEqual([`/courses?branchId=${GRAMMAR}`]);
    expect(courseReads(requests).some((r) => r.headers.get("x-branch-id") === "all")).toBe(false);
  });

  it("still says so for an id that exists nowhere", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    stubFetch(backend());
    renderCourse("c-nope");

    await waitFor(() => expect(screen.queryByText("Course not found.")).not.toBeNull());
  });

  it("does not say 'not found' while the account's branches are still loading", async () => {
    store.dispatch(setSelectedBranchId(GRAMMAR));
    stubFetch(backend(directorOf(BRANCHES[1])));
    renderCourse("c-grammar");

    // nothing is known about the account yet: a spinner, not "Course not found."
    expect(screen.queryByText("Course not found.")).toBeNull();
    expect(await screen.findByRole("heading", { name: "Grammar Basic" })).toBeTruthy();
  });
});
