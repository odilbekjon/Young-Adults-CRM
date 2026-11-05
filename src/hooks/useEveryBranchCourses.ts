import { useEffect, useMemo } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { coursesApi } from "../app/api/coursesApi";
import type { Course, CoursesResponse } from "../app/api/coursesApi/types";
import type { AppDispatch, RootState } from "../app/store";
import { useAccessibleBranches } from "./useAccessibleBranches";
import { useAuth } from "./useAuth";

const allCourses = coursesApi.endpoints.allCourses;

// The courses of every branch the account can work in - for a screen that has to
// find a course by id wherever it sits (a group's own course, a course opened from
// a direct link) or to offer another branch's courses (moving a group), whatever
// the header says.
//
// It reads each branch with the request every role is allowed to make for a branch
// of its own - GET /courses?branchId=X with x-branch-id: X, the one Settings >
// Courses sends - and puts the answers together. It never asks for
// "x-branch-id: all": only an account allowed to see every branch at once can rely
// on that, and for a branch director or an admin it left these screens without
// their courses. A CEO's branches are all the active ones, so the CEO gets every
// course the same way.
//
// The answers are read from the shared RTK Query cache, so a course archived,
// restored or edited elsewhere shows here at once, and a branch whose list was
// already fetched (the Groups form, Settings > Courses) is not fetched again.
export const useEveryBranchCourses = ({ skip = false }: { skip?: boolean } = {}): {
  data: { data: Course[] } | undefined;
  courses: Course[];
  isLoading: boolean;
  isError: boolean;
} => {
  const dispatch = useDispatch<AppDispatch>();
  const { branches, isLoading: branchesLoading } = useAccessibleBranches();
  // Until /auth/me has answered nobody knows which branches the account has.
  const { isMeLoading } = useAuth();
  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const idsKey = branchIds.join(",");

  useEffect(() => {
    if (skip || branchIds.length === 0) return;
    const subscriptions = branchIds.map((branchId) => dispatch(allCourses.initiate({ branchId })));
    return () => subscriptions.forEach((subscription) => subscription.unsubscribe());
    // branchIds is rebuilt on every render of its source; its content is idsKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, skip, idsKey]);

  // The stored answers themselves (stable references while nothing changes), and
  // the request statuses as one string.
  const answers = useSelector(
    (state: RootState): (CoursesResponse | undefined)[] =>
      branchIds.map((branchId) => allCourses.select({ branchId })(state).data),
    shallowEqual,
  );
  const statuses = useSelector((state: RootState): string =>
    branchIds.map((branchId) => allCourses.select({ branchId })(state).status).join(","),
  );

  const courses = useMemo(() => {
    const byId = new Map<string, Course>();
    for (const answer of answers) for (const course of answer?.data ?? []) byId.set(course.id, course);
    return [...byId.values()];
  }, [answers]);

  if (skip) return { data: undefined, courses: [], isLoading: false, isError: false };

  const states = statuses ? statuses.split(",") : [];
  const hasAnswer = answers.some((answer) => answer !== undefined);
  // Still on its way: the branches themselves, or a branch whose list has not
  // arrived yet (not asked for yet - the effect above has not run - or in flight).
  // A list that is being refreshed behind data already shown does not count, so
  // an archive/restore never flips a page back to a spinner.
  const isLoading =
    isMeLoading ||
    branchesLoading ||
    answers.some((answer, i) => answer === undefined && (states[i] === "uninitialized" || states[i] === "pending"));
  const isError = !hasAnswer && !isLoading && states.length > 0 && states.every((state) => state === "rejected");

  return { data: hasAnswer ? { data: courses } : undefined, courses, isLoading, isError };
};
