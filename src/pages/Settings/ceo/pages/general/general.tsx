import { useState } from "react";
import { Box, Paper } from "@mui/material";
import { SIDEBAR_ITEMS } from "./Shared";
import GeneralContent from "./GeneralContent/GeneralContent";
import SignIn from "./SignIn/SignIn";
import LeadForm from "./LeadForm/LeadForm";
import PaymentMethods from "./PaymentMethods/PaymentMethods";
import Communication from "./Communication/Communication";
import Integrations from "./Integrations/Integrations";
import Exams from "./Exams/Exams";
import Invoice from "./Invoice/Invoice";
import Accural from "./Accural/Accural";
import LandingPage from "./LandingPage/LandingPage";

export const General = () => {
  const [activePage, setActivePage] = useState("general");

  const renderPage = () => {
    switch (activePage) {
      case "general":       return <GeneralContent />;
      case "signin":        return <SignIn />;
      case "lead":          return <LeadForm />;
      case "payment":       return <PaymentMethods />;
      case "communication": return <Communication />;
      case "integrations":  return <Integrations />;
      case "exams":         return <Exams />;
      case "invoice":       return <Invoice />;
      case "accural":       return <Accural />;
      case "landing":   return <LandingPage />;
      default:              return <GeneralContent />;
    }
  };

  return (
    <Box sx={{ padding: 2, minHeight: "100vh", background: "#f9fafb", display: "flex" }}>
      {/* Sidebar */}
      <Paper elevation={0} sx={{
        width: 200, minHeight: "100vh", borderRadius: 0,
        background: "#fff", borderRight: "1px solid #e5e7eb",
        display: "flex", flexDirection: "column", pt: 2, flexShrink: 0,
      }}>
        {SIDEBAR_ITEMS.map((item) => (
          <Box key={item.key} onClick={() => setActivePage(item.key)} sx={{
            px: 2.5, py: 1.3, fontSize: 13, cursor: "pointer",
            fontWeight: activePage === item.key ? 500 : 400,
            color: activePage === item.key ? "#2563eb" : "#6b7280",
            background: activePage === item.key ? "#eff6ff" : "transparent",
            borderRight: activePage === item.key ? "2px solid #2563eb" : "2px solid transparent",
            "&:hover": { background: "#f9fafb" },
            transition: "all 0.15s",
          }}>
            {item.label}
          </Box>
        ))}
      </Paper>

      {/* Active page */}
     <div className="flex-1 bg-gray-50">
       {renderPage()}
     </div>
    </Box>
  );
};