import { useSelector } from "react-redux";
import type { RootState } from "../app/store";
import { useGetMeQuery, useGetSidebarQuery } from "../app/api/authApi";
import type { PermissionAction, PermissionLabel } from "../app/api/authApi/types";
import {
  hasLabelAccess as hasLabelAccessUtil,
  hasPermission as hasPermissionUtil,
  isAdminRole,
  isStudentRole,
  isSuperAdminRole,
  isTeacherRole,
} from "../utils/permissions";

export const useAuth = () => {
  const token = useSelector((state: RootState) => state.auth.token);
  const role = useSelector((state: RootState) => state.auth.role);
  const isStudent = isStudentRole(role);
  const isTeacher = isTeacherRole(role);
  const isSuperAdmin = isSuperAdminRole(role);
  const isAdmin = isAdminRole(role);

  // Skipped while logged out so these never fire on the login page.
  const { data: meData, isLoading: isMeLoading } = useGetMeQuery(undefined, { skip: !token });
  const { data: sidebarData, isFetching: isSidebarLoading } = useGetSidebarQuery(undefined, { skip: !token });

  const user = meData?.data ?? null;
  // Falls back to the Redux-level role (known immediately at login, before
  // /auth/me or /auth/sidebar have resolved) so a SUPERADMIN/CEO session
  // never flashes a hidden nav item or a false 403 during that first fetch.
  const sidebarAllAccess = sidebarData?.data.allAccess ?? isSuperAdmin;
  const sidebarLabels = sidebarData?.data.labels ?? [];
  // False until the first /auth/sidebar response lands — callers that
  // fail-closed on missing access (e.g. PermissionRoute) should wait for
  // this before deciding, so a hard refresh doesn't flash a 403 for a user
  // who does have access. SUPERADMIN is always ready since it never depends
  // on labels in the first place.
  const isPermissionsReady = isSuperAdmin || (!!sidebarData && !isSidebarLoading);
  const branchIds = user?.branchIds ?? [];

  const hasPermission = (label: PermissionLabel, action: PermissionAction) =>
    isSuperAdmin || hasPermissionUtil(user, label, action);
  const hasLabelAccess = (label: PermissionLabel) => isSuperAdmin || hasLabelAccessUtil(user, label);
  // Whether the sidebar grants visibility to a label — allAccess (SUPERADMIN)
  // short-circuits everything else.
  const hasSidebarLabel = (label: PermissionLabel) => sidebarAllAccess || sidebarLabels.includes(label);

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
    sidebarAllAccess,
    sidebarLabels,
    isPermissionsReady,
    branchIds,
    hasPermission,
    hasLabelAccess,
    hasSidebarLabel,
  };
};
