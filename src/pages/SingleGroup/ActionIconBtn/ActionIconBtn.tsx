// src/pages/groups/ActionIconBtn.tsx
import { Box, IconButton } from "@mui/material";
import { useState } from "react";

export const ActionIconBtn = ({
  label,
  onClick,
  children,
  btnRef,
  color = "#e0e0e0",
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  btnRef?: React.Ref<HTMLButtonElement>;
  /** Border color of the circular button, matching its icon's color */
  color?: string;
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Box sx={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <IconButton
        ref={btnRef}
        size="small"
        sx={{ border: "1.5px solid", borderColor: color, borderRadius: "50%" }}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {children}
      </IconButton>
      {hovered && (
        <Box
          sx={{
            position: "absolute",
            left: "calc(100% + 8px)",
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "#1a1a1a",
            color: "#fff",
            fontSize: 11,
            fontWeight: 500,
            px: 1,
            py: 0.4,
            borderRadius: 1,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 9999,
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            "&::before": {
              content: '""',
              position: "absolute",
              right: "100%",
              top: "50%",
              transform: "translateY(-50%)",
              border: "5px solid transparent",
              borderRightColor: "#1a1a1a",
            },
          }}
        >
          {label}
        </Box>
      )}
    </Box>
  );
};

export default ActionIconBtn;