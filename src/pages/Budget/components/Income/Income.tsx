import { TEACHERS_DATA } from "../../../../constants";
import { useTheme } from "@mui/material/styles";

import {
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { IoIosArrowDown } from "react-icons/io";
export const Income = () => {
  const theme = useTheme();

  return (
    <div>
      <Stack direction="row" sx={{ gap: "20px" }} alignItems="center">
        <Select
          IconComponent={IoIosArrowDown}
          sx={{
            border: "none",
            paddingRight: "13px",
            ".MuiOutlinedInput-notchedOutline": { border: 0 },
            fontSize: "34px",
            fontWeight: "bold",
            color: theme.palette.primary.main,
            width: "fit-content",
            ".MuiSelect-icon": {
              color: theme.palette.primary.main,
              transition: "transform 0.2s ease-in-out",
              right: "0px",
            },
          }}
          displayEmpty
          defaultValue="total-income"
        >
          <MenuItem value={"total-income"}>Total Income</MenuItem>
          <MenuItem value={"new-elementary"}>New elementary</MenuItem>
          <MenuItem value={"test-group"}>Test group</MenuItem>
          <MenuItem value={"new-elementary"}>New elementary</MenuItem>
          <MenuItem value={"new-elementary2"}>New elementary2</MenuItem>
        </Select>
        <h1
          className="text-[30px] font-bold"
          style={{ color: theme.palette.primary.main }}
        >
          70.000 UZS
        </h1>
      </Stack>

      <TableContainer color="primary">
        <Table
          sx={{ minWidth: 650, bgcolor: "#fff" }}
          aria-label="simple table"
        >
          <TableHead>
            <TableRow>
              <TableCell>Full Name</TableCell>
              <TableCell >Phone number</TableCell>
              <TableCell >Groups</TableCell>
              <TableCell >Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {TEACHERS_DATA.map((teacher) => (
              <TableRow
                key={teacher.fullName}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  {teacher.fullName}
                </TableCell>
                <TableCell >{teacher.phone}</TableCell>
                <TableCell >{teacher.groups.length}</TableCell>
                <TableCell sx={{ml:10}}>...</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};
