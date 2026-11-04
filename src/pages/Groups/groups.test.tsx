import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseApi } from "../../app/api/baseApi";
import { store } from "../../app/store";
import { setSelectedBranchId } from "../../app/store/branchSlice";
import { readFormData, stubFetch } from "../../test/fetchStub";
import {
  answerWith, field, GRAMMAR, GRAMMAR_GROUP, IELTS, openAddDrawer, openSelect, optionTexts, pickOption,
  posts, renderGroups, submit,
} from "./groupsTestKit";

// Each test renders the whole page (MUI table, drawer, selects) - slow enough to
// brush the default 5 s when the suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });

const NOTICE = "The group will be created in the branch of this course: Grammar Campus";

beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
  store.dispatch(setSelectedBranchId(null));
});

describe("Groups form: the course follows the branch", () => {
  it("offers only the active courses of the branch selected in the header", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    stubFetch(answerWith());
    renderGroups();
    await openAddDrawer();

    openSelect("courseId");

    // not the Grammar Campus course, not the archived IELTS one
    await waitFor(() => expect(optionTexts()).toEqual(["IELTS Intensive"]));
  });

  it("offers the other branch's courses when that branch is selected", async () => {
    store.dispatch(setSelectedBranchId(GRAMMAR));
    stubFetch(answerWith());
    renderGroups();
    await openAddDrawer();

    openSelect("courseId");

    await waitFor(() => expect(optionTexts()).toEqual(["Grammar Basic"]));
  });

  it("says so when the branch has no active course", async () => {
    store.dispatch(setSelectedBranchId("b-empty"));
    stubFetch(answerWith());
    renderGroups();
    await openAddDrawer();

    openSelect("courseId");

    await waitFor(() => expect(optionTexts()).toEqual(["No active courses in this branch"]));
  });

  it("on All branches lists every active course with its branch, and names the branch once one is picked", async () => {
    stubFetch(answerWith());
    renderGroups();
    await openAddDrawer();

    openSelect("courseId");
    await waitFor(() =>
      expect(optionTexts()).toEqual(["IELTS Intensive — YA IELTS Campus", "Grammar Basic — Grammar Campus"]),
    );
    expect(screen.queryByText(NOTICE)).toBeNull();

    pickOption("Grammar Basic — Grammar Campus");

    expect(await screen.findByText(NOTICE)).toBeTruthy();
  });

  it("only offers the rooms of the branch", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    stubFetch(answerWith());
    renderGroups();
    await openAddDrawer();

    openSelect("roomId");

    await waitFor(() => expect(optionTexts()).toEqual(["—", "Room A"]));
  });

  it("on All branches narrows the rooms to the picked course's branch and drops a room of another one", async () => {
    stubFetch(answerWith());
    renderGroups();
    await openAddDrawer();

    // before a course is picked every room is offered, told apart by branch
    openSelect("roomId");
    await waitFor(() => expect(optionTexts()).toEqual(["—", "Room A — YA IELTS Campus", "Room B — Grammar Campus"]));
    pickOption("Room A — YA IELTS Campus");
    expect(field("roomId").value).toBe("r-ielts");

    openSelect("courseId");
    await waitFor(() => expect(optionTexts()).toHaveLength(2));
    pickOption("Grammar Basic — Grammar Campus");

    // the IELTS room does not fit a Grammar Campus group
    await waitFor(() => expect(field("roomId").value).toBe(""));
    openSelect("roomId");
    await waitFor(() => expect(optionTexts()).toEqual(["—", "Room B"]));
  });

  it("empties a course picked earlier when the branch changes under the open form", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    stubFetch(answerWith());
    renderGroups();
    await openAddDrawer();
    openSelect("courseId");
    await waitFor(() => expect(optionTexts()).toEqual(["IELTS Intensive"]));
    pickOption("IELTS Intensive");
    expect(field("courseId").value).toBe("c-ielts");

    act(() => {
      store.dispatch(setSelectedBranchId(GRAMMAR));
    });

    await waitFor(() => expect(field("courseId").value).toBe(""));
  });

  it("starts a new form without the course picked in the previous one", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    stubFetch(answerWith());
    renderGroups();
    await openAddDrawer();
    openSelect("courseId");
    await waitFor(() => expect(optionTexts()).toEqual(["IELTS Intensive"]));
    pickOption("IELTS Intensive");
    expect(field("courseId").value).toBe("c-ielts");

    fireEvent.keyDown(screen.getByText("Add New Group"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("Add New Group")).toBeNull());
    await openAddDrawer();

    expect(field("courseId").value).toBe("");
  });
});

describe("Groups form: creating", () => {
  const fillAndPick = async (course: string) => {
    fireEvent.change(field("name"), { target: { value: "Morning" } });
    openSelect("courseId");
    await waitFor(() => expect(optionTexts()).toContain(course));
    pickOption(course);
  };

  it("names the selected branch in the request's x-branch-id and keeps it out of the body", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    const { requests } = stubFetch(answerWith());
    renderGroups();
    await openAddDrawer();

    await fillAndPick("IELTS Intensive");
    submit();

    await waitFor(() => expect(posts(requests)).toHaveLength(1));
    const [request] = posts(requests);
    expect(request.headers.get("x-branch-id")).toBe(IELTS);
    expect(await readFormData(request)).toEqual([
      ["name", "Morning"],
      ["courseId", "c-ielts"],
    ]);
  });

  it("on All branches sends the picked course's branch", async () => {
    const { requests } = stubFetch(answerWith());
    renderGroups();
    await openAddDrawer();

    await fillAndPick("Grammar Basic — Grammar Campus");
    submit();

    await waitFor(() => expect(posts(requests)).toHaveLength(1));
    expect(posts(requests)[0].headers.get("x-branch-id")).toBe(GRAMMAR);
  });

  it("still asks for a course", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    const { requests } = stubFetch(answerWith());
    renderGroups();
    await openAddDrawer();

    fireEvent.change(field("name"), { target: { value: "Morning" } });
    submit();

    expect(await screen.findByText("Course is required")).toBeTruthy();
    expect(posts(requests)).toHaveLength(0);
  });
});

describe("Groups form: editing", () => {
  const openEdit = async (groupName: string) => {
    const row = (await screen.findByText(groupName)).closest("tr")!;
    fireEvent.click(within(row).getByRole("button"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));
    await screen.findByText("Edit Group");
  };

  it("keeps the group in its own branch: its course is selected and only that branch's courses are offered", async () => {
    // the header says IELTS, the group is a Grammar Campus one
    store.dispatch(setSelectedBranchId(IELTS));
    stubFetch(answerWith([GRAMMAR_GROUP]));
    renderGroups();

    await openEdit("Grammar Evening");

    expect(field("courseId").value).toBe("c-grammar");
    openSelect("courseId");
    await waitFor(() => expect(optionTexts()).toEqual(["Grammar Basic"]));
  });

  it("does not empty the group's course when the header's branch differs from it", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    stubFetch(answerWith([GRAMMAR_GROUP]));
    renderGroups();
    await openEdit("Grammar Evening");
    await waitFor(() => expect(field("courseId").value).toBe("c-grammar"));

    // let the courses and rooms arrive and the form settle
    openSelect("courseId");
    await waitFor(() => expect(optionTexts()).toEqual(["Grammar Basic"]));

    expect(field("courseId").value).toBe("c-grammar");
  });
});
