import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Chip,
  Select,
  FormControl,
  InputLabel,
  Menu,
  // Dialog,
  // DialogTitle,
  // DialogContent,
  // DialogActions,
} from "@mui/material";
import { MdMoreVert } from "react-icons/md";
import { students as studentData } from "../../constants/Students";
import { AddStudentDialog } from "../../components/AddStudent/AddStudent";

export const Students = () => {
  const [students, setStudents] = useState(studentData);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedStudent, setSelectedStudent] = useState<typeof students[0] | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  // === Dropdown Actions ===
  const handleMenuClick = (
  event: React.MouseEvent<HTMLElement>,
  student: typeof students[0] // yoki sizning student tipingiz
) => {
  setAnchorEl(event.currentTarget );
  setSelectedStudent(student);
};

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedStudent(null);
  };

  const handleEdit = () => {
    alert(`Editing ${selectedStudent?.name}`);
    handleMenuClose();
  };

  const handleDelete = () => {
    setStudents((prev) => prev.filter((s) => s.id !== selectedStudent?.id));
    handleMenuClose();
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f5f7fb", p: 4 }}>
      {/* ===== HEADER ===== */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700}>
          Talabalar
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Young Adults o‘quv markazi talabalar ro‘yxati
        </Typography>
      </Box>

      {/* ===== FILTERS ===== */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField placeholder="Search student" size="small" />
        <FormControl size="small">
          <InputLabel>Finance status</InputLabel>
          <Select defaultValue="">
            <MenuItem value="">All</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel>Teacher</InputLabel>
          <Select defaultValue="">
            <MenuItem value="">All</MenuItem>
            <MenuItem value="shamsiddin">Shamsiddin</MenuItem>
            <MenuItem value="umar">Umar</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel>Course</InputLabel>
          <Select defaultValue="">
            <MenuItem value="">All</MenuItem>
            <MenuItem value="it_bootcamp">IT Bootcamp</MenuItem>
            <MenuItem value="it_english">IT English</MenuItem>
          </Select>
        </FormControl>
        <Button variant="outlined">Reset Filter</Button>
        <Button variant="contained" color="primary" onClick={() => setOpenDialog(true)}>
          + Add new student
        </Button>
      </Box>

      {/* ===== TABLE ===== */}
      <Box sx={{ overflowX: "auto" }}>
        <Table sx={{ border: "1px solid #ddd", borderRadius: 1 }}>
          <TableHead sx={{ backgroundColor: "#f0f0f0" }}>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Full Names</TableCell>
              <TableCell>Phone Number</TableCell>
              <TableCell>Groups</TableCell>
              <TableCell>Courses</TableCell>
              <TableCell>Teachers</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student, index) => (
              <TableRow
                key={student.id}
                sx={{ borderBottom: "1px solid #ddd" }}
              >
                <TableCell>{index + 1}</TableCell>
                <TableCell sx={{ display: "flex", alignItems: "center", gap: 1 }}>

                  {student.name}
                </TableCell>
                <TableCell>{student.phone}</TableCell>
                <TableCell>
                  {student.groups.map((g) => (
                    <Chip key={g} label={g} size="small" sx={{ mr: 0.5 }} />
                  ))}
                </TableCell>
                <TableCell>
                  {student.courses.map((c) => (
                    <Chip key={c} label={c} size="small" sx={{ mr: 0.5 }} />
                  ))}
                </TableCell>
                <TableCell>{student.teacher}</TableCell>
                <TableCell align="center">
                  <IconButton onClick={(e) => handleMenuClick(e, student)}>
                    <MdMoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* ===== DROPDOWN MENU ===== */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>Edit</MenuItem>
        <MenuItem onClick={handleDelete}>Delete</MenuItem>
      </Menu>

      <AddStudentDialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
      />

      {/* ===== PAGINATION ===== */}
      <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
        <Typography>1-6 of {students.length}</Typography>
        <Box>
          <Button>{"<"}</Button>
          <Button>{">"}</Button>
        </Box>
      </Box>
    </Box>
  );
};