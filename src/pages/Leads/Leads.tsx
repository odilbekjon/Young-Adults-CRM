import { Box } from "@mui/material";
import { FromWhere } from "../../components/FromWhere/FromWhere";
import { Sections } from "../../components/Sections/Sections";

export const Leads = () => {
  return (
    <Box
      sx={{
        
        // height: "100vh",
        backgroundColor: "#f5f7fb",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* FILTER BAR */}
      <FromWhere />

      {/* KANBAN BOARD */}
      <Box  sx={{ flex: 1, p: 0, mt: 2, ml:2 }}>
        <Sections />
      </Box>
    </Box>
  );
};