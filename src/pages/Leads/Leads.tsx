import { useState } from "react";
import { Box } from "@mui/material";
import { FromWhere } from "../../components/FromWhere/FromWhere";
import { EMPTY_LEAD_FILTERS, type LeadFilters } from "../../components/FromWhere/leadFilters";
import { Sections } from "../../components/Sections/Sections";
import { ManageLeadColumnsDialog } from "../../components/Sections/ManageLeadColumnsDialog";
import { ManageLeadSourcesDialog } from "../../components/Sections/ManageLeadSourcesDialog";

export const Leads = () => {
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_LEAD_FILTERS);
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [sourcesDialogOpen, setSourcesDialogOpen] = useState(false);

  return (
    <Box
      sx={{
        backgroundColor: "background.default",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* FILTER BAR */}
      <FromWhere
        filters={filters}
        onChange={setFilters}
        onOpenColumnSettings={() => setColumnsDialogOpen(true)}
        onOpenSourceSettings={() => setSourcesDialogOpen(true)}
      />

      {/* KANBAN BOARD */}
      <Box sx={{ flex: 1, p: 0, mt: 2, ml: 2 }}>
        <Sections filters={filters} />
      </Box>

      <ManageLeadColumnsDialog open={columnsDialogOpen} onClose={() => setColumnsDialogOpen(false)} />
      <ManageLeadSourcesDialog open={sourcesDialogOpen} onClose={() => setSourcesDialogOpen(false)} />
    </Box>
  );
};
