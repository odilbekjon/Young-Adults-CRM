import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
//   FormControl,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { MdOutlineCalendarToday } from "react-icons/md";

const periods = [
  "1 oy - 1 500 000 UZS",
  "3 oy - 4 050 000 UZS",
  "6 oy - 8 424 000 UZS",
  "9 oy - 12 636 000 UZS",
  "12 oy - 16 848 000 UZS",
];

const historyPayments = [
  { sum: "3000000 UZS", createdAt: "27.04.2026 10:31" },
  { sum: "3000000 UZS", createdAt: "23.03.2026 11:58" },
  { sum: "3000000 UZS", createdAt: "17.02.2026 16:12" },
  { sum: "9000000 UZS", createdAt: "02.12.2025 16:11" },
  { sum: "9000000 UZS", createdAt: "03.09.2025 16:36" },
  { sum: "0 UZS", createdAt: "02.09.2025 12:12" },
  { sum: "9000000 UZS", createdAt: "02.06.2025 11:55" },
  { sum: "9000000 UZS", createdAt: "01.03.2025 16:15" },
  { sum: "5400000 UZS", createdAt: "02.12.2024 16:48" },
];

interface PlanRow {
  months: number;
  price: number;
  discountedPrice: number | null;
  bonus: string | null;
}

interface Plan {
  name: string;
  color: string;
  rows: PlanRow[];
}

const plans: Plan[] = [
  {
    name: "START",
    color: "#f5a623",
    rows: [
      { months: 3, price: 1500000, discountedPrice: null, bonus: null },
      { months: 6, price: 3000000, discountedPrice: 2700000, bonus: null },
      { months: 9, price: 4500000, discountedPrice: 4050000, bonus: "+1 OY" },
      { months: 12, price: 6000000, discountedPrice: 5400000, bonus: "+2 OY" },
    ],
  },
  {
    name: "BASIC",
    color: "#f5a623",
    rows: [
      { months: 3, price: 3120000, discountedPrice: null, bonus: null },
      { months: 6, price: 6240000, discountedPrice: 5616000, bonus: null },
      { months: 9, price: 9360000, discountedPrice: 8424000, bonus: "+1 OY" },
      { months: 12, price: 12480000, discountedPrice: 11232000, bonus: "+2 OY" },
    ],
  },
  {
    name: "PRO",
    color: "#f5a623",
    rows: [
      { months: 3, price: 4680000, discountedPrice: null, bonus: null },
      { months: 6, price: 9360000, discountedPrice: 8424000, bonus: null },
      { months: 9, price: 14040000, discountedPrice: 12636000, bonus: "+1 OY" },
      { months: 12, price: 18720000, discountedPrice: 16848000, bonus: "+2 OY" },
    ],
  },
  {
    name: "PREMIUM",
    color: "#f5a623",
    rows: [
      { months: 3, price: 9000000, discountedPrice: null, bonus: null },
      { months: 6, price: 18000000, discountedPrice: 16200000, bonus: null },
      { months: 9, price: 27000000, discountedPrice: 24300000, bonus: "+1 OY" },
      { months: 12, price: 36000000, discountedPrice: 32400000, bonus: "+2 OY" },
    ],
  },
];

const fmt = (n: number) =>
  n.toLocaleString("ru-RU").replace(/,/g, " ");

