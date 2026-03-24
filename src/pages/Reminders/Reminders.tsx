import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
} from "@mui/material";
import { MdAdd, MdAccessTime } from "react-icons/md";
import { useState } from "react";

type Reminder = {
  id: number;
  title: string;
  date: string;
  time: string;
  status: "upcoming" | "done" | "late";
};

const initialData: Reminder[] = [
  {
    id: 1,
    title: "Frontend group lesson",
    date: "2024-06-10",
    time: "10:00",
    status: "upcoming",
  },
  {
    id: 2,
    title: "Student payment check",
    date: "2024-06-08",
    time: "14:00",
    status: "late",
  },
  {
    id: 3,
    title: "Meeting with teachers",
    date: "2024-06-07",
    time: "16:00",
    status: "done",
  },
];

export const Reminders = () => {
  const [reminders ] = useState<Reminder[]>(initialData);

  return (
    <Box p={4} bgcolor="#f5f7fb" minHeight="100vh">
      
      {/* ===== HEADER ===== */}
      <Box display="flex" justifyContent="space-between" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Reminders
          </Typography>
          <Typography color="text.secondary">
            Barcha eslatmalar va vazifalar
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<MdAdd />}
        >
          Add Reminder
        </Button>
      </Box>

      {/* ===== LIST ===== */}
      <Grid container spacing={3}>
        {reminders.map((item) => (
          <Grid item xs={12} md={6} lg={4} key={item.id}>
            
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>

                {/* TITLE */}
                <Typography fontWeight={600} mb={1}>
                  {item.title}
                </Typography>

                {/* DATE */}
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <MdAccessTime />
                  <Typography variant="body2">
                    {item.date} | {item.time}
                  </Typography>
                </Box>

                {/* STATUS */}
                <Chip
                  label={item.status}
                  color={
                    item.status === "upcoming"
                      ? "primary"
                      : item.status === "done"
                      ? "success"
                      : "error"
                  }
                  size="small"
                />

              </CardContent>
            </Card>

          </Grid>
        ))}
      </Grid>
    </Box>
  );
};