import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { PublicRoute } from "./routes/PublicRoute";
import { StudentRoute } from "./routes/StudentRoute";
import { StudentPortalLayout } from "./layouts/StudentPortalLayout/StudentPortalLayout";
import { StudentPortalDashboard } from "./pages/StudentPortal/Dashboard/Dashboard";
import { StudentPortalAttendance } from "./pages/StudentPortal/Attendance/Attendance";
import { StudentPortalBalance } from "./pages/StudentPortal/Balance/Balance";
import { StudentPortalPayments } from "./pages/StudentPortal/Payments/Payments";
import { StudentPortalGroups } from "./pages/StudentPortal/Groups/Groups";
import { StudentPortalProfile } from "./pages/StudentPortal/Profile/Profile";
import { StudentPortalSchedule } from "./pages/StudentPortal/Schedule/Schedule";
import { NotFound } from "./pages/NotFound";
import { Dashboard } from "./pages/Dashboard";
import { Layout } from "./layouts/layout";
import { Budget } from "./pages/Budget";
import { Teachers } from "./pages/Teachers/Teachers";
import { Leads } from "./pages/Leads/Leads";
import { Groups } from "./pages/Groups/Groups";
import { Students } from "./pages/Students/Students";
import { StudentProfile } from "./pages/StudentProfile/StudentProfile";
import { Reminders } from "./pages/Reminders";
import SignUp from "./pages/SignUp/SignUp";
import LoginPage from "./pages/Login/Login";
import Profile  from "./pages/Profile/Profile";
import { Notifications } from "./pages/Notifications/Notifications";
import { SingleGroup } from "./pages/SingleGroup";
import { TeacherProfile } from "./pages/TeacherProfile";
import { Rating } from "./pages/Rating";
import { TeacherAttendanceReport } from "./pages/TeacherAddanceReport";
import { AttendanceReport } from "./pages/AttandanceReport";
import { Settings } from "./pages/Settings/Settings";
import { SettingsSms } from "./pages/Settings/pages/sms";
import { Grade } from "./pages/Settings/pages/grade";
import { Voip } from "./pages/Settings/pages/voip";
import { CEO } from "./pages/Settings/ceo/ceo";
import { General } from "./pages/Settings/ceo/pages/general";
import { Staff } from "./pages/Settings/ceo/pages/staff";
import { Roadmap } from "./pages/Settings/ceo/pages/roadmap";
import { Billing } from "./pages/Settings/ceo/pages/billing";
import { Branches } from "./pages/Settings/ceo/pages/branches";
import { Office } from "./pages/Settings/office/office";
import { Courses } from "./pages/Settings/office/pages";
import { SingleCourse } from "./pages/SingleCourse";
import { Rooms } from "./pages/Settings/office/pages";
import { Holidays } from "./pages/Settings/office/pages";
import { StudentLeft } from "./pages/Settings/office/pages";
import { StudentFreezes } from "./pages/Settings/office/pages";
import { Archive } from "./pages/Settings/office/pages";
import { Forms } from "./pages/Settings/forms";
import { Lists } from "./pages/Settings/forms/pages";
import { CreateForm } from "./pages/Settings/forms/pages/createForm";
import { Blog } from "./pages/Settings/blog";
import { WhatsNew } from "./pages/Settings/blog/pages";
import { BlogAdd } from "./pages/Settings/blog/pages/wahts-new/add";
import { Finance } from "./pages/Finance/Finance";
import { AllPayments } from "./pages/Finance/pages/AllPayments";
import { Withdraw } from "./pages/Finance/pages/Withdraw";
import { TotalExpenses } from "./pages/Finance/pages/TotalExpenses";
import { Salaries } from "./pages/Finance/pages/Salaries";
import { Debtors } from "./pages/Finance/pages/Debtors";
import { Reports } from "./pages/Reports/Reports";
import { AttendanceReports } from "./pages/Reports/pages/AttendenceReports";
import { ConversionReports } from "./pages/Reports/pages/ConversationReports";
import { LeadsReports } from "./pages/Reports/pages/LeadsReports";
import { StudentsLeftGroup } from "./pages/Reports/pages/StudentsLeftGroup";       
import { Logs } from "./pages/Reports/Logs";
import { Workly, Sms, Call, Log } from "./pages/Reports/Logs/pages";
import { Tags } from "./pages/Settings/tags";
import { Tag } from "./pages/Settings/tags/pages/tag/tag";


