import { Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { Layout } from "./layouts/layout";
import { Budget } from "./pages/Budget";
import { Teachers } from "./pages/Teachers/Teachers";
import { Leads } from "./pages/Leads/Leads";
import { Groups } from "./pages/Groups/Groups";
import { Students } from "./pages/Students/Students";
import {Report} from "./pages/Report/Report";
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
        <Route path="/reports" element={<Layout><Report/></Layout>} />
        <Route path="/attendance-reports" element={<Layout><AttendanceReport/></Layout>} />
        <Route path="/teacher-attendance-reports" element={<Layout><TeacherAttendanceReport/></Layout>} />
        <Route path="/notifications" element={<Layout><Notifications/></Layout>} />
        <Route path="/settings" element={<Layout><Settings/></Layout>} />
        <Route path="/finance" element={<Layout><Finance/></Layout>} />
    </Routes>
   )
}