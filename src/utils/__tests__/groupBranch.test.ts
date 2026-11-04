import { describe, expect, it } from "vitest";
import {
  branchIdOf,
  branchSelectOptions,
  clearStaleBranchChoices,
  editBranchScope,
  filterByBranch,
  findBranchConflict,
  groupBranchId,
  singleBranchId,
} from "../groupBranch";

const IELTS = "b-ielts";
const GRAMMAR = "b-grammar";

const course = (id: string, branchId: string | null) => ({ id, branchId });

describe("singleBranchId", () => {
  it("treats all/empty values as 'no single branch'", () => {
    expect(singleBranchId("all")).toBeNull();
    expect(singleBranchId("")).toBeNull();
    expect(singleBranchId(null)).toBeNull();
    expect(singleBranchId(undefined)).toBeNull();
  });

  it("returns a real branch id as it is", () => {
    expect(singleBranchId(IELTS)).toBe(IELTS);
  });
});

describe("branchIdOf", () => {
  it("reads branchId, then the nested branch object", () => {
    expect(branchIdOf({ id: "c1", branchId: IELTS })).toBe(IELTS);
    expect(branchIdOf({ id: "c1", branch: { id: GRAMMAR } })).toBe(GRAMMAR);
    expect(branchIdOf({ id: "c1", branchId: IELTS, branch: { id: GRAMMAR } })).toBe(IELTS);
  });

  it("is null when the branch is unknown", () => {
    expect(branchIdOf({ id: "c1" })).toBeNull();
    expect(branchIdOf({ id: "c1", branchId: "" })).toBeNull();
    expect(branchIdOf(undefined)).toBeNull();
  });
});

describe("filterByBranch", () => {
  const courses = [course("ielts-a", IELTS), course("grammar-a", GRAMMAR), course("ielts-b", IELTS), course("orphan", null)];

  it("offers only the courses of the chosen branch", () => {
    expect(filterByBranch(courses, IELTS).map((c) => c.id)).toEqual(["ielts-a", "ielts-b"]);
    expect(filterByBranch(courses, GRAMMAR).map((c) => c.id)).toEqual(["grammar-a"]);
  });

  it("does not narrow anything on All branches", () => {
    expect(filterByBranch(courses, null)).toHaveLength(4);
    expect(filterByBranch(courses, "all")).toHaveLength(4);
    expect(filterByBranch(courses, undefined)).toHaveLength(4);
  });

  it("drops an item whose branch is unknown once a branch is chosen", () => {
    expect(filterByBranch(courses, IELTS).some((c) => c.id === "orphan")).toBe(false);
  });

  it("keeps the item a group being edited already has, whatever its branch", () => {
    expect(filterByBranch(courses, IELTS, "grammar-a").map((c) => c.id)).toEqual(["ielts-a", "grammar-a", "ielts-b"]);
  });

  it("does not mutate or alias its input", () => {
    const result = filterByBranch(courses, null);
    expect(result).not.toBe(courses);
    expect(result).toEqual(courses);
  });
});

describe("groupBranchId", () => {
  it("is the branch the group is created in", () => {
    expect(groupBranchId(IELTS, course("g", GRAMMAR))).toBe(IELTS);
    expect(groupBranchId(IELTS)).toBe(IELTS);
  });

  it("follows the picked course on All branches", () => {
    expect(groupBranchId(null, course("g", GRAMMAR))).toBe(GRAMMAR);
    expect(groupBranchId("all", course("g", GRAMMAR))).toBe(GRAMMAR);
  });

  it("is null while nothing decides it", () => {
    expect(groupBranchId(null)).toBeNull();
    expect(groupBranchId(null, course("g", null))).toBeNull();
  });
});

