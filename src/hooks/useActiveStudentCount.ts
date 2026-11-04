import { useEffect, useMemo, useState } from "react";
import { useAllStudentsQuery } from "../app/api/studentsApi";
import { useLazyStudentGroupsQuery, useStudentGroupsQuery } from "../app/api/groupsApi";
import type { StudentGroupRecord } from "../app/api/groupsApi/types";

const PAGE_LIMIT = 1000;
const STUDENTS_LIMIT = 3000;
// Every page after the first is requested at once (see below), so a backend
// that reports an absurd number of pages must not turn into that many requests.
// Past this the exact figure is given up on instead.
const MAX_PAGES = 200;

export interface ActiveStudentCount {
  // The exact figure; null until everything it is computed from has arrived (or
  // when that can't be had, see isError).
  count: number | null;
  // The best figure known before `count` is: every ACTIVE membership is read, but
  // the list of ACTIVE accounts that narrows them is still on its way. It is never
  // below `count` (narrowing only removes students) and equals it unless an
  // archived account still holds an ACTIVE membership.
  provisional: number | null;
  // `count` is still on its way.
  isLoading: boolean;
  // A list it needs could not be read, so there will be no `count` until reload.
  isError: boolean;
}

const studentIdsOf = (rows: StudentGroupRecord[]): string[] =>
  rows.filter((r) => r.studentId && r.groupId).map((r) => r.studentId);

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
//
// Speed: how many pages there are is only known once page 1 is in, but from then
// on all the others are requested together (baseApi lets 3 of one endpoint run at
// a time and queues the rest) instead of one after another, and the accounts list
// is requested right alongside page 1. The figure is ready after
// page 1 + one batch, not after page 1 + one round trip per further page.
export const useActiveStudentCount = (branchId?: string): ActiveStudentCount => {
  // No `page`: page 1 is the default, and with the same arguments as the
  // Students page's Active filter that page reads this very cached list.
  const first = useStudentGroupsQuery({ status: "ACTIVE", branchId, limit: PAGE_LIMIT });
  // `currentData`, not `data`: after the branch changes `data` still holds the
  // previous branch's page until the new one arrives, and those rows must never
  // be counted for the new branch.
  const firstPage = first.currentData;
  const [fetchPage] = useLazyStudentGroupsQuery();
  // The student ids of pages 2..N, or null when one of those pages failed. `key`
  // ties them to the branch and page count they were read for.
  const [more, setMore] = useState<{ key: string; ids: string[] | null } | null>(null);

  const totalPages = firstPage?.meta.totalPages ?? 1;
  const key = `${branchId ?? ""}|${totalPages}`;
  const tooManyPages = totalPages > MAX_PAGES;

  useEffect(() => {
    if (!firstPage || totalPages <= 1 || tooManyPages) return;
    let cancelled = false;
    const laterPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    // A page that is already cached is used as it is: a lazy trigger would
    // otherwise download it again on every visit. Pages that fail are not
    // retried here (baseApi retries a dropped connection itself); the first
    // failure settles the figure as unavailable without waiting for the rest,
    // which keep downloading into the cache for the next visit.
    Promise.all(
      laterPages.map((page) => fetchPage({ status: "ACTIVE", branchId, page, limit: PAGE_LIMIT, priority: "high" }, true).unwrap()),
    ).then(
      (pages) => { if (!cancelled) setMore({ key, ids: pages.flatMap((res) => studentIdsOf(res.rows)) }); },
      () => { if (!cancelled) setMore({ key, ids: null }); },
    );
    return () => { cancelled = true; };
  }, [firstPage, totalPages, tooManyPages, branchId, key, fetchPage]);

  // Requested together with page 1 (not after it): the figure needs both.
  const accounts = useAllStudentsQuery({ page: 1, limit: STUDENTS_LIMIT, branchId, status: "ACTIVE" });

  return useMemo((): ActiveStudentCount => {
    if (!firstPage) return { count: null, provisional: null, isLoading: !first.isError, isError: first.isError };
    if (tooManyPages) return { count: null, provisional: null, isLoading: false, isError: true };

    const pagesRead = totalPages <= 1 || more?.key === key;
    if (!pagesRead) return { count: null, provisional: null, isLoading: true, isError: false };
    if (totalPages > 1 && more?.ids === null) return { count: null, provisional: null, isLoading: false, isError: true };

    const studentIds = new Set(studentIdsOf(firstPage.rows));
    if (totalPages > 1) (more?.ids ?? []).forEach((id) => studentIds.add(id));

    const accountList = accounts.currentData;
    if (accountList) {
      const accountsComplete = (accountList.meta?.total ?? accountList.data.length) <= accountList.data.length;
      if (accountsComplete) {
        const activeAccounts = new Set(accountList.data.map((s) => s.id));
        const count = [...studentIds].filter((id) => activeAccounts.has(id)).length;
        return { count, provisional: count, isLoading: false, isError: false };
      }
    } else if (!accounts.isError) {
      // The accounts list is still downloading: what is known so far is a figure
      // that can only turn out too high, not an answer.
      return { count: null, provisional: studentIds.size, isLoading: true, isError: false };
    }
    // The accounts list failed or is too long to be read in full: the memberships
    // alone are the answer, as they always were in that case.
    return { count: studentIds.size, provisional: studentIds.size, isLoading: false, isError: false };
  }, [firstPage, first.isError, totalPages, tooManyPages, more, key, accounts.currentData, accounts.isError]);
};
