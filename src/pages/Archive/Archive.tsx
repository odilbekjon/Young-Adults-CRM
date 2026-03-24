import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Avatar,
} from "@mui/material";

type DroppedStudent = {
  id: number;
  fullName: string;
  phone: string;
  group: string;
  teacher: string;
  removedDate: string;
  reason: string;
  removedBy: string;
};

const data: DroppedStudent[] = [
  {
    id: 1,
    fullName: "Ali Valiyev",
    phone: "+998 90 123 45 67",
    group: "Frontend N12",
    teacher: "Shamsiddin",
    removedDate: "2024-06-01",
    reason: "To‘lov qilmagan",
    removedBy: "Admin",
  },
  {
    id: 2,
    fullName: "Vali Karimov",
    phone: "+998 91 987 65 43",
    group: "Backend N5",
    teacher: "Umar",
    removedDate: "2024-06-03",
    reason: "O‘zi chiqib ketgan",
    removedBy: "Manager",
  },
];

export const Archive = () => {
  return (
    <Box p={4} bgcolor="#f5f7fb" minHeight="100vh">
      
      {/* HEADER */}
      <Typography variant="h4" fontWeight={700} mb={3}>
        Dropped Students
      </Typography>

      {/* TABLE */}
      <Box bgcolor="white" borderRadius={3} overflow="hidden">
        <Table>
          <TableHead sx={{ backgroundColor: "#f0f0f0" }}>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Group</TableCell>
              <TableCell>Teacher</TableCell>
              <TableCell>Removed date</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Removed by</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                
                {/* STUDENT */}
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar>{item.fullName[0]}</Avatar>
                    <Box>
                      <Typography fontWeight={500}>
                        {item.fullName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.phone}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>

                <TableCell>{item.group}</TableCell>
                <TableCell>{item.teacher}</TableCell>
                <TableCell>{item.removedDate}</TableCell>

                {/* REASON */}
                <TableCell>
                  <Chip label={item.reason} color="error" size="small" />
                </TableCell>

                <TableCell>{item.removedBy}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
};