import {
  Box,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Avatar,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
} from "react-icons/md";
import { MdClose } from "react-icons/md";
import { useState } from "react";
import { Student } from "../../../types/group";

interface Props {
  students: Student[];
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

type AttVal = "Was" | "Not" | null;

export const Attendance = ({ students }: Props) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [attendance, setAttendance] = useState<
    Record<number, Record<number, AttVal>>
  >({});

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuTarget, setMenuTarget] = useState<{ studentId: number; day: number } | null>(null);

  const totalDays = getDaysInMonth(year, month);
  const lessonDays = Array.from({ length: totalDays }, (_, i) => i + 1);
  const today = now.getDate();
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();

  // Navigation
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };
  const prevYear = () => setYear((y) => y - 1);
  const nextYear = () => setYear((y) => y + 1);
  const goToCurrent = () => {
    setMonth(now.getMonth());
    setYear(now.getFullYear());
  };

  // Open dropdown menu on cell click
  const handleCellClick = (
    e: React.MouseEvent<HTMLElement>,
    studentId: number,
    day: number
  ) => {
    setMenuAnchor(e.currentTarget);
    setMenuTarget({ studentId, day });
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuTarget(null);
  };

  const handleSelect = (val: AttVal) => {
    if (!menuTarget) return;
    const { studentId, day } = menuTarget;
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [day]: val },
    }));
    handleMenuClose();
  };

  // Remove (X) button on hover — direct remove without menu
  const handleRemove = (
    e: React.MouseEvent,
    studentId: number,
    day: number
  ) => {
    e.stopPropagation();
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [day]: null },
    }));
  };

  const getVal = (studentId: number, day: number): AttVal =>
    attendance[studentId]?.[day] ?? null;

  return (
    <Box>
      {/* HEADER */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="h6" fontWeight={600}>
          Attendance
        </Typography>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Button variant="outlined" size="small" onClick={goToCurrent}>
            Current
          </Button>
          <IconButton size="small" onClick={prevYear}>
            <MdKeyboardDoubleArrowLeft />
          </IconButton>
          <IconButton size="small" onClick={prevMonth}>
            <MdKeyboardArrowLeft />
          </IconButton>
          <Typography sx={{ minWidth: 90, textAlign: "center", fontSize: 14 }}>
            {MONTH_NAMES[month]} {year}
          </Typography>
          <IconButton size="small" onClick={nextMonth}>
            <MdKeyboardArrowRight />
          </IconButton>
          <IconButton size="small" onClick={nextYear}>
            <MdKeyboardDoubleArrowRight />
          </IconButton>
        </Stack>
      </Stack>

      {/* TABLE — o'zi X scroll qiladi */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 2,
          border: "1px solid #e0e0e0",
          overflowX: "scroll",
          overflowY: "visible",
          // width: "100%",
        }}
      >
        <Table
          size="small"
          stickyHeader
          sx={{ tableLayout: "auto", minWidth: "max-content" }}
        >
          <TableHead>
            <TableRow>
              {/* Sticky name column */}
              <TableCell
                sx={{
                  minWidth: 180,
                  fontWeight: 600,
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                  bgcolor: "#fafafa",
                  borderRight: "1px solid #e0e0e0",
                }}
              >
                Name
              </TableCell>

              {lessonDays.map((d) => {
                const isToday = isCurrentMonth && d === today;
                return (
                  <TableCell
                    key={d}
                    align="center"
                    sx={{
                      minWidth: 56,
                      px: 0.5,
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? "primary.main" : "text.secondary",
                      fontSize: 12,
                      bgcolor: isToday ? "#e3f2fd" : "#fafafa",
                      borderBottom: isToday
                        ? "2px solid #1976d2"
                        : undefined,
                    }}
                  >
                    {d}
                    <br />
                    <span style={{ fontSize: 10, opacity: 0.7 }}>
                      {MONTH_NAMES[month]}
                    </span>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>

          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id} hover>
                {/* Sticky name cell */}
                <TableCell
                  sx={{
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                    bgcolor: "background.paper",
                    borderRight: "1px solid #e0e0e0",
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>
                      {student.name[0]}
                    </Avatar>
                    <Typography fontSize={13} noWrap>
                      {student.name}
                    </Typography>
                  </Stack>
                </TableCell>

                {lessonDays.map((d) => {
                  const val = getVal(student.id, d);
                  const isToday = isCurrentMonth && d === today;
                  const isPast =
                    year < now.getFullYear() ||
                    (year === now.getFullYear() &&
                      month < now.getMonth()) ||
                    (isCurrentMonth && d < today);

                  return (
                    <TableCell
                      key={d}
                      align="center"
                      sx={{
                        px: 0.5,
                        bgcolor: isToday ? "#f0f7ff" : undefined,
                      }}
                    >
                      {/* Cell box */}
                      <Box
                        sx={{
                          position: "relative",
                          width: 40,
                          height: 28,
                          mx: "auto",
                          "& .remove-btn": { display: "none" },
                          "&:hover .remove-btn": {
                            display: val ? "flex" : "none",
                          },
                        }}
                      >
                        {/* Main clickable box */}
                        <Box
                          onClick={(e) =>
                            handleCellClick(e, student.id, d)
                          }
                          sx={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            userSelect: "none",
                            border: isToday
                              ? "2px solid #1976d2"
                              : "1px solid #e0e0e0",
                            bgcolor:
                              val === "Was"
                                ? "#00897b"
                                : val === "Not"
                                ? "#ef5350"
                                : isPast
                                ? "#f5f5f5"
                                : "#fff",
                            color:
                              val === "Was" || val === "Not"
                                ? "#fff"
                                : "#bdbdbd",
                            transition: "all 0.15s",
                            "&:hover": { opacity: 0.85 },
                          }}
                        >
                          {val ?? "·"}
                        </Box>

                        {/* X remove button — hover da chiqadi */}
                        {val && (
                          <Box
                            className="remove-btn"
                            onClick={(e) =>
                              handleRemove(e, student.id, d)
                            }
                            sx={{
                              position: "absolute",
                              top: -7,
                              right: -7,
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              bgcolor: "#616161",
                              color: "#fff",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              zIndex: 2,
                              "&:hover": { bgcolor: "#e53935" },
                            }}
                          >
                            <MdClose size={10} />
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* DROPDOWN MENU */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        slotProps={{
          paper: { sx: { minWidth: 130, borderRadius: 2, mt: 0.5 } },
        }}
      >
        <MenuItem
          onClick={() => handleSelect("Was")}
          sx={{ fontSize: 13, gap: 1 }}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: "#00897b",
            }}
          />
          Was
        </MenuItem>
        <MenuItem
          onClick={() => handleSelect("Not")}
          sx={{ fontSize: 13, gap: 1 }}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: "#ef5350",
            }}
          />
          Not
        </MenuItem>
        {menuTarget && getVal(menuTarget.studentId, menuTarget.day) && (
          <MenuItem
            onClick={() => handleSelect(null)}
            sx={{ fontSize: 13, color: "text.secondary", gap: 1 }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: "#bdbdbd",
              }}
            />
            Remove
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};