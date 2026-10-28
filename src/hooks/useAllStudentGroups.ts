import { useEffect, useMemo, useState } from "react";
import { useLazyStudentGroupsQuery, useStudentGroupsQuery } from "../app/api/groupsApi";
import type { StudentGroupRecord } from "../app/api/groupsApi/types";

// A backend that pages in tiny chunks must not turn one visit into hundreds of
// requests: past this many pages the rest is left unread.
const MAX_PAGES = 10;

// The rows of GET /student-groups for one status. Page 1 is a plain cached
// query. The list is paged and the backend can answer with fewer rows than
// `limit` asks for, so a row on a later page would silently be missing — and a
// student who left a group (their INACTIVE row on page 2) would read as still in
// it after a reload. The later pages are therefore read too, but only once
// `readAllPages` says the caller still has someone page 1 did not account for.
export const useAllStudentGroups = (
  status: "INACTIVE" | "DELETED",
  limit: number,
  skip = false,
  readAllPages = true,
): { rows: StudentGroupRecord[]; isLoading: boolean } => {
  const first = useStudentGroupsQuery({ status, limit }, { skip });
  const [fetchPage] = useLazyStudentGroupsQuery();
  const [more, setMore] = useState<{ key: string; rows: StudentGroupRecord[] } | null>(null);

  const totalPages = first.data?.meta.totalPages ?? 1;
  const key = `${status}|${limit}|${totalPages}`;

  useEffect(() => {
    if (!readAllPages || !first.data || totalPages <= 1) return;
    let cancelled = false;
    (async () => {
      const rows: StudentGroupRecord[] = [];
      for (let page = 2; page <= Math.min(totalPages, MAX_PAGES); page += 1) {
        try {
          // A cached page is used as it is instead of being downloaded again.
          const res = await fetchPage({ status, limit, page }, true).unwrap();
          rows.push(...res.rows);
        } catch {
          return; // the pages read so far still count
        }
      }
      if (!cancelled) setMore({ key, rows });
    })();
    return () => { cancelled = true; };
  }, [readAllPages, first.data, totalPages, status, limit, key, fetchPage]);

  const rows = useMemo(
    () => [...(first.data?.rows ?? []), ...(more?.key === key ? more.rows : [])],
    [first.data, more, key],
  );
  return { rows, isLoading: first.isLoading };
};
