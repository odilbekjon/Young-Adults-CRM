// /dashboard and /salary render a different page for a TEACHER-role session
// (their own schedule / their own payroll) versus everyone else (the admin
// Dashboard / the Finance → Salaries screen) — picked here, same pattern as
// RoleGroupsRoute, so neither the admin Dashboard nor Finance needs any
// teacher-specific branching inside it.
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Layout } from "../layouts/layout";
import { Dashboard } from "../pages/Dashboard";
import { TeacherDashboard } from "../pages/Dashboard/TeacherDashboard";
import { TeacherAccount } from "../pages/TeacherAccount/TeacherAccount";

export const DashboardRoute = () => {
  const { isTeacher } = useAuth();
  return isTeacher ? <TeacherDashboard /> : <Dashboard />;
};

// `/salary` is the Salary tab of the teacher's Account page (same page as
// /profile — see TeacherAccount). For staff the equivalent lives
// under Finance → Salaries, so they're sent there (PermissionRoute still
// applies to it). Renders its own Layout because only the teacher variant
// needs one.
export const SalaryRoute = () => {
  const { isTeacher } = useAuth();
  if (!isTeacher) return <Navigate to="/finance/salaries" replace />;
  return (
    <Layout>
      <TeacherAccount tab="salary" />
    </Layout>
  );
};
