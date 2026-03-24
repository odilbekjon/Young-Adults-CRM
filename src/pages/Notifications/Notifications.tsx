import React, { useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Badge,
  ListItemButton,
} from "@mui/material";
import { MdNotifications, MdCheckCircle, MdError } from "react-icons/md";

interface Notification {
  id: number;
  title: string;
  description: string;
  type: "info" | "success" | "error";
  date: string;
  read: boolean;
}

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, title: "Darsdan ketgan talaba", description: "Ali Raxmatov darsdan ketdi", type: "error", date: "2026-03-24", read: false },
    { id: 2, title: "Yangi o‘quvchi qo‘shildi", description: "Zarina Abdurahmonova tizimga qo‘shildi", type: "success", date: "2026-03-23", read: true },
    { id: 3, title: "Tizim xabari", description: "Server texnik ishlovdan o‘tmoqda", type: "info", date: "2026-03-22", read: false },
  ]);

  const markAsRead = (id: number) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <MdCheckCircle color="green" size={24} />;
      case "error":
        return <MdError color="red" size={24} />;
      default:
        return <MdNotifications color="blue" size={24} />;
    }
  };

  return (
    <Box sx={{ p: 4, minHeight: "100vh", backgroundColor: "#f5f7fb" }}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Notifications
      </Typography>

      <List>
        {notifications.map(notification => (
          <React.Fragment key={notification.id}>
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => markAsRead(notification.id)}
                sx={{
                  backgroundColor: notification.read ? "#fff" : "#e3f2fd",
                  borderRadius: 2,
                }}
              >
                <ListItemIcon>{getIcon(notification.type)}</ListItemIcon>
                <ListItemText
                  primary={notification.title}
                  secondary={`${notification.description} — ${notification.date}`}
                />
                {!notification.read && <Badge color="primary" variant="dot" />}
              </ListItemButton>
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};