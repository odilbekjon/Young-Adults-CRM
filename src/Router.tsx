import { Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { Home } from "./pages/Home";
import { Layout } from "./layouts/layout";
import { Archive } from "./pages/Archive";
import { Budget } from "./pages/Budget";
import { Teachers } from "./pages/Teachers/Teachers";
import { Leads } from "./pages/Leads/Leads";
import { Groups } from "./pages/Groups/Groups";
import { Students } from "./pages/Students/Students";
import Report from "./pages/Report/Report";
import { Reminders } from "./pages/Reminders";
import SignUp from "./pages/SignUp/SignUp";
import LoginPage from "./pages/Login/Login";
import Profile  from "./pages/Profile/Profile";
import { Notifications } from "./pages/Notifications/Notifications";


export const AppRouter = () => {
   return(
    <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/signup" element={<SignUp/>} />
        <Route path="/login" element={<LoginPage/>} />
        <Route path="/dashboard" element={<Layout><Dashboard/></Layout>} />
        <Route path="/leads" element={<Layout><Leads/></Layout>} />
        <Route path="/teachers" element={<Layout><Teachers/></Layout>} />
        <Route path="/groups" element={<Layout><Groups/></Layout>} />
        <Route path="/students" element={<Layout><Students/></Layout>} />
        <Route path="/reminders" element={<Layout><Reminders/></Layout>} />
        <Route path="/budget" element={<Layout><Budget/></Layout>} />
        <Route path="/report" element={<Layout><Report/></Layout>} />
        <Route path="/profile" element={<Layout><Profile/></Layout>} />
        <Route path="/notifications" element={<Layout><Notifications/></Layout>} />
        <Route path="/settings/archive" element={<Layout><Archive/></Layout>} />
    </Routes>
   )
}