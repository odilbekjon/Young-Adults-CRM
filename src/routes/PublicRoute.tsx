import { Navigate, Outlet, useLocation, type Location } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// Guards routes like /login: an already-authenticated user is sent straight
// to the dashboard (or back to whichever protected page they originally
// requested, via the `from` state ProtectedRoute attaches) instead of
// seeing the login form again. This is the single place that decides where
// a just-logged-in user lands — the login form itself only dispatches the
// credential update and lets this reactive guard redirect.
export const PublicRoute = () => {
  const { isAuthenticated, isStudent } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    const redirectTo =
      (location.state as { from?: Location })?.from?.pathname || (isStudent ? "/portal" : "/dashboard");
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};
