import { screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL, baseApi } from "../../app/api/baseApi";
import { store } from "../../app/store";
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

// A backend that honours the branch: an id narrows GET /courses, "all" does not.
const backend = (request: SentRequest) => {
  if (path(request).startsWith("/courses")) {
    const named = new URL(request.url).searchParams.get("branchId") ?? request.headers.get("x-branch-id");
    return jsonResponse({ success: true, data: named && named !== "all" ? COURSES.filter((c) => c.branchId === named) : COURSES });
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
});

describe("SingleCourse opens a course by id, whatever branch the header is on", () => {
  it("opens a course of another branch than the header's", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    const { requests } = stubFetch(backend);
    renderCourse("c-grammar");

    expect(await screen.findByRole("heading", { name: "Grammar Basic" })).toBeTruthy();

    const read = requests.find((r) => path(r).startsWith("/courses"))!;
    expect(read.headers.get("x-branch-id")).toBe("all");
    expect(screen.queryByText("Course not found.")).toBeNull();
  });

  it("opens a course of the header's own branch too", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    stubFetch(backend);
    renderCourse("c-ielts");

    expect(await screen.findByRole("heading", { name: "IELTS Intensive" })).toBeTruthy();
  });

  it("still says so for an id that exists nowhere", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    stubFetch(backend);
    renderCourse("c-nope");

    await waitFor(() => expect(screen.queryByText("Course not found.")).not.toBeNull());
  });
});
