import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL, baseApi } from "../../../../../app/api/baseApi";
import { store } from "../../../../../app/store";
import { setSelectedBranchId } from "../../../../../app/store/branchSlice";
import { ToastProvider } from "../../../../../Context/ToastContext";
import { jsonResponse, stubFetch, type SentRequest } from "../../../../../test/fetchStub";
import { renderWithStore } from "../../../../../test/renderWithStore";
import { Courses } from "./courses";

// Each test renders the whole page - slow enough to brush the default 5 s when
// the suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });

const IELTS = "b-ielts";
const GRAMMAR = "b-grammar";

const BRANCHES = [
  { id: IELTS, name: "YA IELTS Campus", status: "ACTIVE" },
  { id: GRAMMAR, name: "Grammar Campus", status: "ACTIVE" },
];

const course = (id: string, name: string, branchId: string, status = "ACTIVE") => ({
  id, name, status, branchId, price: 100000, branch: BRANCHES.find((b) => b.id === branchId),
});

const COURSES = [
  course("c-ielts", "IELTS Intensive", IELTS),
  course("c-ielts-old", "IELTS Retired", IELTS, "INACTIVE"),
  course("c-grammar", "Grammar Basic", GRAMMAR),
  course("c-grammar-2", "Grammar Advanced", GRAMMAR),
];

const path = (request: SentRequest) => request.url.replace(API_BASE_URL, "");

// A backend that honours the branch (query or x-branch-id), or - `ignoresBranch` -
// one that answers every request with every course.
const backend = (ignoresBranch = false) => (request: SentRequest) => {
  if (request.method === "GET" && path(request).startsWith("/courses")) {
    const named = new URL(request.url).searchParams.get("branchId") ?? request.headers.get("x-branch-id");
    const scoped = !ignoresBranch && named && named !== "all";
    return jsonResponse({ success: true, data: scoped ? COURSES.filter((c) => c.branchId === named) : COURSES });
  }
  if (request.method === "GET" && path(request).startsWith("/branches")) return jsonResponse({ success: true, data: BRANCHES });
  return jsonResponse({ success: true, data: [] });
};

const renderCourses = () =>
  renderWithStore(
    <MemoryRouter>
      <ToastProvider>
        <Courses />
      </ToastProvider>
    </MemoryRouter>,
  );

const shown = (name: string) => screen.queryAllByText(name).length > 0;

beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
  store.dispatch(setSelectedBranchId(null));
});

describe("Settings > Courses follows the header's branch", () => {
  it("lists only the courses of the branch picked in the header, and asks for that branch", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    const { requests } = stubFetch(backend());
    renderCourses();

    await waitFor(() => expect(shown("IELTS Intensive")).toBe(true));

    expect(shown("Grammar Basic")).toBe(false);
    expect(shown("Grammar Advanced")).toBe(false);
    const read = requests.find((r) => path(r).startsWith("/courses"))!;
    expect(path(read)).toBe(`/courses?branchId=${IELTS}`);
    expect(read.headers.get("x-branch-id")).toBe(IELTS);
  });

  it("does not trust the server to have narrowed the list", async () => {
    store.dispatch(setSelectedBranchId(GRAMMAR));
    stubFetch(backend(true));
    renderCourses();

    await waitFor(() => expect(shown("Grammar Basic")).toBe(true));

    expect(shown("Grammar Advanced")).toBe(true);
    expect(shown("IELTS Intensive")).toBe(false);
  });

  it("lists the courses of every branch on 'All branches'", async () => {
    stubFetch(backend());
    renderCourses();

    await waitFor(() => expect(shown("IELTS Intensive")).toBe(true));

    expect(shown("Grammar Basic")).toBe(true);
    expect(shown("Grammar Advanced")).toBe(true);
    // the archived one is on the other tab
    expect(shown("IELTS Retired")).toBe(false);
  });

  it("scopes the archive tab to the branch too", async () => {
    store.dispatch(setSelectedBranchId(GRAMMAR));
    stubFetch(backend(true));
    renderCourses();
    await waitFor(() => expect(shown("Grammar Basic")).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Archived" }));

    // the only archived course belongs to the IELTS Campus
    expect(await screen.findByText("No archived courses")).toBeTruthy();
    expect(shown("IELTS Retired")).toBe(false);
  });

  it("switches to the new branch's courses when the header changes", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    const { requests } = stubFetch(backend());
    renderCourses();
    await waitFor(() => expect(shown("IELTS Intensive")).toBe(true));

    act(() => {
      store.dispatch(setSelectedBranchId(GRAMMAR));
    });

    await waitFor(() => expect(shown("Grammar Basic")).toBe(true));
    expect(shown("IELTS Intensive")).toBe(false);
    expect(requests.map(path)).toContain(`/courses?branchId=${GRAMMAR}`);
  });

  it("says so when the branch has no course yet", async () => {
    store.dispatch(setSelectedBranchId("b-empty"));
    stubFetch(backend());
    renderCourses();

    expect(await screen.findByText("No courses found")).toBeTruthy();
  });
});
