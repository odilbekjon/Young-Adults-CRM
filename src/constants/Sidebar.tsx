import { RxDashboard } from "react-icons/rx";
import { FaUserPlus } from "react-icons/fa";
import { FaUserTie } from "react-icons/fa6";
import { FaUsers } from "react-icons/fa6";
import { FaUserGraduate } from "react-icons/fa6";
import { AiFillDollarCircle } from "react-icons/ai";
import { BsBarChartFill } from "react-icons/bs";
import { FaClock } from "react-icons/fa6";

export const SIDE_BAR = [
    {
        label:"Dashboard",
        icon: <RxDashboard size={18} />,
        path:"/dashboard"
    },
    {
        label:"Leads",
        icon: <FaUserPlus size={18} />,
        path:"/leads"
    },
    {
        label:"Teachers",
        icon: <FaUserTie size={18} />,
        path:"/teachers"
    },
    {
        label:"Groups",
        icon: <FaUsers size={18} />,
        path:"/groups"
    },
    {
        label:"Students",
        icon: <FaUserGraduate size={18} />,
        path:"/students"
    },
    {
        label:"Reminders",
        icon: <FaClock  size={18} />,
        path:"/reminders"
    },
    {
        label:"Budget",
        icon: <AiFillDollarCircle size={18} />,
        path:"/budget"
    },
    {
        label:"Report",
        icon: <BsBarChartFill size={18} />,
        path:"/report"
    },
]

export const SETTINGS_LINKS = [
    {
        label:"General",
        path:"/settings/general",
    },
    {
        label:"Office",
        path:"/settings/office",
    },
    {
        label:"Ceo",
        path:"/settings/ceo",
    },
    {
        label:"Archive",
        path:"/settings/archive",
    },
]

