import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// A TEACHER-role session only needs their own groups (for attendance) plus
// the shared dashboard/profile/notifications pages — everything else under
// ProtectedRoute (Students, Finance, Settings, Reports, other staff's data,
// etc.) is admin/CEO territory. This is a path-prefix allowlist rather than
// per-route guards sprinkled across Router.tsx, so a route can't be added
// later and accidentally skip the check. `/groups/:id` itself is further
// restricted (own groups only, Attendance-only tabs, no student-profile
// links) inside SingleGroup.tsx/Groups.tsx directly, since that needs the
// group/membership data those pages already fetch — a route guard alone
// can't know which groups belong to this teacher.
const TEACHER_ALLOWED_PREFIXES = ["/dashboard", "/groups", "/profile", "/notifications"];

export const ProtectedRoute = () => {
  const { isAuthenticated, isStudent, isTeacher } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // A STUDENT-role session has no business in the staff CRM — send it to
  // its own portal instead (see src/routes/StudentRoute.tsx).
  if (isStudent) {
    return <Navigate to="/portal" replace />;
  }

  if (isTeacher && !TEACHER_ALLOWED_PREFIXES.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
