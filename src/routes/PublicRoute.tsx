import { Navigate, Outlet, useLocation, type Location } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// Guards routes like /login: an already-authenticated user is sent straight
// to their landing page (or back to whichever protected page they originally
// requested, via the `from` state ProtectedRoute attaches) instead of
// seeing the login form again. This is the single place that decides where
// a just-logged-in user lands — the login form itself only dispatches the
// credential update and lets this reactive guard redirect. TEACHER lands on
// /groups (TeacherGroups' own schedule+groups view) — not /dashboard, which
// ProtectedRoute no longer even allows a TEACHER session to reach.
export const PublicRoute = () => {
  const { isAuthenticated, isStudent, isTeacher } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    const defaultPath = isStudent ? "/portal" : isTeacher ? "/groups" : "/dashboard";
    const redirectTo = (location.state as { from?: Location })?.from?.pathname || defaultPath;
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};
