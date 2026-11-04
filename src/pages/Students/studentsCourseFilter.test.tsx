import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL, baseApi } from "../../app/api/baseApi";
import { store } from "../../app/store";
import { setSelectedBranchId } from "../../app/store/branchSlice";
import { BranchProvider } from "../../Context/BranchContext";
import { DataProvider } from "../../Context/DataContext";
import { ToastProvider } from "../../Context/ToastContext";
import { jsonResponse, stubFetch, type SentRequest } from "../../test/fetchStub";
import { renderWithStore } from "../../test/renderWithStore";
import { Students } from "./Students";

// Each test renders the whole page - slow enough to brush the default 5 s when
// the suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });

const IELTS = "b-ielts";
const GRAMMAR = "b-grammar";
const FILTERS_KEY = "ya-crm:state:students:filters";

const path = (request: SentRequest) => request.url.replace(API_BASE_URL, "");

// GET /courses/select answers for the branch it is asked for ("all" = every one).
const COURSES = [
  { id: "c-ielts", name: "IELTS Intensive", branchId: IELTS },
  { id: "c-grammar", name: "Grammar Basic", branchId: GRAMMAR },
];

const backend = (request: SentRequest) => {
  const p = path(request);
  if (request.method === "GET" && p.startsWith("/courses/select")) {
    const named = new URL(request.url).searchParams.get("branchId");
    const own = named && named !== "all" ? COURSES.filter((c) => c.branchId === named) : COURSES;
    return jsonResponse({ success: true, data: own.map(({ id, name }) => ({ id, name })) });
  }
  return jsonResponse({ success: true, data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } });
};

const renderStudents = () =>
  renderWithStore(
    <MemoryRouter>
      <DataProvider>
        <BranchProvider>
          <ToastProvider>
            <Students />
          </ToastProvider>
        </BranchProvider>
      </DataProvider>
    </MemoryRouter>,
  );

const savedCourse = () => (JSON.parse(sessionStorage.getItem(FILTERS_KEY) ?? "{}") as { course?: string }).course;
const saveCourse = (course: string) => sessionStorage.setItem(FILTERS_KEY, JSON.stringify({ course }));
const openCourseFilter = async () => fireEvent.click(await screen.findByTitle(/By Courses|IELTS Intensive|Grammar Basic/));
const menuTexts = () => screen.queryAllByRole("menuitem").map((item) => item.textContent);

beforeEach(() => {
  sessionStorage.clear();
  store.dispatch(baseApi.util.resetApiState());
  store.dispatch(setSelectedBranchId(null));
});

describe("Students: the course filter follows the header's branch", () => {
  it("offers only the courses of the branch picked in the header, and asks for that branch", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    const { requests } = stubFetch(backend);
    renderStudents();

    await openCourseFilter();

    await waitFor(() => expect(menuTexts()).toEqual(["IELTS Intensive"]));
    expect(requests.some((r) => path(r) === `/courses/select?branchId=${IELTS}`)).toBe(true);
  });

  it("offers every branch's courses on 'All branches'", async () => {
    stubFetch(backend);
    renderStudents();

    await openCourseFilter();

    await waitFor(() => expect(menuTexts()).toEqual(["IELTS Intensive", "Grammar Basic"]));
  });

  it("drops a saved course filter of another branch, so it does not narrow the table to nothing", async () => {
    saveCourse("c-grammar");
    store.dispatch(setSelectedBranchId(IELTS));
    const { requests } = stubFetch(backend);
    renderStudents();

    await waitFor(() => expect(savedCourse()).toBe(""));
    // the students list is asked again without the foreign course
    await waitFor(() => {
      const lists = requests.filter((r) => r.method === "GET" && /^\/students\?/.test(path(r)));
      expect(lists.length).toBeGreaterThan(0);
      expect(path(lists[lists.length - 1])).not.toContain("courseId");
    });
  });

  it("keeps a saved course filter that belongs to the branch", async () => {
    saveCourse("c-ielts");
    store.dispatch(setSelectedBranchId(IELTS));
    const { requests } = stubFetch(backend);
    renderStudents();
    await waitFor(() => expect(requests.some((r) => path(r).startsWith("/courses/select"))).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(savedCourse()).toBe("c-ielts");
  });

  it("drops the picked course when the branch changes, and offers the new branch's courses", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    stubFetch(backend);
    renderStudents();
    await openCourseFilter();
    await waitFor(() => expect(menuTexts()).toEqual(["IELTS Intensive"]));
    fireEvent.click(screen.getByRole("menuitem", { name: "IELTS Intensive" }));
    await waitFor(() => expect(savedCourse()).toBe("c-ielts"));

    act(() => {
      store.dispatch(setSelectedBranchId(GRAMMAR));
    });

    await waitFor(() => expect(savedCourse()).toBe(""));
    await openCourseFilter();
    await waitFor(() => expect(menuTexts()).toEqual(["Grammar Basic"]));
  });
});
