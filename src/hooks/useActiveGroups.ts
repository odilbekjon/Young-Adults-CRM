import { useEffect, useMemo, useState } from "react";
import { useAllGroupsQuery, useLazyAllGroupsQuery } from "../app/api/groupsApi";
import type { Group } from "../app/api/groupsApi/types";

const PAGE_LIMIT = 100;
// A backend that pages in tiny chunks must not turn one visit into hundreds of
// requests: past this many pages the rest is left unread.
const MAX_PAGES = 10;

// Every ACTIVE group of the selected branch — only the ones `teacherId` teaches
// when it is given. ACTIVE is the whole rule: a group past its training end date
// that nobody archived is still its teacher's active group (the Groups page's
// "Active" filter would call it completed), and archived/deleted groups are out.
// The teacher's profile list and the Teachers page count both come from here, so
// they cannot disagree.
//
// Page 1 is a plain cached query (the one the Groups page reads when no teacher
// is given). GET /groups is paged, so the later pages are read too when
// meta.totalPages says there are any — an active group past page 1 would
// otherwise be silently missing.
export const useActiveGroups = ({ teacherId, skip = false }: { teacherId?: string; skip?: boolean } = {}): Group[] => {
  const first = useAllGroupsQuery({ page: 1, limit: PAGE_LIMIT, teacherId }, { skip });
  const [fetchPage] = useLazyAllGroupsQuery();
  const [more, setMore] = useState<{ key: string; groups: Group[] } | null>(null);

  const totalPages = first.data?.meta?.totalPages ?? 1;
  const key = `${teacherId ?? ""}|${totalPages}`;

  useEffect(() => {
    if (!first.data || totalPages <= 1) return;
    let cancelled = false;
    (async () => {
      const groups: Group[] = [];
      for (let page = 2; page <= Math.min(totalPages, MAX_PAGES); page += 1) {
        try {
          // A cached page is used as it is instead of being downloaded again.
          const res = await fetchPage({ page, limit: PAGE_LIMIT, teacherId }, true).unwrap();
          groups.push(...res.data);
        } catch {
          break; // the pages read so far still count
        }
      }
      if (!cancelled) setMore({ key, groups });
    })();
    return () => { cancelled = true; };
  }, [first.data, totalPages, teacherId, key, fetchPage]);

  return useMemo(
    () => [...(first.data?.data ?? []), ...(more?.key === key ? more.groups : [])]
      .filter((g) => g.status?.toUpperCase() === "ACTIVE"),
    [first.data, more, key],
  );
};
