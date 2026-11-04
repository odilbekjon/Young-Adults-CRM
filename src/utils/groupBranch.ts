// Which branch a group lives in, and which courses and rooms may be put in it.
//
// A group has no branch of its own in the API: the backend files it under the
// branch of its COURSE (the Groups list and SingleGroup read it the same way:
// group.course.branchId). So picking a course of another branch silently moves
// the group there - a group created while "YA IELTS Campus" is selected but with
// a Grammar Campus course ended up in Grammar Campus and vanished from the
// IELTS list. Courses (and rooms) therefore belong to a branch, and a group form
// may only offer the ones of the branch the group is being created in.

// Anything that belongs to one branch: Course, Room, ... The id is read from
// `branchId`, or from the nested `branch` object when only that is present.
export interface BranchOwned {
  id: string;
  branchId?: string | null;
  branch?: { id?: string | null } | null;
}

// "all" (the header's "All branches"), "" and null/undefined all mean "no single
// branch is chosen".
export const singleBranchId = (branchId?: string | null): string | null =>
  branchId && branchId !== "all" ? branchId : null;

export const branchIdOf = (item?: BranchOwned | null): string | null =>
  item?.branchId || item?.branch?.id || null;

// The items of one branch. With no single branch there is nothing to narrow to
// and every item is kept. An item whose branch is unknown is left out of a
// narrowed list (it cannot be shown to belong there). `keepId` stays whatever
// its branch - the course/room a group being edited already has.
export const filterByBranch = <T extends BranchOwned>(
  items: readonly T[],
  branchId?: string | null,
  keepId?: string | null,
): T[] => {
  const scope = singleBranchId(branchId);
  if (!scope) return [...items];
  return items.filter((item) => item.id === keepId || branchIdOf(item) === scope);
};

// The branch a group will belong to: the one it is created in (or already
// belongs to), and - only while no single branch is chosen ("All branches") -
// the branch of the course picked in the form. Null while nothing decides it.
export const groupBranchId = (scopeBranchId?: string | null, course?: BranchOwned | null): string | null =>
  singleBranchId(scopeBranchId) ?? branchIdOf(course);

export type BranchConflict = "course" | "room";

// What stops a group from being saved into `scopeBranchId`: a course of another
// branch (it would move the group there), or a room that is not in the group's
// branch. A course/room whose branch is unknown is not reported - only a
// provable mismatch is. Returns null when nothing conflicts.
export const findBranchConflict = ({
  scopeBranchId,
  course,
  room,
}: {
  scopeBranchId?: string | null;
  course?: BranchOwned | null;
  room?: BranchOwned | null;
}): BranchConflict | null => {
  const scope = singleBranchId(scopeBranchId);
  const courseBranch = branchIdOf(course);
  if (scope && courseBranch && courseBranch !== scope) return "course";
  const target = scope ?? courseBranch;
  const roomBranch = branchIdOf(room);
  if (target && roomBranch && roomBranch !== target) return "room";
  return null;
};

// A form keeps the course and room picked earlier when the branch changes or a
// different course is chosen. This empties whichever no longer belongs to the
// group's branch (course first, since in "All branches" the course decides the
// branch the room is checked against). `keepCourseId` / `keepRoomId` (what a
// group being edited already has) are never emptied, and an id missing from the
// lists is left alone - it cannot be judged.
export const clearStaleBranchChoices = (
  choice: { courseId: string; roomId: string },
  context: {
    scopeBranchId?: string | null;
    courses: readonly BranchOwned[];
    rooms: readonly BranchOwned[];
    keepCourseId?: string | null;
    keepRoomId?: string | null;
  },
): { courseId: string; roomId: string } => {
  const scope = singleBranchId(context.scopeBranchId);
  const course = choice.courseId ? context.courses.find((c) => c.id === choice.courseId) : undefined;
  const courseStale = Boolean(
    scope && course && choice.courseId !== context.keepCourseId && branchIdOf(course) && branchIdOf(course) !== scope,
  );
  const courseId = courseStale ? "" : choice.courseId;

  const target = scope ?? (courseId ? branchIdOf(course) : null);
  const room = choice.roomId ? context.rooms.find((r) => r.id === choice.roomId) : undefined;
  const roomStale = Boolean(
    target && room && choice.roomId !== context.keepRoomId && branchIdOf(room) && branchIdOf(room) !== target,
  );
  return { courseId, roomId: roomStale ? "" : choice.roomId };
};

// ── Moving a group to another branch while editing ──────────────────────────
// A group follows its course, so the only way to put a group that landed in the
// wrong branch back is to give it a course of the right branch. An edit form
// therefore has a Branch select, starting on the group's own branch.

export interface EditBranchScope {
  // Whether the Branch select now points at a branch other than the group's own.
  moving: boolean;
  // The branch being moved to; null unless `moving`.
  moveToBranchId: string | null;
  // The branch the form's course/room lists and checks work in: the target while
  // moving, the group's own branch otherwise (null = no single branch known).
  scopeBranchId: string | null;
  // The group's own course/room stay offered (and are never emptied) only while
  // it stays where it is; once it is being moved they belong to the old branch.
  keepCourseId: string | null;
  keepRoomId: string | null;
}

export const editBranchScope = ({
  homeBranchId,
  pickedBranchId,
  courseId,
  roomId,
}: {
  // The group's own branch (the branch of its course), or the branch the form
  // falls back to when that is unknown.
  homeBranchId?: string | null;
  // What the Branch select holds; null/undefined = untouched.
  pickedBranchId?: string | null;
  // The group's course and room as they were when the form opened.
  courseId?: string | null;
  roomId?: string | null;
}): EditBranchScope => {
  const home = singleBranchId(homeBranchId);
  const picked = singleBranchId(pickedBranchId);
  const moveToBranchId = picked && picked !== home ? picked : null;
  return {
    moving: moveToBranchId !== null,
    moveToBranchId,
    scopeBranchId: moveToBranchId ?? home,
    keepCourseId: moveToBranchId ? null : courseId || null,
    keepRoomId: moveToBranchId ? null : roomId || null,
  };
};

// The entries of the Branch select: the branches the user may work in, plus the
// group's own branch when it is not one of them (so the select can show where
// the group is now). Never adds any other branch.
export const branchSelectOptions = <B extends { id: string; name: string }>(
  accessible: readonly B[],
  currentBranch?: B | null,
): B[] => (currentBranch && !accessible.some((b) => b.id === currentBranch.id) ? [...accessible, currentBranch] : [...accessible]);
