import { Teachers } from "../../../../constants";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

export const Expense = () => (
  <div>
    <TableContainer color="primary">
      <Table sx={{ minWidth: 650, bgcolor: "#fff" }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>Full Name</TableCell>
            <TableCell align="right">Phone number</TableCell>
            <TableCell align="right">Groups</TableCell>
            <TableCell align="right">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Teachers.map((teacher) => (
            <TableRow
              key={teacher.fullName}
              sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
            >
              <TableCell component="th" scope="row">
                {teacher.fullName}
              </TableCell>
              <TableCell align="right">{teacher.phone}</TableCell>
              <TableCell align="right">{teacher.groups}</TableCell>
              <TableCell align="right"></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </div>
);
