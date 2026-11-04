import type { ActiveStudentCount } from "../../hooks/useActiveStudentCount";

export interface ActiveStudentsStat {
  value: number;
  // Nothing to show yet: the tile shows a spinner instead of a number.
  loading: boolean;
  // `value` is an estimate, not the exact figure: the tile marks it with "≈".
  approximate: boolean;
  // ...and the exact figure is still on its way, so the estimate is also dimmed
  // and carries a small spinner.
  refining: boolean;
}

// What the "Active students" tile shows.
//
// The exact figure (distinct students with an ACTIVE membership and an ACTIVE
// account) needs whole lists from the backend and takes a moment, so until it is
// in the tile shows the best estimate known, in this order of trust:
//   1. the memberships already read (only the accounts list is still missing),
//   2. the backend's /dashboard/stats figure - a cheap count, but with a
//      different definition than the Students list this tile opens, so it can be
//      off.
// An estimate is always marked ("≈", dimmed while the exact figure is coming) so
// it is never taken for the answer, and is replaced in place when that arrives.
export const activeStudentsStat = (
  exact: ActiveStudentCount,
  backend: { count: number | undefined; isLoading: boolean },
): ActiveStudentsStat => {
  if (exact.count !== null) return { value: exact.count, loading: false, approximate: false, refining: false };

  const estimate = exact.provisional ?? backend.count;
  if (estimate !== undefined) return { value: estimate, loading: false, approximate: true, refining: exact.isLoading };

  return { value: 0, loading: exact.isLoading || backend.isLoading, approximate: false, refining: false };
};
