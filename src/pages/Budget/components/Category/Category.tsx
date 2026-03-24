import {
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { FaTrash } from "react-icons/fa";
import { RiEdit2Fill } from "react-icons/ri";

export const Category = () => (
  <div>
    <TableContainer color="primary">
      <Table sx={{ minWidth: 650, bgcolor: "#fff" }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell align="left" sx={{ width: "20px" }}></TableCell>
            <TableCell align="left">Category</TableCell>
            <TableCell align="right"></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
            <TableCell
              component="th"
              scope="row"
              align="left"
              sx={{ width: "20px" }}
            >
              1
            </TableCell>
            <TableCell align="left">Office ishlari uchun</TableCell>
            <TableCell
              align="right"
              sx={{ display: "flex", gap: "20px", alignItems: "center" }}
            >
              <IconButton
                color="info"
                sx={{
                  padding: "4px",
                  width: "32px",
                  height: "32px",
                  border: "1px solid",
                  borderColor: "info.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                }}
              >
                <RiEdit2Fill />
              </IconButton>

              <IconButton
                color="error"
                sx={{
                  padding: "4px",
                  width: "32px",
                  height: "32px",
                  border: "1px solid",
                  borderColor: "error.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                }}
              >
                <FaTrash size={15} />
              </IconButton>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  </div>
);
