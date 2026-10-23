import { useEffect, useMemo, useState } from "react";
import { useAllStudentsQuery } from "../app/api/studentsApi";
import { useLazyStudentGroupsQuery, useStudentGroupsQuery } from "../app/api/groupsApi";

const PAGE_LIMIT = 1000;
const STUDENTS_LIMIT = 3000;

// Dashboard "Active students": students who have a group AND are active in it -
// i.e. at least one ACTIVE student-group membership (trial/frozen/ended ones
// don't count), counted once however many groups they study in. Same
// definition as the Students page's Status -> Active filter.
//
// Every page of GET /student-groups?status=ACTIVE is read (a single page is
// capped by `limit`, which would silently under-count a big school), and the
// result is narrowed to students whose account is ACTIVE too (GET /students
// only lists ACTIVE accounts unless status=INACTIVE is sent) when that list
// arrived in full.
export const useActiveStudentCount = (branchId?: string) => {
  const first = useStudentGroupsQuery({ status: "ACTIVE", branchId, page: 1, limit: PAGE_LIMIT });
  const [fetchPage] = useLazyStudentGroupsQuery();
  const [more, setMore] = useState<{ key: string; ids: string[] } | null>(null);

  const totalPages = first.data?.meta.totalPages ?? 1;
  const key = `${branchId ?? ""}|${totalPages}`;

  useEffect(() => {
    if (!first.data || totalPages <= 1) return;
    let cancelled = false;
    (async () => {
      const ids: string[] = [];
      for (let page = 2; page <= totalPages; page += 1) {
        try {
          const res = await fetchPage({ status: "ACTIVE", branchId, page, limit: PAGE_LIMIT }).unwrap();
          res.rows.forEach((r) => { if (r.studentId && r.groupId) ids.push(r.studentId); });
        } catch {
          return; // incomplete — `isComplete` below stays false
        }
      }
      if (!cancelled) setMore({ key, ids });
    })();
    return () => { cancelled = true; };
  }, [first.data, totalPages, branchId, key, fetchPage]);

  const accounts = useAllStudentsQuery({ page: 1, limit: STUDENTS_LIMIT, branchId, status: "ACTIVE" });

  return useMemo(() => {
    if (!first.data) return { count: null as number | null, isLoading: first.isLoading };
    const isComplete = totalPages <= 1 || more?.key === key;
    if (!isComplete) return { count: null, isLoading: true };

    const studentIds = new Set<string>();
    first.data.rows.forEach((r) => { if (r.studentId && r.groupId) studentIds.add(r.studentId); });
    (totalPages > 1 ? more?.ids ?? [] : []).forEach((id) => studentIds.add(id));

    const accountList = accounts.data;
    const accountsComplete = accountList && (accountList.meta?.total ?? accountList.data.length) <= accountList.data.length;
    if (accountsComplete) {
      const activeAccounts = new Set(accountList.data.map((s) => s.id));
      return { count: [...studentIds].filter((id) => activeAccounts.has(id)).length, isLoading: false };
    }
    return { count: studentIds.size, isLoading: false };
  }, [first.data, first.isLoading, totalPages, more, key, accounts.data]);
};
