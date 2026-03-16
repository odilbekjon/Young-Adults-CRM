import { Box, Typography, Grid, Button } from "@mui/material";
import { FiPlus } from "react-icons/fi";
// import { FromWhere } from "./components/FromWhere";
// import { Sections } from "./components/Sections";

import { FromWhere } from "../../components/FromWhere/FromWhere";
import { Sections } from "../../components/Sections/Sections";

export const Leads = () => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
        p: 4,
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          mb: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Qo‘shimcha ma'lumotlar
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Young Adults o‘quv markazi qo‘shimcha ma'lumotlar ro‘yxati
          </Typography>
        </Box>

        <Button variant="contained" startIcon={<FiPlus />}>
          Add lead
        </Button>
      </Box>

      {/* CONTENT */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <FromWhere />
        </Grid>

        <Grid item xs={12} md={8}>
          <Sections />
        </Grid>
      </Grid>
    </Box>
  );
};