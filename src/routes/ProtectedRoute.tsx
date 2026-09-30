import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// A TEACHER-role session gets a small, self-contained slice of the CRM
// (product direction, see the teacher sidebar in Sidebar.tsx): a Dashboard
// (their own schedule — Router.tsx's DashboardRoute swaps in the teacher
// variant), their own groups (`/groups`, `/groups/:id` — attendance only),
// their Salary, and the shared profile/notifications pages. Everything else
// under ProtectedRoute (Students, Finance, Settings, Reports, other staff's
// data, etc.) is admin/CEO territory. This is a path allowlist rather than
// per-route guards sprinkled across Router.tsx, so a route can't be added
// later and accidentally skip the check. `/groups/:id` itself is further
// restricted (own groups only, Attendance-only tabs, no student-profile
// links) inside the teacher group pages directly, since that needs the
// group/membership data those pages already fetch — a route guard alone
// can't know which groups belong to this teacher.
//
// Exact-match paths (no nested routes allowed): notably `/profile/:id`
// (another staff member's profile) stays out of reach.
const TEACHER_EXACT_PATHS = ["/dashboard", "/salary", "/profile", "/notifications"];
// Prefix paths (the path itself or anything nested beneath it).
const TEACHER_PREFIX_PATHS = ["/groups"];

// Where a TEACHER lands after login (PublicRoute) and where they're sent when
// they hit something outside the allowlist.
const TEACHER_HOME = "/dashboard";

const isTeacherPathAllowed = (pathname: string) => {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return (
    TEACHER_EXACT_PATHS.includes(path) ||
    TEACHER_PREFIX_PATHS.some((p) => path === p || path.startsWith(`${p}/`))
  );
};

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

  if (isTeacher && !isTeacherPathAllowed(location.pathname)) {
    return <Navigate to={TEACHER_HOME} replace />;
  }

  return <Outlet />;
};
