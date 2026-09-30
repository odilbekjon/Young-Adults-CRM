import { Box, CircularProgress } from "@mui/material";
import { Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AccessDenied } from "../pages/AccessDenied";
import type { PermissionLabel } from "../app/api/authApi/types";

// Gates a group of nested routes behind /auth/sidebar's `labels`
// (AUTH_ROLE_DOCS.md §3/§⚡ Dynamic Roles) — see useAuth for exactly how
// "full access" is decided (SUPERADMIN/CEO, allAccess:true, or an ADMIN whose
// label list came back empty) and how /auth/me's rolePermissions back up an
// empty /auth/sidebar. Sits inside ProtectedRoute, so
// the user is already known to be authenticated and non-STUDENT by the time
// this renders. Accepts one label or several: several means "any one of
// these grants entry" (e.g. the Finance route accepts FINANCE, PAYMENTS,
// EXPENSES or SALARIES, since a Manager might hold only PAYMENTS).
interface PermissionRouteProps {
  label: PermissionLabel | PermissionLabel[];
}

export const PermissionRoute = ({ label }: PermissionRouteProps) => {
  const { hasSidebarLabel, isPermissionsReady, isTeacher, isSidebarError, refetchSidebar } = useAuth();

  // A TEACHER-role session's reachable routes are already fully governed by
  // ProtectedRoute's own TEACHER_ALLOWED_PREFIXES allowlist (stricter than
  // any single label here, and teachers get MY_GROUPS/TEACHER_DASHBOARD
  // labels instead of the admin-facing ones checked below) — so it isn't
  // re-checked against sidebar labels here.
  if (isTeacher) return <Outlet />;

  if (!isPermissionsReady) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const labels = Array.isArray(label) ? label : [label];
  const allowed = labels.some((l) => hasSidebarLabel(l));
  if (!allowed) {
    // /auth/sidebar itself failed (401/500/network) and nothing else grants
    // this label — say so and offer a retry rather than a bare 403.
    if (isSidebarError) return <AccessDenied variant="error" onRetry={() => void refetchSidebar()} />;
    return <AccessDenied />;
  }

  return <Outlet />;
};
