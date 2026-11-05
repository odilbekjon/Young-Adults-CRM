import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseApi } from "../../app/api/baseApi";
import { store } from "../../app/store";
import { setToken } from "../../app/store/authSlice";
import { setSelectedBranchId } from "../../app/store/branchSlice";
import { jsonResponse, stubFetch, type FetchHandler, type SentRequest } from "../../test/fetchStub";
import {
  answerWith, BRANCHES, CEO_ME, field, GRAMMAR, IELTS, openAddDrawer, openSelect, optionTexts, path, pickOption,
  renderGroups, staffMe,
} from "./groupsTestKit";

// Each test renders the whole page (MUI table, drawer, selects) - slow enough to
// brush the default 5 s when the suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });

const [ieltsBranch, grammarBranch] = BRANCHES;

// The course picker of the Add form must list courses for every role that can
// create a group: the CEO, a branch director (an ADMIN with branches of their
// own) and a plain admin. It asks for the branch the group will belong to.
beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
  store.dispatch(setToken(null));
  store.dispatch(setSelectedBranchId(null));
});

const isCourseList = (request: SentRequest) => path(request).startsWith("/courses") && !path(request).startsWith("/courses/select");
const courseReads = (requests: SentRequest[]) => requests.filter(isCourseList);
const asksForAll = (requests: SentRequest[]) => requests.some((r) => r.headers.get("x-branch-id") === "all");

// An account that, like a branch director or an admin, may not ask for every
// branch at once: "x-branch-id: all" is refused.
const refusingAllBranches = (inner: FetchHandler): FetchHandler => (request) =>
  request.headers.get("x-branch-id") === "all"
    ? jsonResponse({ success: false, error: ["Forbidden"], statusCode: 403 }, { status: 403 })
    : inner(request);

const signIn = (me: unknown, wrap: (inner: FetchHandler) => FetchHandler = (inner) => inner) => {
  store.dispatch(setToken("test-token"));
  return stubFetch(wrap(answerWith([], me)));
};

describe("Groups Add form: a CEO", () => {
  it("on All branches is offered every active course, each with its branch, asked for with no branch named", async () => {
    const { requests } = signIn(CEO_ME);
    renderGroups();
    await openAddDrawer();

    openSelect("courseId");

    await waitFor(() =>
      expect(optionTexts()).toEqual(["IELTS Intensive — YA IELTS Campus", "Grammar Basic — Grammar Campus"]),
    );
    const [read] = courseReads(requests);
    expect(path(read)).toBe("/courses");
    expect(read.headers.has("x-branch-id")).toBe(false);
  });

  it("is offered that branch's courses once a branch is picked, and the earlier course pick is dropped", async () => {
    const { requests } = signIn(CEO_ME);
    renderGroups();
    await openAddDrawer();
    openSelect("courseId");
    await waitFor(() => expect(optionTexts()).toHaveLength(2));
    pickOption("IELTS Intensive — YA IELTS Campus");
    expect(field("courseId").value).toBe("c-ielts");

    // the CEO picks the Grammar Campus in the branch picker while the form is open
    act(() => {
      store.dispatch(setSelectedBranchId(GRAMMAR));
    });

    await waitFor(() => expect(field("courseId").value).toBe(""));
    openSelect("courseId");
    await waitFor(() => expect(optionTexts()).toEqual(["Grammar Basic"]));
    const grammarRead = courseReads(requests).find((r) => path(r) === `/courses?branchId=${GRAMMAR}`)!;
    expect(grammarRead).toBeTruthy();
    expect(grammarRead.headers.get("x-branch-id")).toBe(GRAMMAR);
  });

  it("is not left with an empty list when the header is on a branch and the account may not read 'all'", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    const { requests } = signIn(CEO_ME, refusingAllBranches);
    renderGroups();
    await openAddDrawer();

    openSelect("courseId");

    await waitFor(() => expect(optionTexts()).toEqual(["IELTS Intensive"]));
    expect(asksForAll(requests)).toBe(false);
  });
});

describe("Groups Add form: a branch director or an admin", () => {
  it("scoped to one branch is offered that branch's courses, whether or not 'all' would be refused", async () => {
    store.dispatch(setSelectedBranchId(GRAMMAR));
    const { requests } = signIn(staffMe(grammarBranch), refusingAllBranches);
    renderGroups();
    await openAddDrawer();

    openSelect("courseId");

    await waitFor(() => expect(optionTexts()).toEqual(["Grammar Basic"]));
    const reads = courseReads(requests);
    expect(reads.map(path)).toEqual([`/courses?branchId=${GRAMMAR}`]);
    expect(reads[0].headers.get("x-branch-id")).toBe(GRAMMAR);
    expect(asksForAll(requests)).toBe(false);
  });

  it("with a single branch still gets its courses before the header's selection has settled", async () => {
    // a fresh login: the header has not picked the account's branch yet
    const { requests } = signIn(staffMe(grammarBranch), refusingAllBranches);
    renderGroups();
    await openAddDrawer();

    openSelect("courseId");

    await waitFor(() => expect(optionTexts()).toEqual(["Grammar Basic"]));
    expect(courseReads(requests).map(path)).toContain(`/courses?branchId=${GRAMMAR}`);
    expect(asksForAll(requests)).toBe(false);
  });

  it("with several branches and none selected yet is not shown an empty list: the account's own scope decides", async () => {
    const { requests } = signIn(staffMe(ieltsBranch, grammarBranch), refusingAllBranches);
    renderGroups();
    await openAddDrawer();

    openSelect("courseId");

    await waitFor(() =>
      expect(optionTexts()).toEqual(["IELTS Intensive — YA IELTS Campus", "Grammar Basic — Grammar Campus"]),
    );
    expect(courseReads(requests).every((r) => !r.headers.has("x-branch-id"))).toBe(true);
  });

  it("refetches the courses when the branch changes under the open form", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    const { requests } = signIn(staffMe(ieltsBranch, grammarBranch), refusingAllBranches);
    renderGroups();
    await openAddDrawer();
    openSelect("courseId");
    await waitFor(() => expect(optionTexts()).toEqual(["IELTS Intensive"]));
    pickOption("IELTS Intensive");

    act(() => {
      store.dispatch(setSelectedBranchId(GRAMMAR));
    });

    await waitFor(() => expect(field("courseId").value).toBe(""));
    openSelect("courseId");
    await waitFor(() => expect(optionTexts()).toEqual(["Grammar Basic"]));
    expect(courseReads(requests).map(path)).toEqual([`/courses?branchId=${IELTS}`, `/courses?branchId=${GRAMMAR}`]);
    expect(asksForAll(requests)).toBe(false);
  });
});

describe("Groups Add form: when the courses cannot be read", () => {
  it("says so instead of claiming the branch has no courses", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    signIn(CEO_ME, (inner) => (request) =>
      isCourseList(request) ? jsonResponse({ success: false, statusCode: 500 }, { status: 500 }) : inner(request),
    );
    renderGroups();
    await openAddDrawer();

    openSelect("courseId");

    await waitFor(() =>
      expect(optionTexts()).toEqual(["Courses could not be loaded. Close and reopen the form to try again."]),
    );
  });
});
