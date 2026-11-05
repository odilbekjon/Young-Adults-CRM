import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseApi } from "../../app/api/baseApi";
import { store } from "../../app/store";
import { setSelectedBranchId } from "../../app/store/branchSlice";
import { stubFetch } from "../../test/fetchStub";
import {
  answerWith, GRAMMAR, GRAMMAR_GROUP, IELTS, IELTS_GROUP, openAddDrawer, openSelect, optionTexts, path, renderGroups,
} from "./groupsTestKit";

// Each test renders the whole page (MUI table, drawer, selects) - slow enough to
// brush the default 5 s when the suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });

const FILTERS_KEY = "ya-crm:state:groups:filters";
const GROUPS = [IELTS_GROUP, GRAMMAR_GROUP];

const savedFilters = () => JSON.parse(sessionStorage.getItem(FILTERS_KEY) ?? "{}") as { course?: string };
const saveFilters = (course: string) =>
  sessionStorage.setItem(
    FILTERS_KEY,
    JSON.stringify({ status: "ACTIVE", teacher: [], course, days: "", tags: [], startDate: "", endDate: "" }),
  );

const openCourseFilter = () => fireEvent.click(screen.getByRole("button", { name: "Courses" }));
const menuTexts = () => screen.queryAllByRole("menuitem").map((item) => item.textContent);
const groupShown = (name: string) => screen.queryAllByText(name).length > 0;

beforeEach(() => {
  sessionStorage.clear();
  store.dispatch(baseApi.util.resetApiState());
  store.dispatch(setSelectedBranchId(null));
});

describe("Groups: the Courses filter follows the header's branch", () => {
  it("offers only the courses of the branch picked in the header, and asks for that branch", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    const { requests } = stubFetch(answerWith(GROUPS));
    renderGroups();
    await screen.findByText("IELTS Morning");

    openCourseFilter();

    await waitFor(() => expect(menuTexts()).toEqual(["IELTS Intensive"]));
    expect(requests.some((r) => path(r) === `/courses/select?branchId=${IELTS}`)).toBe(true);
  });

  it("offers the courses of every branch on 'All branches'", async () => {
    const { requests } = stubFetch(answerWith(GROUPS));
    renderGroups();
    await screen.findByText("IELTS Morning");

    openCourseFilter();

    await waitFor(() => expect(menuTexts()).toEqual(["IELTS Intensive", "Grammar Basic"]));
    expect(requests.some((r) => path(r) === "/courses/select?branchId=all")).toBe(true);
  });

  it("drops a saved course filter of another branch instead of narrowing the table to nothing", async () => {
    saveFilters("c-grammar");
    store.dispatch(setSelectedBranchId(IELTS));
    stubFetch(answerWith(GROUPS));
    renderGroups();

    // the stale filter is gone and every group is listed again
    await waitFor(() => expect(savedFilters().course).toBe(""));
    expect(groupShown("IELTS Morning")).toBe(true);
    expect(groupShown("Grammar Evening")).toBe(true);
  });

  it("keeps a saved course filter that belongs to the branch", async () => {
    saveFilters("c-ielts");
    store.dispatch(setSelectedBranchId(IELTS));
    const { requests } = stubFetch(answerWith(GROUPS));
    renderGroups();
    await waitFor(() => expect(requests.some((r) => path(r).startsWith("/courses/select"))).toBe(true));
    await screen.findByText("IELTS Morning");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(savedFilters().course).toBe("c-ielts");
    expect(groupShown("Grammar Evening")).toBe(false);
  });

  it("drops a picked course as soon as the branch changes, and then offers the new branch's courses", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    stubFetch(answerWith(GROUPS));
    renderGroups();
    await screen.findByText("IELTS Morning");
    openCourseFilter();
    await waitFor(() => expect(menuTexts()).toEqual(["IELTS Intensive"]));
    fireEvent.click(screen.getByRole("menuitem", { name: "IELTS Intensive" }));
    await waitFor(() => expect(savedFilters().course).toBe("c-ielts"));

    act(() => {
      store.dispatch(setSelectedBranchId(GRAMMAR));
    });

    await waitFor(() => expect(savedFilters().course).toBe(""));
    await waitFor(() => expect(groupShown("Grammar Evening")).toBe(true));
    // reopen the filter: Grammar's own courses
    await waitFor(() => expect(screen.getByRole("button", { name: "Courses" })).toBeTruthy());
    openCourseFilter();
    await waitFor(() => expect(menuTexts()).toEqual(["Grammar Basic"]));
  });
});

describe("Groups form: the course request names the branch the form works in", () => {
  it("asks for the header's branch - in the query and in x-branch-id - and never for every branch at once", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    const { requests } = stubFetch(answerWith(GROUPS));
    renderGroups();
    await screen.findByText("IELTS Morning");

    await openAddDrawer();
    openSelect("courseId");
    await waitFor(() => expect(optionTexts()).toEqual(["IELTS Intensive"]));

    const reads = requests.filter((r) => path(r).startsWith("/courses") && !path(r).startsWith("/courses/select"));
    expect(reads.map(path)).toEqual([`/courses?branchId=${IELTS}`]);
    expect(reads[0].headers.get("x-branch-id")).toBe(IELTS);
    // "all" is something only a CEO may be allowed to ask for
    expect(requests.some((r) => r.headers.get("x-branch-id") === "all")).toBe(false);
  });
});
