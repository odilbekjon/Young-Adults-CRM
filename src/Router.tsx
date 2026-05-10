import { Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { Layout } from "./layouts/layout";
import { Budget } from "./pages/Budget";
import { Teachers } from "./pages/Teachers/Teachers";
import { Leads } from "./pages/Leads/Leads";
import { Groups } from "./pages/Groups/Groups";
import { Students } from "./pages/Students/Students";
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
import { Finance } from "./pages/Finance/Finance";
import { AllPayments } from "./pages/Finance/pages/AllPayments";
import { Withdraw } from "./pages/Finance/pages/Withdraw";
import { TotalExpenses } from "./pages/Finance/pages/TotalExpenses";
import { Salaries } from "./pages/Finance/pages/Salaries";
import { Debtors } from "./pages/Finance/pages/Debtors";
import { Reports } from "./pages/Reports/Reports";
import { AttandanceReports } from "./pages/Reports/pages/AttendenceReports";
import { ConversationReports } from "./pages/Reports/pages/ConversationReports";
import { LeadsReports } from "./pages/Reports/pages/LeadsReports";
import { StudentsLeftGroup } from "./pages/Reports/pages/StudentsLeftGroup";       
import { Logs } from "./pages/Reports/logs/Logs";
import { Workly } from "./pages/Reports/logs/pages/workly";
import { Sms } from "./pages/Reports/logs/pages/sms";
import { Call } from "./pages/Reports/logs/pages/call";
import { Log } from "./pages/Reports/logs/pages/log";



export const AppRouter = () => {
   return(
    <Routes>
        <Route path="/" element={<LoginPage/>} />
        <Route path="/signup" element={<SignUp/>} />
        <Route path="/dashboard" element={<Layout><Dashboard/></Layout>} />
        <Route path="/leads" element={<Layout><Leads/></Layout>} />
        <Route path="/teachers" element={<Layout><Teachers/></Layout>} />
        <Route path="/teachers/:id" element={<Layout><TeacherProfile/></Layout>} />
        <Route path="/groups" element={<Layout><Groups/></Layout>} />
        <Route path="/groups/:id" element={<Layout><SingleGroup/></Layout>} />
        <Route path="/students" element={<Layout><Students/></Layout>} />
        <Route path="/reminders" element={<Layout><Reminders/></Layout>} />
        <Route path="/rating" element={<Layout><Rating/></Layout>} />
        <Route path="/budget" element={<Layout><Budget/></Layout>} />
        <Route path="/profile" element={<Layout><Profile/></Layout>} />
        <Route path="/attendance-reports" element={<Layout><AttendanceReport/></Layout>} />
        <Route path="/teacher-attendance-reports" element={<Layout><TeacherAttendanceReport/></Layout>} />
        <Route path="/notifications" element={<Layout><Notifications/></Layout>} />
        <Route path="/settings" element={<Layout><Settings/></Layout>} />
        <Route path="/finance" element={<Layout><Finance/></Layout>}>
            <Route path="all-payments"   element={<AllPayments />} />
            <Route path="withdraw"       element={<Withdraw />} />
            <Route path="total-expenses" element={<TotalExpenses />} />
            <Route path="salaries"       element={<Salaries />} />
            <Route path="debtors"        element={<Debtors />} />
        </Route>
        <Route path="/reports" element={<Layout><Reports/></Layout>}>
            <Route path="attendance"     element={<AttandanceReports />} />
            <Route path="conversation"   element={<ConversationReports />} />
            <Route path="leads"            element={<LeadsReports />} />
            <Route path="students-left"    element={<StudentsLeftGroup />} />

            <Route path="logs"             element={<Logs />} >
                <Route path="workly"           element={<Workly />} />
                <Route path="sms"              element={<Sms />} />
                <Route path="call"             element={<Call />} />
                <Route path="log"              element={<Log />} />
            </Route>

        </Route>

    </Routes>
   )
}