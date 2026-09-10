import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const ProtectedRoute = () => {
  const { isAuthenticated, isStudent } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // A STUDENT-role session has no business in the staff CRM — send it to
  // its own portal instead (see src/routes/StudentRoute.tsx).
  if (isStudent) {
    return <Navigate to="/portal" replace />;
  }

  return <Outlet />;
};
