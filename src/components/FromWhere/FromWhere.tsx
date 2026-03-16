import { Box, Typography, IconButton } from "@mui/material";
import { FiMoreVertical } from "react-icons/fi";

const data = [
  { name: "Telegram", count: 30 },
  { name: "Walked by", count: 12 },
  { name: "Friends", count: 3 },
];

export const FromWhere = () => {
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
        From where
      </Typography>

      {data.map((item) => (
        <Box
          key={item.name}
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
          <Box>
            <Typography>{item.name}</Typography>
            <Typography fontWeight={700}>{item.count}</Typography>
          </Box>

          <IconButton>
            <FiMoreVertical />
          </IconButton>
        </Box>
      ))}
    </Box>
  );
};