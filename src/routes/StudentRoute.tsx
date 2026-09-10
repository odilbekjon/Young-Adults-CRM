import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// Guards /portal/* — the student self-service portal. Requires both auth
// and a STUDENT-role session (mirrors ProtectedRoute, which sends a
// STUDENT-role user away from the staff CRM into this same portal).
export const StudentRoute = () => {
  const { isAuthenticated, isStudent } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isStudent) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default StudentRoute;
