import { Box, Typography, Paper, Button, Stack } from "@mui/material";
import { useState } from "react";

const times = [
  "08:00","09:00","10:00","11:00","12:00",
  "14:00","15:00","16:00","17:00","18:00"
];

const rooms = [
  "1-xona","3-xona","4-xona","5-xona",
  "6-xona","7-xona","8-xona"
];

const lessons = [
  { roomIndex: 3, timeIndex: 1, title: "IELTS", teacher: "Ugilbek", type: "odd" },
  { roomIndex: 2, timeIndex: 0, title: "Math", teacher: "Dilshod", type: "even" },
  { roomIndex: 1, timeIndex: 4, title: "Physics", teacher: "Aziza", type: "other" },
];

export const Schedule = () => {
  const [filter, setFilter] = useState("all"); // all | odd | even | other

  // Filtrlash funksiyasi
  const filteredLessons = lessons.filter(l => filter === "all" || l.type === filter);

  return (
    <Paper sx={{ mt: 6, p: 3, borderRadius: 4 }}>
      <Typography variant="h6" mb={3} fontWeight={600}>
        Schedule
      </Typography>

      {/* Filter Buttons */}
      <Stack direction="row" spacing={2} mb={3}>
        {["all", "odd", "even", "other"].map(f => (
          <Button
            key={f}
            variant={filter === f ? "contained" : "outlined"}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `120px repeat(${times.length}, 1fr)`,
        }}
      >
        {/* HEADER */}
        <Box />
        {times.map((time, i) => (
          <Box key={i} textAlign="center" fontSize={12} color="#888">
            {time}
          </Box>
        ))}

        {/* ROOMS + CELLS */}
        {rooms.map((room, rowIndex) => (
          <Box key={rowIndex} sx={{ display: "contents" }}>
            {/* ROOM NAME */}
            <Box
              sx={{
                borderTop: "1px solid #eee",
                height: 80,
                display: "flex",
                alignItems: "center",
                fontWeight: 600,
              }}
            >
              {room}
            </Box>

            {/* CELLS */}
            {times.map((_, colIndex) => {
              const lesson = filteredLessons.find(
                l => l.roomIndex === rowIndex && l.timeIndex === colIndex
              );

              return (
                <Box
                  key={colIndex}
                  sx={{
                    border: "1px solid #f1f1f1",
                    height: 80,
                    p: 1,
                  }}
                >
                  {lesson && (
                    <Box
                      sx={{
                        height: "100%",
                        borderRadius: 2,
                        background: "#a855f7",
                        color: "#fff",
                        p: 1,
                        fontSize: 12,
                      }}
                    >
                      <div>{lesson.title}</div>
                      <div>{lesson.teacher}</div>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Paper>
  );
};