export const Billing = () => {
  const [period, setPeriod] = useState("");

  return (
    <Box sx={{ p: 2, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      {/* License validity banner */}
      <Paper
        variant="outlined"
        sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.2, mb: 2, borderRadius: 1 }}
      >
        <MdOutlineCalendarToday size={16} color="#888" />
        <Typography fontSize={13} color="#555">
          Platform license validity date:{" "}
          <Box component="span" sx={{ color: "#1976d2", fontWeight: 500 }}>
            01.06.2026 - 23:59
          </Box>
        </Typography>
      </Paper>

      {/* Main content row */}
      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
        {/* Left: Payment form + History */}
        <Box sx={{ width: 580, flexShrink: 0 }}>
          {/* Payment form */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 2 }}>
            <Typography fontWeight={500} fontSize={16} mb={2.5}>
              Payment for the platform
            </Typography>

            <Typography fontSize={13} mb={0.5}>
              Period{" "}
              <Box component="span" sx={{ color: "red" }}>*</Box>
            </Typography>
            <Select
              fullWidth
              size="small"
              displayEmpty
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              renderValue={(val) =>
                val ? val : (
                  <Typography color="text.disabled" fontSize={14}>Select</Typography>
                )
              }
              sx={{ mb: 2.5, bgcolor: "#fff", fontSize: 14 }}
            >
              {periods.map((p) => (
                <MenuItem key={p} value={p} sx={{ fontSize: 14 }}>{p}</MenuItem>
              ))}
            </Select>

            <Button
              variant="contained"
              sx={{
                bgcolor: "#4db6c8",
                borderRadius: 5,
                px: 3,
                textTransform: "none",
                fontWeight: 600,
                "&:hover": { bgcolor: "#3aa3b5" },
              }}
            >
              Pay
            </Button>
          </Paper>

          {/* History payments */}
          <Box>
            <Typography fontWeight={500} fontSize={16} mb={1.5}>
              History payments
            </Typography>
            <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#fafafa" }}>
                    <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>Sum</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>Created at</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyPayments.map((row, i) => (
                    <TableRow
                      key={i}
                      sx={{ bgcolor: i % 2 === 0 ? "#f9f9f9" : "#fff" }}
                    >
                      <TableCell sx={{ fontSize: 13 }}>{row.sum}</TableCell>
                      <TableCell sx={{ fontSize: 13, color: "#555" }}>{row.createdAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>

        {/* Right: Pricing plans */}
        <Box sx={{ flex: 1 }}>
          <Paper
            variant="outlined"
            sx={{ borderRadius: 2, p: 2, bgcolor: "#fff" }}
          >
            {/* Plan headers */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, mb: 1 }}>
              {plans.map((plan) => (
                <Typography
                  key={plan.name}
                  fontWeight={800}
                  fontSize={20}
                  textAlign="center"
                  sx={{ letterSpacing: 1 }}
                >
                  {plan.name}
                </Typography>
              ))}
            </Box>

            {/* Plan rows */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1 }}>
              {plans.map((plan) => (
                <Box key={plan.name} sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
                  {plan.rows.map((row) => (
                    <Box
                      key={row.months}
                      sx={{
                        bgcolor: row.discountedPrice ? "#1a1a1a" : "#f5a623",
                        borderRadius: 1.5,
                        px: 1,
                        py: 0.8,
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.8,
                      }}
                    >
                      {/* Month badge */}
                      <Box
                        sx={{
                          bgcolor: row.discountedPrice ? "#f5a623" : "#1a1a1a",
                          borderRadius: 1,
                          px: 0.6,
                          py: 0.3,
                          minWidth: 28,
                          textAlign: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Typography fontSize={9} fontWeight={700} color="#fff" lineHeight={1.2}>
                          {row.months}
                        </Typography>
                        <Typography fontSize={8} fontWeight={600} color="#fff" lineHeight={1}>
                          OY
                        </Typography>
                      </Box>

                      {/* Prices */}
                      <Box sx={{ flex: 1, textAlign: "right" }}>
                        {row.discountedPrice ? (
                          <>
                            <Typography
                              fontSize={10}
                              sx={{ textDecoration: "line-through", color: "#aaa", lineHeight: 1.2 }}
                            >
                              {fmt(row.price)}
                            </Typography>
                            <Typography fontSize={13} fontWeight={700} color="#fff" lineHeight={1.2}>
                              {fmt(row.discountedPrice)}
                            </Typography>
                          </>
                        ) : (
                          <Typography fontSize={14} fontWeight={700} color="#fff" lineHeight={1.4}>
                            {fmt(row.price)}
                          </Typography>
                        )}
                      </Box>

                      {/* Bonus badge */}
                      {row.bonus && (
                        <Box
                          sx={{
                            position: "absolute",
                            right: -4,
                            top: "50%",
                            transform: "translateY(-50%)",
                            bgcolor: "#fff",
                            border: "1px solid #e0e0e0",
                            borderRadius: "50%",
                            width: 28,
                            height: 28,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "column",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                          }}
                        >
                          <Typography fontSize={7} fontWeight={700} color="#1a1a1a" lineHeight={1}>
                            {row.bonus}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>

            {/* Footer */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
              <Typography
                fontWeight={700}
                fontSize={15}
                sx={{
                  "& span": { color: "#f5a623" },
                }}
              >
                {/* mod<Box component="span">me</Box> */}
              </Typography>
              <Typography fontSize={13} color="#555">
                Gamification{" "}
                <Box component="span" sx={{ color: "#f5a623", fontWeight: 600 }}>
                  500 000
                </Box>{" "}
                so'm
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};