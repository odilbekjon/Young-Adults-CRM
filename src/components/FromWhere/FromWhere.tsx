import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  InputAdornment,
  Popover,
  MenuList,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
} from "@mui/material";
import {
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiMoreHorizontal,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiArchive,
  FiUpload,
  FiDownload,
  FiColumns,
  FiTag,
  FiFileText,
  FiXCircle,
  FiShare2,
} from "react-icons/fi";
import { MdOutlineDateRange } from "react-icons/md";
import { useState} from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FilterConfig {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

type FilterState = Record<string, string>;

// ─── Filter Config ────────────────────────────────────────────────────────────

const FILTERS: FilterConfig[] = [
  {
    key: "section",
    label: "Section",
    options: [
      { value: "input", label: "Input" },
      { value: "output", label: "Output" },
    ],
  },
  {
    key: "course",
    label: "Course",
    options: [
      { value: "english", label: "English" },
      { value: "math", label: "Math" },
      { value: "science", label: "Science" },
      { value: "it", label: "IT" },
    ],
  },
  {
    key: "tags",
    label: "Tags",
    options: [
      { value: "vip", label: "VIP" },
      { value: "new", label: "New" },
      { value: "hot", label: "Hot" },
      { value: "cold", label: "Cold" },
    ],
  },
  {
    key: "lead",
    label: "Lead",
    options: [
      { value: "new", label: "New" },
      { value: "in_progress", label: "In progress" },
      { value: "converted", label: "Converted" },
      { value: "lost", label: "Lost" },
    ],
  },
  {
    key: "student",
    label: "By student",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "trial", label: "Trial" },
      { value: "graduated", label: "Graduated" },
    ],
  },
  {
    key: "task",
    label: "Task",
    options: [
      { value: "overdue", label: "Overdue" },
      { value: "today", label: "Today" },
      { value: "future", label: "Future" },
      { value: "no_task", label: "No task" },
    ],
  },
];

// ─── More Menu items ──────────────────────────────────────────────────────────

