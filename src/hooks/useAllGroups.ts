import { useEffect, useMemo, useState } from "react";
import { useAllGroupsQuery, useLazyAllGroupsQuery } from "../app/api/groupsApi";
import type { Group } from "../app/api/groupsApi/types";

const PAGE_LIMIT = 100;
// A safety valve, not a real limit (10 000 groups): a backend that pages in
// tiny chunks must not turn one visit into thousands of requests.
const MAX_PAGES = 100;

// EVERY group of the selected branch, whatever its status (running, archived,
// completed): GET /groups is not narrowed by status, and a payment made in a
// group that was archived since still needs that group's course and teachers.
//
// Page 1 is a plain cached query (the one the Groups page reads). GET /groups is
// paged, so the later pages are read too, one request at a time, when
// meta.totalPages says there are any — a group past page 1 would otherwise be
// silently missing. A page that fails ends the walk: the pages read so far still
// count, and the next visit asks again.
//
// isLoading is true until the whole walk is over, so a caller that filters by
// what the groups say does not briefly show "nothing matches".
export const useAllGroups = ({ skip = false }: { skip?: boolean } = {}): { groups: Group[]; isLoading: boolean } => {
  const first = useAllGroupsQuery({ page: 1, limit: PAGE_LIMIT }, { skip });
  const [fetchPage] = useLazyAllGroupsQuery();
  const [more, setMore] = useState<{ key: string; groups: Group[] } | null>(null);

  const totalPages = first.data?.meta?.totalPages ?? 1;
  const key = String(totalPages);

  useEffect(() => {
    if (!first.data || totalPages <= 1) return;
    let cancelled = false;
    (async () => {
      const groups: Group[] = [];
      for (let page = 2; page <= Math.min(totalPages, MAX_PAGES); page += 1) {
        try {
          // A cached page is used as it is instead of being downloaded again.
          const res = await fetchPage({ page, limit: PAGE_LIMIT }, true).unwrap();
          groups.push(...res.data);
        } catch {
          break; // the pages read so far still count
        }
      }
      if (!cancelled) setMore({ key, groups });
    })();
    return () => { cancelled = true; };
  }, [first.data, totalPages, key, fetchPage]);

  const groups = useMemo(
    () => [...(first.data?.data ?? []), ...(more?.key === key ? more.groups : [])],
    [first.data, more, key],
  );
  const walking = Boolean(first.data) && totalPages > 1 && more?.key !== key;
  return { groups, isLoading: first.isLoading || walking };
};
