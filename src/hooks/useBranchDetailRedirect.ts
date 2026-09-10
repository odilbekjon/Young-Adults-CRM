import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import type { RootState } from "../app/store";

// Detail pages render data scoped to one specific record that itself lives
// in a single branch (a group, a student, a teacher, a course). Their own
// queries only ever fetch once for the id in the URL, so switching the
// active branch from the Header while sitting on one of these leaves the
// old branch's data on screen — the page has no reason to refetch anything
// since its id-keyed query args never changed. Redirecting to the
// corresponding list page forces a real refetch scoped to the new branch,
// the same fix Groups.tsx/Students.tsx already get for free since their own
// queries key off the branch directly.
const BRANCH_DETAIL_REDIRECTS: { pattern: RegExp; fallback: string }[] = [
  { pattern: /^\/groups\/[^/]+$/, fallback: "/groups" },
  { pattern: /^\/students\/[^/]+$/, fallback: "/students" },
  { pattern: /^\/teachers\/[^/]+$/, fallback: "/teachers" },
  { pattern: /^\/courses\/[^/]+$/, fallback: "/courses" },
];

export const useBranchDetailRedirect = () => {
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);
  const location = useLocation();
  const navigate = useNavigate();
  const prevBranchIdRef = useRef(selectedBranchId);

  useEffect(() => {
    if (prevBranchIdRef.current === selectedBranchId) return;
    prevBranchIdRef.current = selectedBranchId;

    const match = BRANCH_DETAIL_REDIRECTS.find((r) => r.pattern.test(location.pathname));
    if (match) navigate(match.fallback, { replace: true });
    // Only branch changes should trigger this — re-running it for every
    // location change would redirect a normal in-page navigation too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);
};
