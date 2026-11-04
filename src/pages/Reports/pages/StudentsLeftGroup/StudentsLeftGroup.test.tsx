import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL, baseApi } from "../../../../app/api/baseApi";
import { store } from "../../../../app/store";
import { setSelectedBranchId } from "../../../../app/store/branchSlice";
import { BranchProvider } from "../../../../Context/BranchContext";
import { DataProvider } from "../../../../Context/DataContext";
import { ToastProvider } from "../../../../Context/ToastContext";
import { jsonResponse, stubFetch, type SentRequest } from "../../../../test/fetchStub";
import { renderWithStore } from "../../../../test/renderWithStore";
import { StudentsLeftGroup } from "./StudentsLeftGroup";

vi.setConfig({ testTimeout: 20_000 });

const IELTS = "b-ielts";
const GRAMMAR = "b-grammar";
const COURSE_KEY = "ya-crm:state:studentsLeftGroup:course";

const BRANCHES = [
  { id: IELTS, name: "YA IELTS Campus", status: "ACTIVE" },
  { id: GRAMMAR, name: "Grammar Campus", status: "ACTIVE" },
];
const course = (id: string, name: string, branchId: string) => ({ id, name, status: "ACTIVE", branchId });
const COURSES = [course("c-ielts", "IELTS Intensive", IELTS), course("c-grammar", "Grammar Basic", GRAMMAR)];

const path = (request: SentRequest) => request.url.replace(API_BASE_URL, "");

const backend = (request: SentRequest) => {
  const p = path(request);
  if (request.method === "GET" && p.startsWith("/courses")) {
    const named = new URL(request.url).searchParams.get("branchId") ?? request.headers.get("x-branch-id");
    return jsonResponse({ success: true, data: named && named !== "all" ? COURSES.filter((c) => c.branchId === named) : COURSES });
  }
  if (p.startsWith("/branches")) return jsonResponse({ success: true, data: BRANCHES });
  if (p.startsWith("/reports/left-students")) {
    return jsonResponse({ success: true, data: { total: 0, byTeacher: [], byCourse: [], byMonth: [], byReason: [] } });
  }
  return jsonResponse({ success: true, data: [] });
};

const renderReport = () =>
  renderWithStore(
    <MemoryRouter>
      <DataProvider>
        <BranchProvider>
          <ToastProvider>
            <StudentsLeftGroup />
          </ToastProvider>
        </BranchProvider>
      </DataProvider>
    </MemoryRouter>,
  );

const savedCourse = () => JSON.parse(sessionStorage.getItem(COURSE_KEY) ?? "null") as string | null;
const buttonTexts = () => screen.getAllByRole("button").map((b) => b.textContent);
const openSelect = (placeholder: string) => fireEvent.click(screen.getByRole("button", { name: placeholder }));

beforeEach(() => {
  sessionStorage.clear();
  store.dispatch(baseApi.util.resetApiState());
  store.dispatch(setSelectedBranchId(null));
});

describe("Students-left report: the Course filter follows the branch", () => {
  it("offers the courses of the header's branch", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    stubFetch(backend);
    renderReport();

    openSelect("Course");

    await waitFor(() => expect(buttonTexts()).toContain("IELTS Intensive"));
    expect(buttonTexts()).not.toContain("Grammar Basic");
  });

  it("offers every branch's courses on 'All branches'", async () => {
    stubFetch(backend);
    renderReport();

    openSelect("Course");

    await waitFor(() => expect(buttonTexts()).toEqual(expect.arrayContaining(["IELTS Intensive", "Grammar Basic"])));
  });

  it("follows the report's own branch when one is picked there", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    stubFetch(backend);
    renderReport();
    openSelect("Branch");
    fireEvent.click(await screen.findByRole("button", { name: "Grammar Campus" }));

    openSelect("Course");

    await waitFor(() => expect(buttonTexts()).toContain("Grammar Basic"));
    expect(buttonTexts()).not.toContain("IELTS Intensive");
  });

  it("drops a saved course of another branch instead of keeping it hidden in the report", async () => {
    sessionStorage.setItem(COURSE_KEY, JSON.stringify("Grammar Basic"));
    store.dispatch(setSelectedBranchId(IELTS));
    stubFetch(backend);
    renderReport();

    await waitFor(() => expect(savedCourse()).toBe(""));
  });

  it("keeps a saved course that belongs to the branch", async () => {
    sessionStorage.setItem(COURSE_KEY, JSON.stringify("IELTS Intensive"));
    store.dispatch(setSelectedBranchId(IELTS));
    const { requests } = stubFetch(backend);
    renderReport();
    await waitFor(() => expect(requests.some((r) => path(r).startsWith("/courses"))).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(savedCourse()).toBe("IELTS Intensive");
  });

  it("drops the picked course when the header's branch changes", async () => {
    sessionStorage.setItem(COURSE_KEY, JSON.stringify("IELTS Intensive"));
    store.dispatch(setSelectedBranchId(IELTS));
    stubFetch(backend);
    renderReport();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(savedCourse()).toBe("IELTS Intensive");

    act(() => {
      store.dispatch(setSelectedBranchId(GRAMMAR));
    });

    await waitFor(() => expect(savedCourse()).toBe(""));
  });
});
