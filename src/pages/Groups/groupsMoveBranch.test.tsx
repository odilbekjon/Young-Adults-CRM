import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseApi } from "../../app/api/baseApi";
import { store } from "../../app/store";
import { setToken } from "../../app/store/authSlice";
import { setSelectedBranchId } from "../../app/store/branchSlice";
import { readFormData, stubFetch, type SentRequest } from "../../test/fetchStub";
import {
  answerWith, BRANCHES, CEO_ME, field, GRAMMAR, GRAMMAR_GROUP, GRAMMAR_GROUP_WITH_ROOM, IELTS, NEW_BRANCH,
  openSelect, optionTexts, path, pickOption, renderGroups, staffMe, submit,
} from "./groupsTestKit";

// Each test renders the whole page (MUI table, drawer, selects) - slow enough to
// brush the default 5 s when the suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });

const [ieltsBranch, grammarBranch] = BRANCHES;

// The case from the owner: a Grammar group that landed in Grammar Campus. Staff
// open it there and send it back to the IELTS Campus.
beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
  store.dispatch(setToken(null));
  store.dispatch(setSelectedBranchId(GRAMMAR));
});

const signIn = (me: unknown, groups: unknown[] = [GRAMMAR_GROUP]) => {
  store.dispatch(setToken("test-token"));
  return stubFetch(answerWith(groups, me));
};

const openEdit = async (groupName = "Grammar Evening") => {
  const row = (await screen.findByText(groupName)).closest("tr")!;
  fireEvent.click(within(row).getByRole("button"));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));
  await screen.findByText("Edit Group");
};

const branchOptions = async () => {
  openSelect("branchId");
  await waitFor(() => expect(optionTexts().length).toBeGreaterThan(0));
  return optionTexts();
};

const patches = (requests: SentRequest[]) => requests.filter((r) => r.method === "PATCH");

describe("Groups edit form: the Branch select", () => {
  it("is not shown to a user who works in a single branch", async () => {
    const { requests } = signIn(staffMe(grammarBranch));
    renderGroups();

    await openEdit();
    // let the account and the branches arrive
    await waitFor(() => expect(requests.some((r) => path(r).startsWith("/auth/me"))).toBe(true));
    await waitFor(() => expect(field("courseId").value).toBe("c-grammar"));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(field("branchId")).toBeNull();
  });

  it("is not shown on the Add form", async () => {
    signIn(CEO_ME);
    renderGroups();

    fireEvent.click(await screen.findByRole("button", { name: "Add New" }));
    await screen.findByText("Add New Group");

    expect(field("branchId")).toBeNull();
  });

  it("starts on the group's own branch and offers every active branch to a CEO", async () => {
    signIn(CEO_ME);
    renderGroups();
    await openEdit();

    await waitFor(() => expect(field("branchId")).not.toBeNull());
    expect(field("branchId").value).toBe(GRAMMAR);

    // not the closed branch, not "All branches"
    expect(await branchOptions()).toEqual(["YA IELTS Campus", "Grammar Campus", "New Campus"]);
  });

  it("offers a staff member only the branches of their own account", async () => {
    // New Campus exists but is not theirs
    signIn(staffMe(ieltsBranch, grammarBranch));
    renderGroups();
    await openEdit();

    await waitFor(() => expect(field("branchId")).not.toBeNull());

    expect(await branchOptions()).toEqual(["YA IELTS Campus", "Grammar Campus"]);
  });
});

