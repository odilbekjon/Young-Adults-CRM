import { useEffect, useMemo, useState } from "react";
import { useLazyStudentGroupsQuery, useStudentGroupsQuery } from "../app/api/groupsApi";
import type { StudentGroupRecord } from "../app/api/groupsApi/types";

// Every row of GET /student-groups for one status, not just the first page.
// The list is paged and the backend can answer with fewer rows than `limit`
// asks for, so a row that sits on a later page would silently be missing — and a
// student who left a group (their INACTIVE row on page 2) would read as still in
// it after a reload. Page 1 is a plain cached query; the rest are read once the
// first answer says there are more, and rows are returned as they arrive.
export const useAllStudentGroups = (status: "INACTIVE" | "DELETED", limit: number, skip = false): StudentGroupRecord[] => {
  const first = useStudentGroupsQuery({ status, limit }, { skip });
  const [fetchPage] = useLazyStudentGroupsQuery();
  const [more, setMore] = useState<{ key: string; rows: StudentGroupRecord[] } | null>(null);

  const totalPages = first.data?.meta.totalPages ?? 1;
  const key = `${status}|${limit}|${totalPages}`;

  useEffect(() => {
    if (!first.data || totalPages <= 1) return;
    let cancelled = false;
    (async () => {
      const rows: StudentGroupRecord[] = [];
      for (let page = 2; page <= totalPages; page += 1) {
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
  }, [first.data, totalPages, status, limit, key, fetchPage]);

  return useMemo(
    () => [...(first.data?.rows ?? []), ...(more?.key === key ? more.rows : [])],
    [first.data, more, key],
  );
};
