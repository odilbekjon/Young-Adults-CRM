/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Box, Typography, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface Student {
  id: number;
  name: string;
  attendance: number;
}

interface Course {
  id: number;
  name: string;
  revenue: number;
}

// Sample data
const students: Student[] = [
  { id: 1, name: "Ali Raxmatov", attendance: 80 },
  { id: 2, name: "Zarina Abdurahmonova", attendance: 95 },
  { id: 3, name: "Rustam Qodirov", attendance: 60 },
  { id: 4, name: "Nodir Islomov", attendance: 100 },
];

const courses: Course[] = [
  { id: 1, name: "Frontend Basics", revenue: 1200000 },
  { id: 2, name: "React Advanced", revenue: 950000 },
  { id: 3, name: "Node.js & Express", revenue: 700000 },
];

const revenueData = courses.map(c => ({ name: c.name, value: c.revenue }));
const COLORS = ["#0088FE", "#00C49F", "#FFBB28"];

const studentAttendanceData = students.map(s => ({
  name: s.name,
  attendance: s.attendance,
}));

const Report: React.FC = () => {
  return (
    <Box sx={{ p: 4, minHeight: "100vh", backgroundColor: "#f5f7fb" }}>
      <Typography variant="h4" fontWeight={700} mb={4}>
        CRM Reports
      </Typography>

      <Grid container spacing={4}>
        {/* O'quvchilar attendance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Student Attendance
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={studentAttendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => `${Number(value).toLocaleString()}%`} />
                <Line type="monotone" dataKey="attendance" stroke="#1976d2" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Kurslar bo'yicha daromad */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Revenue by Course
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={revenueData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {revenueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `${Number(value).toLocaleString()} UZS`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Student table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Student Attendance Table
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Student Name</TableCell>
                    <TableCell>Attendance %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map(student => (
                    <TableRow key={student.id}>
                      <TableCell>{student.id}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.attendance}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Report;