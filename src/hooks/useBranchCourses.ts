import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useAllCoursesQuery } from "../app/api/coursesApi";
import type { RootState } from "../app/store";
import { filterByBranch, singleBranchId } from "../utils/groupBranch";

// The courses of the branch picked in the header - every branch's on "All
// branches". A course belongs to one branch, so a list, filter or picker shows
// only that branch's. The request names the branch, and the answer is narrowed
// again here by each course's branchId, so a server that ignored the branch
// could not leak another branch's courses into the screen.
//
// Not for the group forms or for finding a course by id: those need courses of
// any branch and read `useAllCoursesQuery({ branchId: "all" })` instead.
export const useBranchCourses = (options?: {
  skip?: boolean;
  // A branch of the screen's own (a report's branch select) that goes before the header's.
  branchId?: string | null;
}) => {
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);
  const branchId = singleBranchId(options?.branchId || selectedBranchId);
  const query = useAllCoursesQuery({ branchId: branchId ?? undefined }, { skip: options?.skip });
  // currentData, not data: after a branch switch `data` still holds the
  // previous branch's list until the new one arrives.
  const answer = query.currentData?.data;
  const courses = useMemo(() => filterByBranch(answer ?? [], branchId), [answer, branchId]);
  // After a switch the previous branch's list is still in `data`, so "loading"
  // also covers a fetch that has nothing for the current branch yet.
  const isLoading = query.isLoading || (query.isFetching && query.currentData === undefined);
  // True once the current branch's list itself has arrived (an empty branch included).
  const isLoaded = query.currentData !== undefined;
  return { ...query, isLoading, isLoaded, courses, branchId };
};
