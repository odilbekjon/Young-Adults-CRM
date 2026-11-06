import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { PublicRoute } from "./routes/PublicRoute";
import { StudentRoute } from "./routes/StudentRoute";
import { PermissionRoute } from "./routes/PermissionRoute";
import { GroupsRoute, GroupDetailRoute } from "./routes/RoleGroupsRoute";
import { DashboardRoute, SalaryRoute } from "./routes/RoleDashboardRoute";
import { StudentPortalLayout } from "./layouts/StudentPortalLayout/StudentPortalLayout";
import { NotFound } from "./pages/NotFound";
import { Layout } from "./layouts/layout";
import LoginPage from "./pages/Login/Login";
import { LazyPage } from "./components/LazyPage";
import { lazyDefault, lazyNamed } from "./utils/lazyPage";

// Only what every visit needs is in the first download: the route guards, the
// shell (Layout), the login page and the Dashboard (inside DashboardRoute). Every
// other page is its own chunk, fetched the first time it is opened - until then
// its code (and the charts, forms and tables behind it) costs nothing. A page
// that suspends keeps the header and sidebar on screen (see Shell / Page).
const StudentPortalDashboard = lazyNamed(() => import("./pages/StudentPortal/Dashboard/Dashboard"), "StudentPortalDashboard");
const StudentPortalAttendance = lazyNamed(() => import("./pages/StudentPortal/Attendance/Attendance"), "StudentPortalAttendance");
const StudentPortalBalance = lazyNamed(() => import("./pages/StudentPortal/Balance/Balance"), "StudentPortalBalance");
const StudentPortalPayments = lazyNamed(() => import("./pages/StudentPortal/Payments/Payments"), "StudentPortalPayments");
const StudentPortalGroups = lazyNamed(() => import("./pages/StudentPortal/Groups/Groups"), "StudentPortalGroups");
const StudentPortalProfile = lazyNamed(() => import("./pages/StudentPortal/Profile/Profile"), "StudentPortalProfile");
const StudentPortalSchedule = lazyNamed(() => import("./pages/StudentPortal/Schedule/Schedule"), "StudentPortalSchedule");
const Budget = lazyNamed(() => import("./pages/Budget"), "Budget");
const Teachers = lazyNamed(() => import("./pages/Teachers/Teachers"), "Teachers");
const Leads = lazyNamed(() => import("./pages/Leads/Leads"), "Leads");
const Students = lazyNamed(() => import("./pages/Students/Students"), "Students");
const StudentProfile = lazyNamed(() => import("./pages/StudentProfile/StudentProfile"), "StudentProfile");
const Reminders = lazyNamed(() => import("./pages/Reminders"), "Reminders");
const SignUp = lazyDefault(() => import("./pages/SignUp/SignUp"));
const Profile = lazyDefault(() => import("./pages/Profile/Profile"));
const Notifications = lazyNamed(() => import("./pages/Notifications/Notifications"), "Notifications");
const TeacherProfile = lazyNamed(() => import("./pages/TeacherProfile"), "TeacherProfile");
const Rating = lazyNamed(() => import("./pages/Rating"), "Rating");
const TeacherAttendanceReport = lazyNamed(() => import("./pages/TeacherAddanceReport"), "TeacherAttendanceReport");
// Temporarily hidden: the Attendance reports page (/attendance-reports). Its code
// stays in pages/AttandanceReport; restore this import, the route below and the
// "Attendance reports" entry in Sidebar.tsx to bring it back.
// const AttendanceReport = lazyNamed(() => import("./pages/AttandanceReport"), "AttendanceReport");
const Settings = lazyNamed(() => import("./pages/Settings/Settings"), "Settings");
const SettingsSms = lazyNamed(() => import("./pages/Settings/pages/sms"), "SettingsSms");
const Grade = lazyNamed(() => import("./pages/Settings/pages/grade"), "Grade");
const Voip = lazyNamed(() => import("./pages/Settings/pages/voip"), "Voip");
const CEO = lazyNamed(() => import("./pages/Settings/ceo/ceo"), "CEO");
const General = lazyNamed(() => import("./pages/Settings/ceo/pages/general"), "General");
const Staff = lazyNamed(() => import("./pages/Settings/ceo/pages/staff"), "Staff");
const Roadmap = lazyNamed(() => import("./pages/Settings/ceo/pages/roadmap"), "Roadmap");
const Billing = lazyNamed(() => import("./pages/Settings/ceo/pages/billing"), "Billing");
const Branches = lazyNamed(() => import("./pages/Settings/ceo/pages/branches"), "Branches");
const Office = lazyNamed(() => import("./pages/Settings/office/office"), "Office");
const Courses = lazyNamed(() => import("./pages/Settings/office/pages"), "Courses");
const SingleCourse = lazyNamed(() => import("./pages/SingleCourse"), "SingleCourse");
const Rooms = lazyNamed(() => import("./pages/Settings/office/pages"), "Rooms");
const Holidays = lazyNamed(() => import("./pages/Settings/office/pages"), "Holidays");
const StudentLeft = lazyNamed(() => import("./pages/Settings/office/pages"), "StudentLeft");
const StudentFreezes = lazyNamed(() => import("./pages/Settings/office/pages"), "StudentFreezes");
const Archive = lazyNamed(() => import("./pages/Settings/office/pages"), "Archive");
const Forms = lazyNamed(() => import("./pages/Settings/forms"), "Forms");
const Lists = lazyNamed(() => import("./pages/Settings/forms/pages"), "Lists");
const CreateForm = lazyNamed(() => import("./pages/Settings/forms/pages/createForm"), "CreateForm");
const Blog = lazyNamed(() => import("./pages/Settings/blog"), "Blog");
const WhatsNew = lazyNamed(() => import("./pages/Settings/blog/pages"), "WhatsNew");
const BlogAdd = lazyNamed(() => import("./pages/Settings/blog/pages/wahts-new/add"), "BlogAdd");
const Finance = lazyNamed(() => import("./pages/Finance/Finance"), "Finance");
const AllPayments = lazyNamed(() => import("./pages/Finance/pages/AllPayments"), "AllPayments");
// Finance holds All payments and Debtors for now. The other pages stay in
// pages/Finance/pages; restore these imports, their routes below and their entries
// in Sidebar.tsx to bring them back. (Debtors has no rail entry of its own: the
// Dashboard's Debtors card opens it.)
// const Withdraw = lazyNamed(() => import("./pages/Finance/pages/Withdraw"), "Withdraw");
// const TotalExpenses = lazyNamed(() => import("./pages/Finance/pages/TotalExpenses"), "TotalExpenses");
// const Salaries = lazyNamed(() => import("./pages/Finance/pages/Salaries"), "Salaries");
const Debtors = lazyNamed(() => import("./pages/Finance/pages/Debtors"), "Debtors");
const Reports = lazyNamed(() => import("./pages/Reports/Reports"), "Reports");
const AttendanceReports = lazyNamed(() => import("./pages/Reports/pages/AttendenceReports"), "AttendanceReports");
const ConversionReports = lazyNamed(() => import("./pages/Reports/pages/ConversationReports"), "ConversionReports");
const LeadsReports = lazyNamed(() => import("./pages/Reports/pages/LeadsReports"), "LeadsReports");
const StudentsLeftGroup = lazyNamed(() => import("./pages/Reports/pages/StudentsLeftGroup"), "StudentsLeftGroup");
const Logs = lazyNamed(() => import("./pages/Reports/Logs"), "Logs");
const Workly = lazyNamed(() => import("./pages/Reports/Logs/pages"), "Workly");
const Sms = lazyNamed(() => import("./pages/Reports/Logs/pages"), "Sms");
const Call = lazyNamed(() => import("./pages/Reports/Logs/pages"), "Call");
const Log = lazyNamed(() => import("./pages/Reports/Logs/pages"), "Log");
const Tags = lazyNamed(() => import("./pages/Settings/tags"), "Tags");
const Tag = lazyNamed(() => import("./pages/Settings/tags/pages/tag/tag"), "Tag");
const ReasonsArchiving = lazyNamed(() => import("./pages/Settings/reasons_archiving"), "ReasonsArchiving");