describe("Groups edit form: moving a group to another branch", () => {
  // Opens the group's edit form and points its Branch select at the IELTS Campus.
  const moveToIelts = async () => {
    await openEdit();
    await pickIelts();
  };
  const pickIelts = async () => {
    await waitFor(() => expect(field("branchId")).not.toBeNull());
    await waitFor(() => expect(field("courseId").value).toBe("c-grammar"));
    openSelect("branchId");
    await waitFor(() => expect(optionTexts()).toContain("YA IELTS Campus"));
    pickOption("YA IELTS Campus");
  };

  it("lists only the target branch's courses, empties course and room, and says the group will move", async () => {
    signIn(CEO_ME, [GRAMMAR_GROUP_WITH_ROOM]);
    renderGroups();
    await openEdit();
    await waitFor(() => expect(field("roomId").value).toBe("r-grammar"));
    expect(screen.queryByText("This group will be moved to YA IELTS Campus. Pick a course of that branch.")).toBeNull();

    await pickIelts();

    expect(field("branchId").value).toBe(IELTS);
    expect(field("courseId").value).toBe("");
    expect(field("roomId").value).toBe("");
    expect(screen.getByText("This group will be moved to YA IELTS Campus. Pick a course of that branch.")).toBeTruthy();

    openSelect("courseId");
    await waitFor(() => expect(optionTexts()).toEqual(["IELTS Intensive"]));
    pickOption("IELTS Intensive");
    openSelect("roomId");
    await waitFor(() => expect(optionTexts()).toEqual(["—", "Room A"]));
  });

  it("will not save until a course of the target branch is picked", async () => {
    const { requests } = signIn(CEO_ME);
    renderGroups();
    await moveToIelts();

    submit();

    expect(await screen.findByText("Course is required")).toBeTruthy();
    expect(patches(requests)).toHaveLength(0);
  });

  it("saves the new course and tells which branch the group moved to", async () => {
    const { requests } = signIn(CEO_ME, [GRAMMAR_GROUP_WITH_ROOM]);
    renderGroups();
    await moveToIelts();
    openSelect("courseId");
    await waitFor(() => expect(optionTexts()).toEqual(["IELTS Intensive"]));
    pickOption("IELTS Intensive");

    submit();

    await waitFor(() => expect(patches(requests)).toHaveLength(1));
    const [request] = patches(requests);
    expect(path(request)).toBe("/groups/g-grammar");
    const body = await readFormData(request);
    expect(body).toContainEqual(["courseId", "c-ielts"]);
    // no room is sent: the old one belongs to Grammar Campus
    expect(body.map(([name]) => name)).not.toContain("roomId");
    // the move is the courseId alone: the request keeps the header's branch (the
    // group's current one), it does not name the target
    expect(request.headers.get("x-branch-id")).toBe(GRAMMAR);
    expect(body.map(([name]) => name)).not.toContain("branchId");
    expect(await screen.findByText("Group moved to YA IELTS Campus")).toBeTruthy();
  });

  it("does not touch the group's teachers, even those missing from the branch's teacher list", async () => {
    const { requests } = signIn(CEO_ME, [GRAMMAR_GROUP_WITH_ROOM]);
    renderGroups();
    await moveToIelts();

    // the group's own teacher is still shown and selectable
    expect(within(document.querySelector<HTMLElement>(".MuiDrawer-paper")!).getByText("Olim")).toBeTruthy();
    openSelect("courseId");
    await waitFor(() => expect(optionTexts()).toEqual(["IELTS Intensive"]));
    pickOption("IELTS Intensive");
    submit();

    await waitFor(() => expect(patches(requests)).toHaveLength(1));
    expect(await readFormData(patches(requests)[0])).toContainEqual(["teacherIds[]", "t-own"]);
  });

  it("gives the group's own course and room back when the branch is switched back", async () => {
    signIn(CEO_ME, [GRAMMAR_GROUP_WITH_ROOM]);
    renderGroups();
    await moveToIelts();
    expect(field("courseId").value).toBe("");

    openSelect("branchId");
    await waitFor(() => expect(optionTexts()).toContain("Grammar Campus"));
    pickOption("Grammar Campus");

    expect(field("branchId").value).toBe(GRAMMAR);
    expect(field("courseId").value).toBe("c-grammar");
    expect(field("roomId").value).toBe("r-grammar");
    expect(screen.queryByText("This group will be moved to YA IELTS Campus. Pick a course of that branch.")).toBeNull();
    openSelect("courseId");
    await waitFor(() => expect(optionTexts()).toEqual(["Grammar Basic"]));
  });

  it("says what to do first when the target branch has no active course", async () => {
    const { requests } = signIn(CEO_ME);
    renderGroups();
    await openEdit();
    await waitFor(() => expect(field("branchId")).not.toBeNull());
    await waitFor(() => expect(field("courseId").value).toBe("c-grammar"));

    openSelect("branchId");
    await waitFor(() => expect(optionTexts()).toContain("New Campus"));
    pickOption("New Campus");

    expect(field("branchId").value).toBe(NEW_BRANCH);
    expect(
      await screen.findByText(
        "New Campus has no active courses yet. Create one first: Settings → Courses → ADD NEW, and choose New Campus in the Branch field.",
      ),
    ).toBeTruthy();
    openSelect("courseId");
    await waitFor(() => expect(optionTexts()).toEqual(["No active courses in this branch"]));
    expect(patches(requests)).toHaveLength(0);
  });

  it("an ordinary edit (branch untouched) still saves as an update of the same branch", async () => {
    const { requests } = signIn(CEO_ME);
    renderGroups();
    await openEdit();
    await waitFor(() => expect(field("courseId").value).toBe("c-grammar"));
    await waitFor(() => expect(field("branchId")).not.toBeNull());

    fireEvent.change(field("name"), { target: { value: "Grammar Morning" } });
    submit();

    await waitFor(() => expect(patches(requests)).toHaveLength(1));
    expect(await readFormData(patches(requests)[0])).toContainEqual(["courseId", "c-grammar"]);
    expect(await screen.findByText("Group updated successfully")).toBeTruthy();
  });
});
