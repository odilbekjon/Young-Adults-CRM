import { Box, Typography, Paper } from "@mui/material";
export const History = () => (
  <Box>
    <Typography variant="h6" fontWeight={600} mb={2}>History</Typography>
    <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2, color: "#999" }}>
      No history yet
    </Paper>
  </Box>
);