// A staff page inside the shell: the header and sidebar are there at once, the
// page takes the content area as soon as its code has arrived.
const Shell = ({ children }: { children: ReactNode }) => (
  <Layout>
    <LazyPage>{children}</LazyPage>
  </Layout>
);

// The same for a nested page rendered through its parent's <Outlet/>: the parent
// page stays on screen while the child's code is fetched.
const Page = ({ children }: { children: ReactNode }) => <LazyPage>{children}</LazyPage>;


export const AppRouter = () => {
   return(
    <Routes>
        {/* Public routes — redirect to the role's landing page (/dashboard, or /portal for a student) if already authenticated */}
        <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage/>} />
        </Route>
        <Route path="/signup" element={<Page><SignUp /></Page>} />

        {/* Protected routes — redirect to /login if not authenticated */}
        <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            {/* Admin Dashboard for staff; the teacher's own schedule view for a
                TEACHER session (see RoleDashboardRoute.tsx). */}
            <Route path="/dashboard" element={<Shell><DashboardRoute/></Shell>} />
            {/* Teacher's own payroll page; staff are redirected to Finance →
                Salaries. Renders its own Layout (only the teacher variant needs one). */}
            <Route path="/salary" element={<SalaryRoute/>} />

            <Route element={<PermissionRoute label="LEADS" />}>
                <Route path="/leads" element={<Shell><Leads/></Shell>} />
            </Route>

            <Route element={<PermissionRoute label="TEACHERS" />}>
                <Route path="/teachers" element={<Shell><Teachers/></Shell>} />
                <Route path="/teachers/:id" element={<Shell><TeacherProfile/></Shell>} />
            </Route>

            <Route element={<PermissionRoute label="GROUPS" />}>
                <Route path="/groups" element={<Shell><GroupsRoute/></Shell>} />
                <Route path="/groups/:id" element={<Shell><GroupDetailRoute/></Shell>} />
            </Route>

            <Route element={<PermissionRoute label="STUDENTS" />}>
                <Route path="/students" element={<Shell><Students/></Shell>} />
                <Route path="/students/:id" element={<Shell><StudentProfile/></Shell>} />
            </Route>

            <Route path="/courses/:id" element={<Shell><SingleCourse/></Shell>} />
            <Route path="/reminders" element={<Shell><Reminders/></Shell>} />
            <Route path="/rating" element={<Shell><Rating/></Shell>} />
            <Route path="/budget" element={<Shell><Budget/></Shell>} />
            <Route path="/profile" element={<Shell><Profile/></Shell>} />
            {/* Temporarily hidden (see the import above). */}
            {/* <Route path="/attendance-reports" element={<Shell><AttendanceReport/></Shell>} /> */}
            <Route path="/teacher-attendance-reports" element={<Shell><TeacherAttendanceReport/></Shell>} />
            <Route path="/notifications" element={<Shell><Notifications/></Shell>} />

            {/* SETTINGS bundles several backend labels (USERS/BRANCHES/COURSES/
                ROOMS) under one nav icon — entry only requires ANY one of them
                (or the general SETTINGS label); Sidebar.tsx narrows which
                specific tabs are then visible. */}
            <Route element={<PermissionRoute label={["SETTINGS", "USERS", "BRANCHES", "COURSES", "ROOMS"]} />}>
            <Route path="/settings" element={<Shell><Settings/></Shell>} >
                <Route path="sms" element={<Page><SettingsSms /></Page>}/>
                <Route path="grade" element={<Page><Grade /></Page>}/>
                <Route path="voip" element={<Page><Voip /></Page>}/>

                <Route path="ceo"             element={<Page><CEO /></Page>} >
                    <Route path="general"      element={<Page><General /></Page>} />
                    <Route path="roadmap"      element={<Page><Roadmap /></Page>} />
                    <Route path="staff"        element={<Page><Staff /></Page>} />
                    <Route path="billing"      element={<Page><Billing /></Page>} />
                    <Route path="branches"      element={<Page><Branches /></Page>} />
                </Route>

                <Route path="office"             element={<Page><Office /></Page>} >
                    <Route path="courses"      element={<Page><Courses /></Page>} />
                    <Route path="archive"      element={<Page><Archive /></Page>} />
                    <Route path="rooms"      element={<Page><Rooms /></Page>} />
                    <Route path="holidays"        element={<Page><Holidays /></Page>} />
                    <Route path="students-left-group"      element={<Page><StudentLeft /></Page>} />
                    <Route path="student-freezes"      element={<Page><StudentFreezes /></Page>} />
                </Route>

                <Route path="forms"             element={<Page><Forms /></Page>} >
                    <Route path="list"      element={<Page><Lists /></Page>} />
                    <Route path="create" element={<Page><CreateForm /></Page>} />
                    <Route path="edit/:id" element={<Page><CreateForm /></Page>} />
                </Route>

                <Route path="blog"             element={<Page><Blog /></Page>} >
                    <Route path="whats-new"      element={<Page><WhatsNew /></Page>} />
                     <Route path="whats-new/add" element={<Page><BlogAdd /></Page>} />
                </Route>

                <Route path="reasons_archiving" element={<Page><ReasonsArchiving /></Page>} />

                <Route path="tags"             element={<Page><Tags /></Page>} >
                    <Route path="list"      element={<Page><Tag /></Page>} />
                </Route>

            </Route>

            {/* Viewing another staff member's profile by id (from Archive)
                requires the same access as Staff/Archive themselves — plain
                "/profile" above (viewing your own) stays open to everyone. */}
            <Route path="/profile/:id" element={<Shell><Profile/></Shell>} />
            </Route>

            {/* Finance is All payments (and Debtors, reached from the Dashboard) for
                now: the sidebar entry opens All payments directly (no submenu), and
                /finance itself lands on it. Entry needs FINANCE or PAYMENTS - the
                pages that EXPENSES / SALARIES opened are hidden. */}
            <Route element={<PermissionRoute label={["FINANCE", "PAYMENTS"]} />}>
            <Route path="/finance" element={<Shell><Finance/></Shell>}>
                <Route index element={<Navigate to="all-payments" replace />} />
                <Route path="all-payments"   element={<Page><AllPayments /></Page>} />
                <Route path="debtors"        element={<Page><Debtors /></Page>} />
                {/* Temporarily hidden (see the imports above):
                <Route path="withdraw"       element={<Page><Withdraw /></Page>} />
                <Route path="total-expenses" element={<Page><TotalExpenses /></Page>} />
                <Route path="salaries"       element={<Page><Salaries /></Page>} />
                */}
            </Route>
            </Route>

            <Route path="/reports" element={<Shell><Reports/></Shell>}>
                <Route path="conversation"   element={<Page><ConversionReports /></Page>} />
                <Route path="attendance"     element={<Page><AttendanceReports /></Page>} />
                <Route path="leads"            element={<Page><LeadsReports /></Page>} />
                <Route path="students-left"    element={<Page><StudentsLeftGroup /></Page>} />

                <Route path="logs"             element={<Page><Logs /></Page>} >
                    <Route path="workly"           element={<Page><Workly /></Page>} />
                    <Route path="sms"              element={<Page><Sms /></Page>} />
                    <Route path="call"             element={<Page><Call /></Page>} />
                    <Route path="log"              element={<Page><Log /></Page>} />
                </Route>

            </Route>
        </Route>

        {/* Student self-service portal — requires a STUDENT-role session
            (see src/routes/StudentRoute.tsx); a staff session is redirected
            away by ProtectedRoute above. */}
        <Route element={<StudentRoute />}>
            <Route path="/portal" element={<Navigate to="/portal/dashboard" replace />} />
            <Route path="/portal/dashboard" element={<StudentPortalLayout><Page><StudentPortalDashboard /></Page></StudentPortalLayout>} />
            <Route path="/portal/attendance" element={<StudentPortalLayout><Page><StudentPortalAttendance /></Page></StudentPortalLayout>} />
            <Route path="/portal/balance" element={<StudentPortalLayout><Page><StudentPortalBalance /></Page></StudentPortalLayout>} />
            <Route path="/portal/payments" element={<StudentPortalLayout><Page><StudentPortalPayments /></Page></StudentPortalLayout>} />
            <Route path="/portal/groups" element={<StudentPortalLayout><Page><StudentPortalGroups /></Page></StudentPortalLayout>} />
            <Route path="/portal/profile" element={<StudentPortalLayout><Page><StudentPortalProfile /></Page></StudentPortalLayout>} />
            <Route path="/portal/schedule" element={<StudentPortalLayout><Page><StudentPortalSchedule /></Page></StudentPortalLayout>} />
        </Route>

        <Route path="*" element={<NotFound />} />
    </Routes>
   )
}