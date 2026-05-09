import { Navigate, Route, Routes } from "react-router-dom";
import { Box } from "@mui/material";

// ─── Sub-pages ────────────────────────────────────────────────────────────────

const AllPayments   = () => <Box p={3}><h2>All payments</h2></Box>;
const Withdraw      = () => <Box p={3}><h2>Withdraw</h2></Box>;
const TotalExpenses = () => <Box p={3}><h2>Total Expenses</h2></Box>;
const SalariesNew   = () => <Box p={3}><h2>Salaries new</h2></Box>;
const Debtors       = () => <Box p={3}><h2>Debtors</h2></Box>;

// ─── Finance (router shell) ───────────────────────────────────────────────────

export const Finance = () => {
  return (
    <Routes>
      <Route index element={<Navigate to="all-payments" replace />} />
      <Route path="all-payments"   element={<AllPayments />} />
      <Route path="withdraw"       element={<Withdraw />} />
      <Route path="total-expenses" element={<TotalExpenses />} />
      <Route path="salaries"       element={<SalariesNew />} />
      <Route path="debtors"        element={<Debtors />} />
    </Routes>
  );
};