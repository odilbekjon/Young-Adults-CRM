import { useState } from "react";
import {
  Box,
  Typography,
  Chip,
  Divider,
  Avatar,
  AvatarGroup,
  Button,
} from "@mui/material";
import { FiCircle, FiUser } from "react-icons/fi";
import { useTranslation } from "react-i18next";

interface LogItem {
  id: number;
  name: string;
  action: string;
  phone: string;
  datetime: string;
}

const logs: LogItem[] = [
  { id: 1, name: "Sadbarg Raxmonova", action: "Student attendance indicated", phone: "(94) 469-29-28", datetime: "14.05.2026 13:49" },
  { id: 2, name: "Sadbarg Raxmonova", action: "Student attendance indicated", phone: "(94) 469-29-28", datetime: "14.05.2026 13:49" },
  { id: 3, name: "Ugilbeka Abdullaeva", action: "User Authed", phone: "(97) 921-97-09", datetime: "14.05.2026 13:49" },
  { id: 4, name: "Sadbarg Raxmonova", action: "Student attendance indicated", phone: "(94) 469-29-28", datetime: "14.05.2026 13:49" },
  { id: 5, name: "Sadbarg Raxmonova", action: "Student attendance indicated", phone: "(94) 469-29-28", datetime: "14.05.2026 13:49" },
  { id: 6, name: "Sadbarg Raxmonova", action: "Student attendance indicated", phone: "(94) 469-29-28", datetime: "14.05.2026 13:49" },
  { id: 7, name: "Sadbarg Raxmonova", action: "Student attendance indicated", phone: "(94) 469-29-28", datetime: "14.05.2026 13:49" },
  { id: 8, name: "Sadbarg Raxmonova", action: "Student attendance indicated", phone: "(94) 469-29-28", datetime: "14.05.2026 13:49" },
  { id: 9, name: "Sadbarg Raxmonova", action: "Student attendance indicated", phone: "(94) 469-29-28", datetime: "14.05.2026 13:49" },
  { id: 10, name: "Sadbarg Raxmonova", action: "Student attendance indicated", phone: "(94) 469-29-28", datetime: "14.05.2026 13:49" },
];

const avatarUsers = ["OS", "AE", "TJ", "UA", "Mun"];

const filterButtonIds = ["user", "course", "group", "room", "payment", "staff", "rest"];

export const Log = () => {
  const { t } = useTranslation();
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const toggleFilter = (id: string) => {
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <Box sx={{ m: { xs: 1.5, md: 5 }, display: "flex", flexDirection: { xs: "column", md: "row" }, minHeight: "100vh", bgcolor: "var(--color-surface-alt)" }}>
      {/* Left: Logs list */}
      <Box sx={{ flex: 1, p: 3, borderRight: "1px solid var(--color-border)", bgcolor: "var(--color-surface)" }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 500, color: "var(--color-text-primary)" }}>
            {t("reports.logs.log.title")}
          </Typography>
          <AvatarGroup
            max={6}
            sx={{
              "& .MuiAvatar-root": {
                width: 34,
                height: 34,
                fontSize: "0.68rem",
                bgcolor: "var(--color-border)",
                color: "var(--color-text-secondary)",
                border: "2px solid var(--color-surface)",
              },
            }}
          >
            {avatarUsers.map((u) => (
              <Avatar key={u}>{u}</Avatar>
            ))}
          </AvatarGroup>
        </Box>

        <Divider />

        {logs.map((log, index) => (
          <Box key={log.id}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, py: 1.5 }}>
              {/* Circle icon */}
              <Box sx={{ mt: 0.4, flexShrink: 0 }}>
                <FiCircle size={18} color="var(--color-text-muted)" />
              </Box>

              {/* Name chip + action */}
              <Box sx={{ flex: "0 0 200px" }}>
                <Chip
                  label={log.name}
                  size="small"
                  sx={{
                    bgcolor: "var(--color-surface-hover)",
                    color: "var(--color-text-primary)",
                    fontSize: "0.75rem",
                    height: 24,
                    borderRadius: "4px",
                    mb: 0.5,
                  }}
                />
                <Typography variant="body2" sx={{ color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>
                  {log.action}
                </Typography>
              </Box>

              {/* User icon + name + phone */}
              <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 0.8 }}>
                <FiUser size={14} color="var(--color-text-muted)" />
                <Typography
                  variant="body2"
                  sx={{ color: "#1976d2", fontSize: "0.85rem", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                >
                  {log.name}
                </Typography>
                <Typography variant="body2" sx={{ color: "#bdbdbd", fontSize: "0.85rem" }}>·</Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "#1976d2", fontSize: "0.85rem", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                >
                  {log.phone}
                </Typography>
              </Box>

              {/* Date */}
              <Typography variant="body2" sx={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", flexShrink: 0, whiteSpace: "nowrap" }}>
                {log.datetime}
              </Typography>
            </Box>
            {index < logs.length - 1 && <Divider />}
          </Box>
        ))}
      </Box>

      {/* Right: Status filter */}
      <Box sx={{ width: { xs: "100%", md: 280 }, p: 3, bgcolor: "var(--color-surface)", borderLeft: { md: "1px solid var(--color-border)" }, borderTop: { xs: "1px solid var(--color-border)", md: "none" } }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 2, color: "var(--color-text-primary)" }}>
          {t("reports.logs.log.statusFilter")}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {filterButtonIds.map((id) => {
            const isActive = activeFilters.includes(id);
            return (
              <Button
                key={id}
                variant="outlined"
                size="small"
                onClick={() => toggleFilter(id)}
                startIcon={<span style={{ fontSize: 10 }}>↑</span>}
                sx={{
                  fontSize: "0.8rem",
                  textTransform: "none",
                  borderRadius: "20px",
                  px: 1.5,
                  py: 0.3,
                  borderColor: isActive ? "#1976d2" : "var(--color-border)",
                  color: isActive ? "#1976d2" : "var(--color-text-secondary)",
                  bgcolor: isActive ? "var(--color-primary-surface)" : "transparent",
                  minWidth: "unset",
                  "&:hover": {
                    borderColor: "#1976d2",
                    bgcolor: "var(--color-primary-surface)",
                    color: "#1976d2",
                  },
                }}
              >
                {t(`reports.logs.log.filters.${id}`)}
              </Button>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};