const MORE_MENU_ITEMS = [
  { key: "archive", label: "Archive leads", icon: <FiArchive size={15} /> },
  { key: "import", label: "Import leads", icon: <FiUpload size={15} /> },
  { key: "export", label: "Export leads", icon: <FiDownload size={15} /> },
  { key: "divider" },
  { key: "columns", label: "Column settings", icon: <FiColumns size={15} /> },
  { key: "sources", label: "Lead sources", icon: <FiShare2 size={15} /> },
  { key: "tags", label: "Tags", icon: <FiTag size={15} /> },
  { key: "forms", label: "Forms", icon: <FiFileText size={15} /> },
  { key: "divider2" },
  { key: "remove", label: "Reason for remove", icon: <FiXCircle size={15} />, danger: true },
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDay(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date | null, b: Date | null) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isInRange(date: Date, start: Date | null, end: Date | null) {
  if (!start || !end) return false;
  return date > start && date < end;
}

function formatDate(d: Date | null) {
  if (!d) return "";
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}.${d.getFullYear()}`;
}

function formatTime(d: Date | null) {
  if (!d) return "";
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

const PRESETS = [
  { label: "Last week", days: 7 },
  { label: "Last month", days: 30 },
  { label: "Last 3 months", days: 90 },
];

// ─── Calendar Grid ────────────────────────────────────────────────────────────

interface CalendarProps {
  year: number;
  month: number;
  startDate: Date | null;
  endDate: Date | null;
  hoverDate: Date | null;
  today: Date;
  onSelect: (date: Date) => void;
  onHover: (date: Date | null) => void;
}

const CalendarGrid = ({
  year, month, startDate, endDate, hoverDate, today, onSelect, onHover,
}: CalendarProps) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const prevDays = getDaysInMonth(year, month - 1);

  const cells: { date: Date; inMonth: boolean }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, prevDays - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: new Date(year, month + 1, d), inMonth: false });
  }

  const effectiveEnd = endDate || hoverDate;

  return (
    <Box sx={{ flex: 1 }}>
      <Typography
        align="center"
        sx={{ fontSize: 14, fontWeight: 500, mb: 1.5, color: "text.primary" }}
      >
        {year} {MONTHS[month]}
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", mb: 0.5 }}>
        {DAYS.map((d) => (
          <Typography
            key={d}
            align="center"
            sx={{ fontSize: 12, color: "text.disabled", py: 0.5, fontWeight: 500 }}
          >
            {d}
          </Typography>
        ))}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {cells.map(({ date, inMonth }, idx) => {
          const isStart = isSameDay(date, startDate);
          const isEnd = isSameDay(date, endDate);
          const isToday = isSameDay(date, today);
          const inRng = isInRange(date, startDate, effectiveEnd);
          // const isHovered = isSameDay(date, hoverDate) && !endDate;

          return (
            <Box
              key={idx}
              onClick={() => onSelect(date)}
              onMouseEnter={() => onHover(date)}
              onMouseLeave={() => onHover(null)}
              sx={{
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                borderRadius: isStart || isEnd ? "50%" : 0,
                backgroundColor:
                  isStart || isEnd
                    ? "#1976d2"
                    : inRng
                    ? "#e3f2fd"
                    : "transparent",
                position: "relative",
                "&::before":
                  inRng && !isStart && !isEnd
                    ? {
                        content: '""',
                        position: "absolute",
                        inset: 0,
                        backgroundColor: "#e3f2fd",
                        zIndex: 0,
                      }
                    : {},
              }}
            >
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: isToday ? 700 : 400,
                  color: isStart || isEnd
                    ? "#fff"
                    : isToday
                    ? "#1976d2"
                    : !inMonth
                    ? "text.disabled"
                    : "text.primary",
                  zIndex: 1,
                  lineHeight: 1,
                }}
              >
                {date.getDate()}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// ─── Date Range Picker Popover ────────────────────────────────────────────────

interface DateRangePickerProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  startDate: Date | null;
  endDate: Date | null;
  onApply: (start: Date | null, end: Date | null) => void;
}

const DateRangePicker = ({ anchorEl, onClose, startDate, endDate, onApply }: DateRangePickerProps) => {
  const today = new Date();
  const [localStart, setLocalStart] = useState<Date | null>(startDate);
  const [localEnd, setLocalEnd] = useState<Date | null>(endDate);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [leftYear, setLeftYear] = useState(today.getFullYear());
  const [leftMonth, setLeftMonth] = useState(today.getMonth());

  const rightMonth = leftMonth === 11 ? 0 : leftMonth + 1;
  const rightYear = leftMonth === 11 ? leftYear + 1 : leftYear;

  const handleSelect = (date: Date) => {
    if (!localStart || (localStart && localEnd)) {
      setLocalStart(date);
      setLocalEnd(null);
    } else {
      if (date < localStart) {
        setLocalEnd(localStart);
        setLocalStart(date);
      } else {
        setLocalEnd(date);
      }
    }
  };

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setLocalStart(start);
    setLocalEnd(end);
  };

  const handlePrevMonth = () => {
    if (leftMonth === 0) { setLeftMonth(11); setLeftYear((y) => y - 1); }
    else setLeftMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    if (leftMonth === 11) { setLeftMonth(0); setLeftYear((y) => y + 1); }
    else setLeftMonth((m) => m + 1);
  };
  const handlePrevYear = () => setLeftYear((y) => y - 1);
  const handleNextYear = () => setLeftYear((y) => y + 1);

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      PaperProps={{ sx: { borderRadius: 2, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", overflow: "hidden", minWidth: 640 } }}
    >
      {/* Top: date/time inputs */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.5, borderBottom: "0.5px solid", borderColor: "divider" }}>
        <TextField size="small" placeholder="Start Date" value={formatDate(localStart)} InputProps={{ readOnly: true }} sx={{ flex: 1, "& input": { fontSize: 13 } }} />
        <TextField size="small" placeholder="Start Time" value={formatTime(localStart)} InputProps={{ readOnly: true }} sx={{ flex: 1, "& input": { fontSize: 13 } }} />
        <Box sx={{ color: "text.disabled", fontSize: 18, px: 0.5 }}>›</Box>
        <TextField size="small" placeholder="End Date" value={formatDate(localEnd)} InputProps={{ readOnly: true }} sx={{ flex: 1, "& input": { fontSize: 13 } }} />
        <TextField size="small" placeholder="End Time" value={formatTime(localEnd)} InputProps={{ readOnly: true }} sx={{ flex: 1, "& input": { fontSize: 13 } }} />
      </Box>

      {/* Body */}
      <Box sx={{ display: "flex" }}>
        {/* Presets */}
        <Box sx={{ width: 130, borderRight: "0.5px solid", borderColor: "divider", py: 1 }}>
          {PRESETS.map((p) => (
            <Box
              key={p.label}
              onClick={() => applyPreset(p.days)}
              sx={{
                px: 2, py: 1, fontSize: 13, cursor: "pointer", color: "text.primary",
                "&:hover": { backgroundColor: "action.hover" },
              }}
            >
              {p.label}
            </Box>
          ))}
        </Box>

        {/* Calendars */}
        <Box sx={{ flex: 1, p: 2 }}>
          {/* Nav row */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Box sx={{ display: "flex", gap: 0.25 }}>
              <IconButton size="small" onClick={handlePrevYear}><FiChevronsLeft size={14} /></IconButton>
              <IconButton size="small" onClick={handlePrevMonth}><FiChevronLeft size={14} /></IconButton>
            </Box>
            <Box sx={{ flex: 1 }} />
            <Box sx={{ display: "flex", gap: 0.25 }}>
              <IconButton size="small" onClick={handleNextMonth}><FiChevronRight size={14} /></IconButton>
              <IconButton size="small" onClick={handleNextYear}><FiChevronsRight size={14} /></IconButton>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 2 }}>
            <CalendarGrid
              year={leftYear} month={leftMonth}
              startDate={localStart} endDate={localEnd}
              hoverDate={hoverDate} today={today}
              onSelect={handleSelect} onHover={setHoverDate}
            />
            <Box sx={{ width: "0.5px", backgroundColor: "divider" }} />
            <CalendarGrid
              year={rightYear} month={rightMonth}
              startDate={localStart} endDate={localEnd}
              hoverDate={hoverDate} today={today}
              onSelect={handleSelect} onHover={setHoverDate}
            />
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, px: 2, py: 1, borderTop: "0.5px solid", borderColor: "divider" }}>
        <Button
          size="small"
          onClick={() => { setLocalStart(null); setLocalEnd(null); }}
          sx={{ fontSize: 13, color: "#1976d2", fontWeight: 400 }}
        >
          Clear
        </Button>
        <Button
          size="small"
          onClick={() => { onApply(localStart, localEnd); onClose(); }}
          sx={{ fontSize: 13, color: "text.disabled", fontWeight: 400 }}
          disabled={!localStart}
        >
          OK
        </Button>
      </Box>
    </Popover>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface FromWhereProps {
  onOpenColumnSettings?: () => void;
  onOpenSourceSettings?: () => void;
}

export const FromWhere = ({ onOpenColumnSettings, onOpenSourceSettings }: FromWhereProps = {}) => {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(
    Object.fromEntries(FILTERS.map((f) => [f.key, ""]))
  );

  // Date range
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null);

  // More menu
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSearch("");
    setFilters(Object.fromEntries(FILTERS.map((f) => [f.key, ""])));
    setStartDate(null);
    setEndDate(null);
  };

  const dateLabel = startDate
    ? `${formatDate(startDate)} – ${endDate ? formatDate(endDate) : "..."}`
    : "Date from – Date to";

  return (
    <Box sx={{ backgroundColor: "background.paper", borderBottom: "0.5px solid", borderColor: "divider" }}>
      <Box sx={{ px: 1.5, py: 1, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>

        {/* Search */}
        <TextField
          size="small"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FiSearch size={13} color="#aaa" />
              </InputAdornment>
            ),
            sx: { fontSize: 13, height: 32 },
          }}
          sx={{ width: 110 }}
        />

        {/* Filter dropdowns */}
        {FILTERS.map((filter) => (
          <TextField
            key={filter.key}
            size="small"
            select
            value={filters[filter.key]}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            sx={{ "& .MuiInputBase-root": { height: 32, fontSize: 13, minWidth: 90 } }}
            SelectProps={{
              displayEmpty: true,
              renderValue: (value) => {
                if (!value) {
                  return <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{filter.label}</Typography>;
                }
                const found = filter.options.find((o) => o.value === value);
                return <Typography sx={{ fontSize: 13 }}>{found?.label ?? String(value)}</Typography>;
              },
            }}
          >
            <MenuItem value=""><em>All</em></MenuItem>
            {filter.options.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>
        ))}

        {/* Date range trigger */}
        <Box
          onClick={(e) => setDateAnchor(e.currentTarget)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            border: "0.5px solid",
            borderColor: startDate ? "primary.main" : "divider",
            borderRadius: 1,
            px: 1,
            height: 32,
            flex: 1,
            minWidth: 180,
            cursor: "pointer",
            "&:hover": { borderColor: "text.secondary" },
          }}
        >
          <MdOutlineDateRange size={14} color={startDate ? "#1976d2" : "#aaa"} />
          <Typography
            variant="caption"
            sx={{ fontSize: 12, color: startDate ? "text.primary" : "text.disabled", whiteSpace: "nowrap" }}
          >
            {dateLabel}
          </Typography>
        </Box>

        {/* Date Range Picker */}
        <DateRangePicker
          anchorEl={dateAnchor}
          onClose={() => setDateAnchor(null)}
          startDate={startDate}
          endDate={endDate}
          onApply={(s, e) => { setStartDate(s); setEndDate(e); }}
        />

        {/* Filters btn */}
        <Button
          size="small"
          startIcon={<FiFilter size={13} />}
          sx={{ fontSize: 13, height: 32, px: 1.5, color: "text.secondary", border: "0.5px solid", borderColor: "divider", borderRadius: 1, minWidth: 0 }}
        >
          Filters
        </Button>

        {/* Reset */}
        <Button
          size="small"
          onClick={handleReset}
          title="Reset filters"
          sx={{ minWidth: 32, width: 32, height: 32, p: 0, border: "0.5px solid", borderColor: "divider", borderRadius: 1, color: "text.secondary" }}
        >
          <FiRefreshCw size={13} />
        </Button>

        {/* More menu trigger */}
        <Button
          size="small"
          onClick={(e) => setMoreAnchor(e.currentTarget)}
          sx={{ minWidth: 32, width: 32, height: 32, p: 0, border: "0.5px solid", borderColor: moreAnchor ? "primary.main" : "divider", borderRadius: 1, color: moreAnchor ? "primary.main" : "text.secondary" }}
        >
          <FiMoreHorizontal size={13} />
        </Button>

        {/* More Popover */}
        <Popover
          open={Boolean(moreAnchor)}
          anchorEl={moreAnchor}
          onClose={() => setMoreAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{ sx: { borderRadius: 2, boxShadow: "0 4px 20px rgba(0,0,0,0.10)", minWidth: 200, py: 0.5 } }}
        >
          <MenuList dense sx={{ py: 0.5 }}>
            {MORE_MENU_ITEMS.map((item) => {
              if (item.key === "divider" || item.key === "divider2") {
                return <Divider key={item.key} sx={{ my: 0.5 }} />;
              }
              return (
                <MenuItem
                  key={item.key}
                  onClick={() => {
                    setMoreAnchor(null);
                    if (item.key === "columns") onOpenColumnSettings?.();
                    if (item.key === "sources") onOpenSourceSettings?.();
                  }}
                  sx={{
                    fontSize: 13,
                    px: 2,
                    py: 0.75,
                    color: item.danger ? "error.main" : "text.primary",
                    "&:hover": { backgroundColor: item.danger ? "error.50" : "action.hover" },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 28, color: item.danger ? "error.main" : "text.secondary" }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: 13 }}>
                    {item.label}
                  </ListItemText>
                </MenuItem>
              );
            })}
          </MenuList>
        </Popover>

      </Box>
    </Box>
  );
};