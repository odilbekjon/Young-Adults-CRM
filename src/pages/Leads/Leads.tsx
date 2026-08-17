import { useState } from "react";
import { Box } from "@mui/material";
import { FromWhere } from "../../components/FromWhere/FromWhere";
import { Sections } from "../../components/Sections/Sections";
import { ManageLeadColumnsDialog } from "../../components/Sections/ManageLeadColumnsDialog";
import { ManageLeadSourcesDialog } from "../../components/Sections/ManageLeadSourcesDialog";

export const Leads = () => {
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [sourcesDialogOpen, setSourcesDialogOpen] = useState(false);

  return (
    <Box
      sx={{
        backgroundColor: "#f5f7fb",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* FILTER BAR */}
      <FromWhere
        onOpenColumnSettings={() => setColumnsDialogOpen(true)}
        onOpenSourceSettings={() => setSourcesDialogOpen(true)}
      />

      {/* KANBAN BOARD */}
      <Box sx={{ flex: 1, p: 0, mt: 2, ml: 2 }}>
        <Sections />
      </Box>

      <ManageLeadColumnsDialog open={columnsDialogOpen} onClose={() => setColumnsDialogOpen(false)} />
      <ManageLeadSourcesDialog open={sourcesDialogOpen} onClose={() => setSourcesDialogOpen(false)} />
    </Box>
  );
};