export const AppRouter = () => {
   return(
    <Routes>
        {/* Public routes — redirect to /dashboard if already authenticated */}
        <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage/>} />
        </Route>
        <Route path="/signup" element={<SignUp/>} />

        {/* Protected routes — redirect to /login if not authenticated */}
        <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Layout><Dashboard/></Layout>} />
            <Route path="/leads" element={<Layout><Leads/></Layout>} />
            <Route path="/teachers" element={<Layout><Teachers/></Layout>} />
            <Route path="/teachers/:id" element={<Layout><TeacherProfile/></Layout>} />
            <Route path="/groups" element={<Layout><Groups/></Layout>} />
            <Route path="/groups/:id" element={<Layout><SingleGroup/></Layout>} />
            <Route path="/students" element={<Layout><Students/></Layout>} />
            <Route path="/students/:id" element={<Layout><StudentProfile/></Layout>} />
            <Route path="/courses/:id" element={<Layout><SingleCourse/></Layout>} />
            <Route path="/reminders" element={<Layout><Reminders/></Layout>} />
            <Route path="/rating" element={<Layout><Rating/></Layout>} />
            <Route path="/budget" element={<Layout><Budget/></Layout>} />
            <Route path="/profile" element={<Layout><Profile/></Layout>} />
            <Route path="/attendance-reports" element={<Layout><AttendanceReport/></Layout>} />
            <Route path="/teacher-attendance-reports" element={<Layout><TeacherAttendanceReport/></Layout>} />
            <Route path="/notifications" element={<Layout><Notifications/></Layout>} />

            <Route path="/settings" element={<Layout><Settings/></Layout>} >
                <Route path="sms" element={<SettingsSms/>}/>
                <Route path="grade" element={<Grade/>}/>
                <Route path="voip" element={<Voip/>}/>

                <Route path="ceo"             element={<CEO />} >
                    <Route path="general"      element={<General />} />
                    <Route path="roadmap"      element={<Roadmap />} />
                    <Route path="staff"        element={<Staff />} />
                    <Route path="billing"      element={<Billing />} />
                    <Route path="branches"      element={<Branches />} />
                </Route>

                <Route path="office"             element={<Office />} >
                    <Route path="courses"      element={<Courses />} />
                    <Route path="archive"      element={<Archive />} />
                    <Route path="rooms"      element={<Rooms />} />
                    <Route path="holidays"        element={<Holidays />} />
                    <Route path="students-left-group"      element={<StudentLeft />} />
                    <Route path="student-freezes"      element={<StudentFreezes />} />
                </Route>

                <Route path="forms"             element={<Forms />} >
                    <Route path="list"      element={<Lists />} />
                    <Route path="create" element={<CreateForm />} />
                    <Route path="edit/:id" element={<CreateForm />} />
                </Route>

                <Route path="blog"             element={<Blog />} >
                    <Route path="whats-new"      element={<WhatsNew />} />
                     <Route path="whats-new/add" element={<BlogAdd />} />
                </Route>

                <Route path="tags"             element={<Tags />} >
                    <Route path="list"      element={<Tag />} />
                </Route>

            </Route>

            <Route path="/finance" element={<Layout><Finance/></Layout>}>
                <Route path="all-payments"   element={<AllPayments />} />
                <Route path="withdraw"       element={<Withdraw />} />
                <Route path="total-expenses" element={<TotalExpenses />} />
                <Route path="salaries"       element={<Salaries />} />
                <Route path="debtors"        element={<Debtors />} />
            </Route>

            <Route path="/reports" element={<Layout><Reports/></Layout>}>
                <Route path="conversation"   element={<ConversionReports />} />
                <Route path="attendance"     element={<AttendanceReports />} />
                <Route path="leads"            element={<LeadsReports />} />
                <Route path="students-left"    element={<StudentsLeftGroup />} />

                <Route path="logs"             element={<Logs />} >
                    <Route path="workly"           element={<Workly />} />
                    <Route path="sms"              element={<Sms />} />
                    <Route path="call"             element={<Call />} />
                    <Route path="log"              element={<Log />} />
                </Route>

            </Route>
        </Route>

        {/* Student self-service portal — requires a STUDENT-role session
            (see src/routes/StudentRoute.tsx); a staff session is redirected
            away by ProtectedRoute above. */}
        <Route element={<StudentRoute />}>
            <Route path="/portal" element={<Navigate to="/portal/dashboard" replace />} />
            <Route path="/portal/dashboard" element={<StudentPortalLayout><StudentPortalDashboard/></StudentPortalLayout>} />
            <Route path="/portal/attendance" element={<StudentPortalLayout><StudentPortalAttendance/></StudentPortalLayout>} />
            <Route path="/portal/balance" element={<StudentPortalLayout><StudentPortalBalance/></StudentPortalLayout>} />
            <Route path="/portal/payments" element={<StudentPortalLayout><StudentPortalPayments/></StudentPortalLayout>} />
            <Route path="/portal/groups" element={<StudentPortalLayout><StudentPortalGroups/></StudentPortalLayout>} />
            <Route path="/portal/profile" element={<StudentPortalLayout><StudentPortalProfile/></StudentPortalLayout>} />
            <Route path="/portal/schedule" element={<StudentPortalLayout><StudentPortalSchedule/></StudentPortalLayout>} />
        </Route>

        <Route path="*" element={<NotFound />} />
    </Routes>
   )
}