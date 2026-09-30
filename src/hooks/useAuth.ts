import { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../app/store";
import { syncRole } from "../app/store/authSlice";
import { useGetMeQuery, useGetSidebarQuery } from "../app/api/authApi";
import type { PermissionAction, PermissionLabel } from "../app/api/authApi/types";
import {
  collectUserLabels,
  hasLabelAccess as hasLabelAccessUtil,
  hasPermission as hasPermissionUtil,
  isAdminRole,
  isStudentRole,
  isSuperAdminRole,
  isTeacherRole,
  normalizeRole,
} from "../utils/permissions";

// Single source of truth for "who is this user and what may they see".
//
// Role: known immediately from the login response (persisted with the token
// in the Redux auth slice), then kept authoritative by GET /auth/me — if the
// two ever disagree (e.g. a session persisted before the role was stored, or
// the account's role changed) /auth/me wins and the stored role is corrected.
//
// Access to staff routes/nav items (see PermissionRoute + Sidebar):
//   - SUPERADMIN/CEO                       -> everything
//   - /auth/sidebar {allAccess:true}       -> everything
//   - ADMIN whose label list is empty in BOTH /auth/sidebar and /auth/me's
//     rolePermissions (or whose /auth/sidebar call failed and /auth/me has
//     none either) -> everything ("high role" fallback: an empty `labels`
//     array from the backend must never lock an ADMIN out of the whole CRM)
//   - any other staff role                 -> only the labels it actually holds
//     (union of /auth/sidebar `labels` and /auth/me `rolePermissions`)
// TEACHER and STUDENT never get the implicit "everything" access — their
// reachable routes are governed by ProtectedRoute/StudentRoute instead.
export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((state: RootState) => state.auth.token);
  const storedRole = useSelector((state: RootState) => state.auth.role);

  // Skipped while logged out so these never fire on the login page.
  const meQuery = useGetMeQuery(undefined, { skip: !token });
  const sidebarQuery = useGetSidebarQuery(undefined, { skip: !token });

  const user = token ? meQuery.data?.data ?? null : null;
  const isMeLoading = meQuery.isLoading;
  const meRole = user?.role;
  const role = meRole || storedRole;

  // Persist a corrected role (see header comment) — no-op while they agree.
  useEffect(() => {
    if (token && meRole && normalizeRole(meRole) !== normalizeRole(storedRole)) {
      dispatch(syncRole(meRole));
    }
  }, [dispatch, token, meRole, storedRole]);

  const isStudent = isStudentRole(role);
  const isTeacher = isTeacherRole(role);
  const isSuperAdmin = isSuperAdminRole(role);
  const isAdmin = isAdminRole(role);

  const sidebar = token ? sidebarQuery.data?.data : undefined;

  // "Has this query answered at least once (success OR error) for the current
  // token?" — latched in a ref on purpose. RTK Query flips a failed query back
  // to `pending` (isError=false, no data) every time a new subscriber mounts,
  // and PermissionRoute mounts/unmounts its subtree based on readiness, so a
  // non-latched flag would loop forever on a failing /auth/sidebar: spinner ->
  // error -> children mount -> refetch -> spinner ...
  const settledRef = useRef<{ token: string | null; sidebar: boolean; sidebarFailed: boolean; me: boolean }>({
    token: null, sidebar: false, sidebarFailed: false, me: false,
  });
  if (settledRef.current.token !== token) {
    settledRef.current = { token, sidebar: false, sidebarFailed: false, me: false };
  }
  const settled = settledRef.current;
  if (sidebar) {
    settled.sidebar = true;
    settled.sidebarFailed = false;
  } else if (sidebarQuery.isError) {
    settled.sidebar = true;
    settled.sidebarFailed = true;
  }
  if (meQuery.data || meQuery.isError) settled.me = true;

  // True only when /auth/sidebar failed (401/500/network) AND there's no
  // earlier successful response to fall back on.
  const isSidebarError = !!token && settled.sidebarFailed && !sidebar;
  const refetchSidebar = sidebarQuery.refetch;

  const sidebarLabels = useMemo<PermissionLabel[]>(() => {
    const out = new Set<string>();
    for (const l of sidebar?.labels ?? []) if (l) out.add(String(l).toUpperCase());
    for (const l of collectUserLabels(user)) out.add(l);
    return [...out] as PermissionLabel[];
  }, [sidebar?.labels, user]);

  // False until /auth/sidebar has answered (success OR error) and /auth/me
  // has finished its first load — callers that fail-closed on missing access
  // (PermissionRoute) wait for this so a hard refresh doesn't flash a 403
  // for a user who does have access. Deliberately NOT tied to isFetching:
  // a background refetch (e.g. after the "user" tag is invalidated) must not
  // flip the whole app back to a spinner. SUPERADMIN is always ready since
  // it never depends on labels.
  const isPermissionsReady = isSuperAdmin || (settled.sidebar && settled.me);

  const backendAllAccess = sidebar?.allAccess === true;
  const isAdminFallback = isAdmin && isPermissionsReady && !backendAllAccess && sidebarLabels.length === 0;
  const hasFullAccess = !isTeacher && !isStudent && (isSuperAdmin || backendAllAccess || isAdminFallback);
  const branchIds = user?.branchIds ?? [];

  const hasPermission = (label: PermissionLabel, action: PermissionAction) =>
    hasFullAccess || hasPermissionUtil(user, label, action);
  const hasLabelAccess = (label: PermissionLabel) => hasFullAccess || hasLabelAccessUtil(user, label);
  // Whether the sidebar grants visibility to a label — full access
  // short-circuits everything else.
  const hasSidebarLabel = (label: PermissionLabel) => hasFullAccess || sidebarLabels.includes(label);

  return {
    isAuthenticated: !!token,
    token,
    role,
    isStudent,
    isTeacher,
    isSuperAdmin,
    isAdmin,
    user,
    isMeLoading,
    // `sidebarAllAccess` means "may see everything" (see header comment), not
    // just the raw backend flag.
    sidebarAllAccess: hasFullAccess,
    sidebarLabels,
    isSidebarError,
    refetchSidebar,
    isPermissionsReady,
    branchIds,
    hasPermission,
    hasLabelAccess,
    hasSidebarLabel,
  };
};