describe("findBranchConflict", () => {
  it("reports a course of another branch - the bug: IELTS selected, Grammar course picked", () => {
    expect(findBranchConflict({ scopeBranchId: IELTS, course: course("grammar-a", GRAMMAR) })).toBe("course");
  });

  it("accepts a course of the same branch", () => {
    expect(findBranchConflict({ scopeBranchId: IELTS, course: course("ielts-a", IELTS) })).toBeNull();
  });

  it("reports a room of another branch than the selected one", () => {
    expect(
      findBranchConflict({ scopeBranchId: IELTS, course: course("ielts-a", IELTS), room: course("r1", GRAMMAR) }),
    ).toBe("room");
  });

  it("checks the room against the course's branch on All branches", () => {
    expect(findBranchConflict({ scopeBranchId: null, course: course("grammar-a", GRAMMAR), room: course("r1", IELTS) })).toBe("room");
    expect(findBranchConflict({ scopeBranchId: null, course: course("grammar-a", GRAMMAR), room: course("r2", GRAMMAR) })).toBeNull();
  });

  it("never reports a course on All branches - it decides the branch itself", () => {
    expect(findBranchConflict({ scopeBranchId: "all", course: course("grammar-a", GRAMMAR) })).toBeNull();
  });

  it("only reports a provable mismatch", () => {
    expect(findBranchConflict({ scopeBranchId: IELTS, course: course("c", null) })).toBeNull();
    expect(findBranchConflict({ scopeBranchId: IELTS, course: course("c", IELTS), room: course("r", null) })).toBeNull();
    expect(findBranchConflict({ scopeBranchId: null, room: course("r", IELTS) })).toBeNull();
    expect(findBranchConflict({})).toBeNull();
  });
});

describe("clearStaleBranchChoices", () => {
  const courses = [course("ielts-a", IELTS), course("grammar-a", GRAMMAR)];
  const rooms = [course("room-ielts", IELTS), course("room-grammar", GRAMMAR)];

  it("clears a course picked under another branch when the branch changes", () => {
    expect(
      clearStaleBranchChoices({ courseId: "grammar-a", roomId: "" }, { scopeBranchId: IELTS, courses, rooms }),
    ).toEqual({ courseId: "", roomId: "" });
  });

  it("keeps a course and room that belong to the branch", () => {
    expect(
      clearStaleBranchChoices({ courseId: "ielts-a", roomId: "room-ielts" }, { scopeBranchId: IELTS, courses, rooms }),
    ).toEqual({ courseId: "ielts-a", roomId: "room-ielts" });
  });

  it("clears a room of another branch even when the course fits", () => {
    expect(
      clearStaleBranchChoices({ courseId: "ielts-a", roomId: "room-grammar" }, { scopeBranchId: IELTS, courses, rooms }),
    ).toEqual({ courseId: "ielts-a", roomId: "" });
  });

  it("clears a room that does not match the picked course on All branches", () => {
    expect(
      clearStaleBranchChoices({ courseId: "grammar-a", roomId: "room-ielts" }, { scopeBranchId: null, courses, rooms }),
    ).toEqual({ courseId: "grammar-a", roomId: "" });
    expect(
      clearStaleBranchChoices({ courseId: "grammar-a", roomId: "room-grammar" }, { scopeBranchId: null, courses, rooms }),
    ).toEqual({ courseId: "grammar-a", roomId: "room-grammar" });
  });

  it("leaves a room alone on All branches while no course is picked", () => {
    expect(
      clearStaleBranchChoices({ courseId: "", roomId: "room-ielts" }, { scopeBranchId: null, courses, rooms }),
    ).toEqual({ courseId: "", roomId: "room-ielts" });
  });

  it("never clears what the edited group already had", () => {
    expect(
      clearStaleBranchChoices(
        { courseId: "grammar-a", roomId: "room-grammar" },
        { scopeBranchId: IELTS, courses, rooms, keepCourseId: "grammar-a", keepRoomId: "room-grammar" },
      ),
    ).toEqual({ courseId: "grammar-a", roomId: "room-grammar" });
  });

  it("leaves an id that is not in the lists (yet) alone", () => {
    expect(
      clearStaleBranchChoices({ courseId: "unknown", roomId: "unknown-room" }, { scopeBranchId: IELTS, courses: [], rooms: [] }),
    ).toEqual({ courseId: "unknown", roomId: "unknown-room" });
  });
});

