import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, stubFetch } from "../../../test/fetchStub";
import { renderWithStore } from "../../../test/renderWithStore";
import { EditGroupDrawer } from "./EditGroupDrawer";

const IELTS = "b-ielts";
const GRAMMAR = "b-grammar";
const NEW_BRANCH = "b-new";

const ieltsBranch = { id: IELTS, name: "YA IELTS Campus" };
const grammarBranch = { id: GRAMMAR, name: "Grammar Campus" };
const newBranch = { id: NEW_BRANCH, name: "New Campus" };

const courses = [
  { id: "c-ielts", name: "IELTS Intensive", months: 3, branchId: IELTS },
  { id: "c-grammar", name: "Grammar Basic", months: 2, branchId: GRAMMAR },
  { id: "c-grammar-2", name: "Grammar Advanced", months: 4, branchId: GRAMMAR },
];
const rooms = [
  { id: "r-ielts", name: "Room A", branchId: IELTS },
  { id: "r-grammar", name: "Room B", branchId: GRAMMAR },
];

// A Grammar Campus group (its course is Grammar Basic), in room B.
const group = {
  id: "g1",
  name: "Grammar Evening",
  courseId: "c-grammar",
  courseName: "Grammar Basic",
  coursePrice: { s: 1, e: 0, d: [100000] },
  daysType: "ODD",
  days: [],
  time: null,
  roomId: "r-grammar",
  roomName: "Room B",
  roomCapacity: 10,
  trainingStart: null,
  trainingEnd: null,
  teachers: [],
};

const onSave = vi.fn();

const renderDrawer = (props: Partial<Parameters<typeof EditGroupDrawer>[0]> = {}) => {
  stubFetch(() => jsonResponse({ success: true, data: [] }));
  return renderWithStore(
    <EditGroupDrawer
      group={group}
      open
      onClose={() => {}}
      courses={courses}
      rooms={rooms}
      teachers={[]}
      groupBranch={grammarBranch}
      branches={[ieltsBranch, grammarBranch]}
      onSave={onSave}
      isSaving={false}
      {...props}
    />,
  );
};

// The native <select> of a labelled field.
const selectOf = (label: string) => {
  const labelEl = screen.getAllByText(label).find((el) => el.tagName === "LABEL")!;
  return labelEl.parentElement!.querySelector("select") as HTMLSelectElement;
};
const optionTexts = (select: HTMLSelectElement) => Array.from(select.options).map((o) => o.textContent);
const save = () => fireEvent.click(screen.getByRole("button", { name: "Save" }));

beforeEach(() => {
  onSave.mockReset();
});

describe("EditGroupDrawer: the Branch select", () => {
  it("is not rendered when the user works in a single branch", () => {
    renderDrawer({ branches: [grammarBranch] });

    expect(screen.queryByText("Branch")).toBeNull();
  });

  it("starts on the group's own branch and lists the user's branches", () => {
    renderDrawer({ branches: [ieltsBranch, grammarBranch, newBranch] });

    const branch = selectOf("Branch");
    expect(branch.value).toBe(GRAMMAR);
    expect(optionTexts(branch)).toEqual(["Branch", "YA IELTS Campus", "Grammar Campus", "New Campus"]);
  });

  it("shows the group's own branch even when it is not among the user's", () => {
    renderDrawer({ branches: [ieltsBranch, newBranch] });

    expect(optionTexts(selectOf("Branch"))).toEqual(["Branch", "YA IELTS Campus", "New Campus", "Grammar Campus"]);
    expect(selectOf("Branch").value).toBe(GRAMMAR);
  });

  it("offers only the group's branch's courses and rooms until the branch is changed", () => {
    renderDrawer();

    expect(selectOf("Select course").value).toBe("c-grammar");
    expect(optionTexts(selectOf("Select course"))).toEqual(["Select course", "Grammar Basic", "Grammar Advanced"]);
    expect(optionTexts(selectOf("Select room"))).toEqual(["Select room", "Room B"]);
  });
});

describe("EditGroupDrawer: moving the group to another branch", () => {
  const pickBranch = (id: string) => fireEvent.change(selectOf("Branch"), { target: { value: id } });

  it("lists only that branch's courses and rooms, empties course and room, and says the group will move", () => {
    renderDrawer();

    pickBranch(IELTS);

    expect(selectOf("Branch").value).toBe(IELTS);
    expect(selectOf("Select course").value).toBe("");
    expect(selectOf("Select room").value).toBe("");
    expect(optionTexts(selectOf("Select course"))).toEqual(["Select course", "IELTS Intensive"]);
    expect(optionTexts(selectOf("Select room"))).toEqual(["Select room", "Room A"]);
    expect(screen.getByText("This group will be moved to YA IELTS Campus. Pick a course of that branch.")).toBeTruthy();
  });

  it("will not save until a course of the target branch is picked", () => {
    renderDrawer();
    pickBranch(IELTS);

    save();

    expect(screen.getByText("Course is required")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves the new course and reports the target branch", () => {
    renderDrawer();
    pickBranch(IELTS);
    fireEvent.change(selectOf("Select course"), { target: { value: "c-ielts" } });

    save();

    expect(onSave).toHaveBeenCalledTimes(1);
    const [data, moveToBranchId] = onSave.mock.calls[0];
    expect(data.courseId).toBe("c-ielts");
    expect(data.roomId).toBeUndefined();
    expect(moveToBranchId).toBe(IELTS);
  });

  it("gives the group's own course and room back when the original branch is picked again", () => {
    renderDrawer();
    pickBranch(IELTS);

    pickBranch(GRAMMAR);

    expect(selectOf("Select course").value).toBe("c-grammar");
    expect(selectOf("Select room").value).toBe("r-grammar");
    expect(screen.queryByText(/will be moved to/)).toBeNull();
    save();
    expect(onSave.mock.calls[0][1]).toBeNull();
  });

  it("says what to do first when the target branch has no active course", () => {
    renderDrawer({ branches: [ieltsBranch, grammarBranch, newBranch] });

    pickBranch(NEW_BRANCH);

    expect(
      screen.getByText(
        "New Campus has no active courses yet. Create one first: Settings → Courses → ADD NEW, and choose New Campus in the Branch field.",
      ),
    ).toBeTruthy();
    expect(optionTexts(selectOf("Select course"))).toEqual(["Select course"]);
  });

  it("an ordinary edit stays in the group's branch and reports no move", () => {
    renderDrawer();
    fireEvent.change(selectOf("Select course"), { target: { value: "c-grammar-2" } });

    save();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].courseId).toBe("c-grammar-2");
    expect(onSave.mock.calls[0][1]).toBeNull();
  });

  it("starts a reopened drawer on the group's own branch again", async () => {
    const view = renderDrawer();
    pickBranch(IELTS);

    view.rerender(
      <EditGroupDrawer
        group={group} open={false} onClose={() => {}} courses={courses} rooms={rooms} teachers={[]}
        groupBranch={grammarBranch} branches={[ieltsBranch, grammarBranch]} onSave={onSave} isSaving={false}
      />,
    );
    view.rerender(
      <EditGroupDrawer
        group={group} open onClose={() => {}} courses={courses} rooms={rooms} teachers={[]}
        groupBranch={grammarBranch} branches={[ieltsBranch, grammarBranch]} onSave={onSave} isSaving={false}
      />,
    );

    await waitFor(() => expect(selectOf("Branch").value).toBe(GRAMMAR));
    expect(selectOf("Select course").value).toBe("c-grammar");
  });
});
