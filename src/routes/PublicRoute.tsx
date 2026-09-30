import { Navigate, Outlet, useLocation, type Location } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// Guards routes like /login: an already-authenticated user is sent straight
// to their landing page (or back to whichever protected page they originally
// requested, via the `from` state ProtectedRoute attaches) instead of
// seeing the login form again. This is the single place that decides where
// a just-logged-in user lands — the login form itself only dispatches the
// credential update and lets this reactive guard redirect. Staff and TEACHER
// both land on /dashboard (DashboardRoute renders the teacher's own schedule
// variant for a TEACHER session); STUDENT lands on their portal. A stale
// `from` pointing somewhere the role can't reach is corrected by
// ProtectedRoute/StudentRoute on the next hop.
export const PublicRoute = () => {
  const { isAuthenticated, isStudent } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    const defaultPath = isStudent ? "/portal" : "/dashboard";
    const redirectTo = (location.state as { from?: Location })?.from?.pathname || defaultPath;
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};
