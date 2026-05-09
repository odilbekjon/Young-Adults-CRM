import { Box, Typography, Button, Stack, Paper } from "@mui/material";
import { GoPlus } from "react-icons/go";
export const Exams = () => (
  <Box>
    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
      <Typography variant="h6" fontWeight={600}>Exams</Typography>
      <Button startIcon={<GoPlus />} variant="contained" size="small">Add exam</Button>
    </Stack>
    <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2, color: "#999" }}>
      No exams added yet
    </Paper>
  </Box>
);