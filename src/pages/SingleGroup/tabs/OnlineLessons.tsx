import { Box, Typography, Button, Stack, Paper } from "@mui/material";
import { GoPlus } from "react-icons/go";

export const OnlineLessons = () => (
  <Box>
    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
      <Typography variant="h6" fontWeight={600}>Online lessons and materials</Typography>
      <Button startIcon={<GoPlus />} variant="contained" size="small">Add lesson</Button>
    </Stack>
    <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2, color: "#999" }}>
      No lessons added yet
    </Paper>
  </Box>
);