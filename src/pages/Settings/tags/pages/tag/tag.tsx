import { useState } from "react";

import {
  Box,
  Button,
  Chip,
  Drawer,
  FormControl,
  IconButton,
//   InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";

import { RiDeleteBinLine } from "react-icons/ri";
import { FiEdit } from "react-icons/fi";
import { IoClose } from "react-icons/io5";

const rows = [
  {
    id: 4008,
    name: "Grammar Student",
    from: "Students",
  },
  {
    id: 4007,
    name: "IELTS Student",
    from: "Students",
  },
];

export const Tag = () => {
  const [open, setOpen] = useState(false);

  return (
    <Box
      sx={{
        width: "100%",
        p: 3,
      }}
    >
      {/* Header */}
      <Box className="flex items-center justify-between mb-3">
        <h1 className="text-3xl">Tags</h1>

        <Button
          onClick={() => setOpen(true)}
          sx={{
            backgroundColor:
              "rgb(23 37 84 / var(--tw-bg-opacity, 1))",
            color: "white",
            padding: "10px 26px",
            borderRadius: "50px",

            "&:hover": {
              backgroundColor:
                "rgb(30 41 110 / var(--tw-bg-opacity, 1))",
            },
          }}
        >
          Add new
        </Button>
      </Box>

      {/* Table */}
      <Box
        sx={{
          width: "100%",
          backgroundColor: "#fff",
          borderRadius: 2,
          border: "1px solid #e8eaed",
          p: 3,
        }}
      >
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: "10px",
            boxShadow: "none",
            border: "1px solid #e5e5e5",
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>
                  id
                </TableCell>

                <TableCell sx={{ fontWeight: 700 }}>
                  Name
                </TableCell>

                <TableCell sx={{ fontWeight: 700 }}>
                  From Where
                </TableCell>

                <TableCell sx={{ fontWeight: 700 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.id}</TableCell>

                  <TableCell>{row.name}</TableCell>

                  <TableCell>
                    <Chip
                      label={row.from}
                      sx={{
                        backgroundColor: "#0B5AA2",
                        color: "#fff",
                        fontWeight: 600,
                        borderRadius: "20px",
                        px: 1,
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    <IconButton>
                      <RiDeleteBinLine
                        size={20}
                        color="red"
                      />
                    </IconButton>

                    <IconButton>
                      <FiEdit
                        size={20}
                        color="#f4b400"
                      />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Drawer Modal */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
      >
        <Box
          sx={{
            width: 400,
            height: "100%",
            backgroundColor: "#fff",
          }}
        >
          {/* Top */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 2,
              borderBottom: "1px solid #e5e5e5",
            }}
          >
            <h2 className="text-2xl font-medium">
              Add new tags
            </h2>

            <IconButton onClick={() => setOpen(false)}>
              <IoClose size={28} color="#888" />
            </IconButton>
          </Box>

          {/* Form */}
          <Box
            sx={{
              p: 4,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {/* Name */}
            <Box>
              <p className="mb-3 text-[18px] text-gray-600">
                Name
              </p>

              <TextField
                fullWidth
                variant="outlined"
              />
            </Box>

            {/* Select */}
            <Box>
              <p className="mb-3 text-[18px] text-gray-600">
                From Where
              </p>

              <FormControl fullWidth>
                <Select defaultValue="Students">
                  <MenuItem value="Students">
                    Students
                  </MenuItem>

                  <MenuItem value="Teachers">
                    Teachers
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Button */}
            <Button
              variant="contained"
              sx={{
                width: "140px",
                py: 1.5,
                textTransform: "none",
                borderRadius: "8px",
              }}
            >
              Submit
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};