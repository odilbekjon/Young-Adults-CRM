import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Paper,
  Chip,
//   Divider,
} from "@mui/material";
import { MdEdit, MdDeleteOutline, MdArrowBack } from "react-icons/md";
import { defaultCourses } from "../../constants/CoursesData";
// import { BookIllustration } from "../Settings/office/pages";
// import { BookIllustration } from "../../constants/CoursesData";

const fmt = (n: number) =>
  n.toLocaleString("ru-RU").replace(/,/g, " ") + " UZS";

export const SingleCourse = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

  const course = defaultCourses.find((c) => c.id === Number(id));

  if (!course) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Course not found.</Typography>
        <Typography
          sx={{ color: "#1976d2", cursor: "pointer", mt: 1 }}
          onClick={() => navigate("/settings/office/courses")}
        >
          ← Back to Courses
        </Typography>
      </Box>
    );
  }

  // Split groups into two columns
  const leftGroups = course.groups.filter((_, i) => i % 2 === 0);
  const rightGroups = course.groups.filter((_, i) => i % 2 !== 0);

  return (
    <Box sx={{ p: 3, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      {/* Back + Title */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <IconButton size="small" onClick={() => navigate("/settings/office/courses")}>
          <MdArrowBack size={20} />
        </IconButton>
        <Typography variant="h5" fontWeight={400}>
          {course.name}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
        {/* Left: Course card info */}
        <Box sx={{ width: 280, flexShrink: 0 }}>
          <Paper elevation={1} sx={{ borderRadius: 2, overflow: "hidden" }}>
            {/* Banner */}
            <Box
              sx={{
                bgcolor: course.color,
                height: 220,
                position: "relative",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Edit / Delete icons */}
              <Box
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  display: "flex",
                  gap: 1,
                  zIndex: 2,
                }}
              >
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    border: "1.5px solid rgba(255,255,255,0.8)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    bgcolor: "rgba(255,255,255,0.15)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                  }}
                >
                  <MdEdit size={16} color="#fff" />
                </Box>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    border: "1.5px solid rgba(255,255,255,0.8)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    bgcolor: "rgba(255,255,255,0.15)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                  }}
                  onClick={() => navigate("/settings/office/courses")}
                >
                  <MdDeleteOutline size={16} color="#fff" />
                </Box>
              </Box>

              <Typography
                fontWeight={700}
                fontSize={20}
                color="#fff"
                textAlign="center"
                sx={{ position: "relative", zIndex: 1, px: 2, textShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
              >
                {course.name}
              </Typography>
              {/* <BookIllustration /> */}
            </Box>

            {/* Info fields */}
            <Box sx={{ p: 2.5 }}>
              <InfoRow label="Description" value={course.description || "—"} />
              <InfoRow label="Price" value={fmt(course.price)} />
              <InfoRow label="Students" value={String(course.students)} />
              <InfoRow label="Lesson duration" value={course.lessonDuration} />
            </Box>
          </Paper>
        </Box>

        {/* Right: Tabs + Groups */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ borderBottom: "1px solid #e0e0e0", mb: 2 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{
                "& .MuiTab-root": { textTransform: "none", fontSize: 14, fontWeight: 400, color: "#555", minWidth: "auto", mr: 3, px: 0 },
                "& .Mui-selected": { color: "#1a3f6f", fontWeight: 600 },
                "& .MuiTabs-indicator": { bgcolor: "#1a3f6f" },
              }}
            >
              <Tab label="Groups" />
              <Tab label="Subcourses" />
              <Tab label="Online lessons and materials" />
              <Tab label="Materials" />
            </Tabs>
          </Box>

          {/* Groups tab */}
          {tab === 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {/* Left column */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {leftGroups.map((group) => (
                  <GroupCard key={group.id} group={group} />
                ))}
                {leftGroups.length === 0 && course.groups.length === 0 && (
                  <Typography fontSize={13} color="#999">No groups yet.</Typography>
                )}
              </Box>
              {/* Right column */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {rightGroups.map((group) => (
                  <GroupCard key={group.id} group={group} />
                ))}
              </Box>
            </Box>
          )}

          {tab === 1 && (
            <Typography fontSize={13} color="#999">No subcourses available.</Typography>
          )}
          {tab === 2 && (
            <Typography fontSize={13} color="#999">No online lessons and materials available.</Typography>
          )}
          {tab === 3 && (
            <Typography fontSize={13} color="#999">No materials available.</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography fontSize={12} color="#aaa" mb={0.2}>{label}</Typography>
    <Typography fontSize={14} fontWeight={500}>{value}</Typography>
  </Box>
);

const GroupCard = ({ group }: { group: { id: number; tag: string; teacher: string; startDate: string; endDate: string; schedule: string; time: string } }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2,
      borderRadius: 2,
      cursor: "pointer",
      transition: "box-shadow 0.15s",
      "&:hover": { boxShadow: 2 },
    }}
  >
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, justifyContent: "space-between" }}>
      <Box>
        <Chip
          label={group.tag}
          size="small"
          sx={{ fontSize: 11, height: 22, mb: 0.8, bgcolor: "#f0f0f0", color: "#444", fontWeight: 500 }}
        />
        <Typography fontSize={14} fontWeight={500}>{group.teacher}</Typography>
      </Box>
      <Box sx={{ textAlign: "right", flexShrink: 0 }}>
        <Typography fontSize={12} color="#888">
          {group.startDate} —<br />{group.endDate}
        </Typography>
      </Box>
      <Box sx={{ textAlign: "right", flexShrink: 0 }}>
        <Typography fontSize={12} color="#888">{group.schedule}</Typography>
        <Typography fontSize={13} fontWeight={500}>{group.time}</Typography>
      </Box>
    </Box>
  </Paper>
);