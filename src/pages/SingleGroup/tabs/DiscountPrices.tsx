// DiscountPrices.tsx
import { Box, Typography, Paper } from "@mui/material";
export const DiscountPrices = () => (
  <Box>
    <Typography variant="h6" fontWeight={600} mb={2}>Discount prices</Typography>
    <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2, color: "#999" }}>
      No discounts added yet
    </Paper>
  </Box>
);