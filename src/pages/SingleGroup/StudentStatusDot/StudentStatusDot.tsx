import { Box } from "@mui/material";

// Roster status marker shared by the student list and the Attendance table:
// red for a debtor, green for an active member. Frozen and archived students
// get an empty slot of the same size so names stay aligned across rows.
export const StudentStatusDot = ({
  active,
  archived,
  balance,
}: {
  active: boolean;
  archived?: boolean;
  balance?: number;
}) => {
  const isDebtor = !archived && (balance ?? 0) < 0;
  const hasDot = !archived && (active || isDebtor);
  return (
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        flexShrink: 0,
        bgcolor: hasDot ? (isDebtor ? "#e53935" : "#43a047") : "transparent",
      }}
    />
  );
};