describe("editBranchScope", () => {
  const own = { courseId: "grammar-a", roomId: "room-grammar" };

  it("stays in the group's own branch while the Branch select is untouched", () => {
    expect(editBranchScope({ homeBranchId: GRAMMAR, ...own })).toEqual({
      moving: false,
      moveToBranchId: null,
      scopeBranchId: GRAMMAR,
      keepCourseId: "grammar-a",
      keepRoomId: "room-grammar",
    });
  });

  it("is not a move when the select points at the group's own branch", () => {
    const scope = editBranchScope({ homeBranchId: GRAMMAR, pickedBranchId: GRAMMAR, ...own });
    expect(scope.moving).toBe(false);
    expect(scope.keepCourseId).toBe("grammar-a");
  });

  it("works in the target branch once another branch is picked, and no longer keeps the group's own course/room", () => {
    expect(editBranchScope({ homeBranchId: GRAMMAR, pickedBranchId: IELTS, ...own })).toEqual({
      moving: true,
      moveToBranchId: IELTS,
      scopeBranchId: IELTS,
      keepCourseId: null,
      keepRoomId: null,
    });
  });

  it("goes back to keeping them when the original branch is picked again", () => {
    const back = editBranchScope({ homeBranchId: GRAMMAR, pickedBranchId: null, ...own });
    expect(back.moving).toBe(false);
    expect(back.keepRoomId).toBe("room-grammar");
  });

  it("treats 'all' as no pick, and an unknown home branch as 'any pick is a move'", () => {
    expect(editBranchScope({ homeBranchId: GRAMMAR, pickedBranchId: "all", ...own }).moving).toBe(false);
    expect(editBranchScope({ homeBranchId: null, pickedBranchId: IELTS, ...own }).moving).toBe(true);
    expect(editBranchScope({ homeBranchId: null, ...own })).toMatchObject({ moving: false, scopeBranchId: null });
  });

  it("drives the lists and the safety net against the TARGET branch", () => {
    const courses = [course("ielts-a", IELTS), course("grammar-a", GRAMMAR)];
    const scope = editBranchScope({ homeBranchId: GRAMMAR, pickedBranchId: IELTS, ...own });

    // only the target branch's courses are offered; the old course is not kept
    expect(filterByBranch(courses, scope.scopeBranchId, scope.keepCourseId).map((c) => c.id)).toEqual(["ielts-a"]);
    // the group's old course/room are judged against the target and refused
    expect(findBranchConflict({ scopeBranchId: scope.scopeBranchId, course: courses[1] })).toBe("course");
    expect(findBranchConflict({ scopeBranchId: scope.scopeBranchId, course: courses[0], room: course("room-grammar", GRAMMAR) })).toBe("room");
    expect(findBranchConflict({ scopeBranchId: scope.scopeBranchId, course: courses[0], room: course("room-ielts", IELTS) })).toBeNull();
    // and a stale pick is emptied
    expect(
      clearStaleBranchChoices(
        { courseId: "grammar-a", roomId: "room-grammar" },
        { scopeBranchId: scope.scopeBranchId, courses, rooms: [course("room-grammar", GRAMMAR)], keepCourseId: scope.keepCourseId, keepRoomId: scope.keepRoomId },
      ),
    ).toEqual({ courseId: "", roomId: "" });
  });
});

describe("branchSelectOptions", () => {
  const a = { id: IELTS, name: "IELTS" };
  const b = { id: GRAMMAR, name: "Grammar" };

  it("lists the accessible branches", () => {
    expect(branchSelectOptions([a, b], a)).toEqual([a, b]);
    expect(branchSelectOptions([a, b])).toEqual([a, b]);
  });

  it("adds the group's own branch when the user cannot otherwise reach it - and nothing else", () => {
    expect(branchSelectOptions([a], b)).toEqual([a, b]);
    expect(branchSelectOptions([a], null)).toEqual([a]);
  });
});
