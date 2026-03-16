import { Box, Typography, IconButton } from "@mui/material";
import { FiChevronDown, FiMoreVertical } from "react-icons/fi";

const sections = [
  { name: "Elementary", count: 30 },
  { name: "Beginner", count: 15 },
  { name: "Matematika", count: 26 },
  { name: "Pre-Inter", count: 8 },
  { name: "Informatika", count: 4 },
];

export const Sections = () => {
  return (
    <Box
      sx={{
        background: "#fff",
        borderRadius: 3,
        p: 3,
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      }}
    >
      <Typography fontWeight={600} mb={2}>
        Sections
      </Typography>

      {sections.map((section) => (
        <Box
          key={section.name}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 2,
            border: "1px solid #eee",
            borderRadius: 2,
            mb: 1,
          }}
        >
          <Box display="flex" gap={1}>
            <Typography>{section.name}</Typography>
            <Typography color="primary" fontWeight={600}>
              {section.count}
            </Typography>
          </Box>

          <Box display="flex" gap={1}>
            <IconButton>
              <FiChevronDown />
            </IconButton>

            <IconButton>
              <FiMoreVertical />
            </IconButton>
          </Box>
        </Box>
      ))}
    </Box>
  );
};