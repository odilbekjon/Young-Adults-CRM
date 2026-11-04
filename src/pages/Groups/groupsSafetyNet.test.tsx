import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseApi } from "../../app/api/baseApi";
import { store } from "../../app/store";
import { setSelectedBranchId } from "../../app/store/branchSlice";
import { stubFetch } from "../../test/fetchStub";
import {
  answerWith, field, GRAMMAR, IELTS, openAddDrawer, openSelect, optionTexts, pickOption, posts, renderGroups, submit,
} from "./groupsTestKit";

// The form empties a course that stops fitting the branch (see groups.test.tsx),
// so a course of another branch can never reach Submit through the screen. That
// housekeeping is switched off here to prove the last line of defence: whatever
// is left in the form, a course of another branch is not sent.
vi.mock("../../utils/groupBranch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../utils/groupBranch")>()),
  clearStaleBranchChoices: (choice: { courseId: string; roomId: string }) => choice,
}));

vi.setConfig({ testTimeout: 20_000 });

beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
  store.dispatch(setSelectedBranchId(null));
});

describe("Groups form: submit safety net", () => {
  it("sends nothing and says why when the course belongs to another branch than the group's", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    const { requests } = stubFetch(answerWith());
    renderGroups();
    await openAddDrawer();
    fireEvent.change(field("name"), { target: { value: "Morning" } });
    openSelect("courseId");
    await waitFor(() => expect(optionTexts()).toEqual(["IELTS Intensive"]));
    pickOption("IELTS Intensive");

    // the group is now being created in Grammar Campus, but the course stayed
    act(() => {
      store.dispatch(setSelectedBranchId(GRAMMAR));
    });
    await waitFor(() => expect(field("courseId").value).toBe("c-ielts"));
    submit();

    expect(
      await screen.findByText(
        "This course belongs to another branch (YA IELTS Campus), so the group would end up there. Pick a course of Grammar Campus.",
      ),
    ).toBeTruthy();
    expect(posts(requests)).toHaveLength(0);
  });

  it("sends nothing when the room belongs to another branch than the group's", async () => {
    store.dispatch(setSelectedBranchId(IELTS));
    const { requests } = stubFetch(answerWith());
    renderGroups();
    await openAddDrawer();
    fireEvent.change(field("name"), { target: { value: "Morning" } });
    openSelect("courseId");
    await waitFor(() => expect(optionTexts()).toEqual(["IELTS Intensive"]));
    pickOption("IELTS Intensive");
    openSelect("roomId");
    await waitFor(() => expect(optionTexts()).toEqual(["—", "Room A"]));
    pickOption("Room A");

    // the room list is refetched for another branch and the old pick is left behind
    act(() => {
      store.dispatch(setSelectedBranchId(GRAMMAR));
    });
    // (the course is of the old branch too, so move the course check out of the way)
    openSelect("courseId");
    await waitFor(() => expect(optionTexts()).toEqual(["Grammar Basic"]));
    pickOption("Grammar Basic");
    submit();

    expect(await screen.findByText("This room belongs to another branch. Pick a room of Grammar Campus.")).toBeTruthy();
    expect(posts(requests)).toHaveLength(0);
  });
});
