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
  FiRefreshCw,
  FiMoreHorizontal,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiDownload,
  FiColumns,
  FiFileText,
  FiShare2,
} from "react-icons/fi";
import { MdOutlineDateRange } from "react-icons/md";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAllLeadSectionsQuery } from "../../app/api/leadSectionsApi";
import { useAllLeadSourcesQuery } from "../../app/api/leadSourcesApi";
import { useCoursesSelectQuery } from "../../app/api/coursesApi";
import { useLazyReportLeadsExcelQuery } from "../../app/api/reportsApi";
import type { LeadStatus } from "../../app/api/leadsApi/types";
import type { RootState } from "../../app/store";
import { useBranch } from "../../Context/BranchContext";
import { useToast } from "../../Context/ToastContext";
import { downloadExcelBlob } from "../../utils/downloadExcel";
import { toLocalISODate } from "../../utils/localDate";
import { withApiDetail } from "../Sections/withApiDetail";
import { EMPTY_LEAD_FILTERS, type LeadFilters } from "./leadFilters";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FilterConfig {
  key: "sectionId" | "sourceId" | "courseId" | "status";
  label: string;
  options: { value: string; label: string }[];
}

const LEAD_STATUSES: LeadStatus[] = ["ACTIVE", "IN_TRIAL", "CONVERTED", "CANCELLED"];

// ─── Date helpers ─────────────────────────────────────────────────────────────

const fromIsoDate = (iso: string): Date | null => (iso ? new Date(`${iso}T00:00:00`) : null);

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

// Month and weekday names come from Intl so the calendar follows the app
// language; 2024-01-07 is a Sunday.
const monthName = (locale: string, year: number, month: number) =>
  new Date(year, month, 1).toLocaleDateString(locale, { month: "long" });
const weekdayName = (locale: string, weekday: number) =>
  new Date(2024, 0, 7 + weekday).toLocaleDateString(locale, { weekday: "short" });

const PRESETS = [
  { labelKey: "leadsPage.filters.presets.week", days: 7 },
  { labelKey: "leadsPage.filters.presets.month", days: 30 },
  { labelKey: "leadsPage.filters.presets.quarter", days: 90 },
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
  const { i18n } = useTranslation();
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
        {year} {monthName(i18n.language, year, month)}
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", mb: 0.5 }}>
        {[0, 1, 2, 3, 4, 5, 6].map((d) => (
          <Typography
            key={d}
            align="center"
            sx={{ fontSize: 12, color: "text.disabled", py: 0.5, fontWeight: 500 }}
          >
            {weekdayName(i18n.language, d)}
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
                    ? "var(--color-primary-surface)"
                    : "transparent",
                position: "relative",
                "&::before":
                  inRng && !isStart && !isEnd
                    ? {
                        content: '""',
                        position: "absolute",
                        inset: 0,
                        backgroundColor: "var(--color-primary-surface)",
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
  const { t } = useTranslation();
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
      {/* Top: date inputs (GET /leads filters by whole days, so no time) */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.5, borderBottom: "0.5px solid", borderColor: "divider" }}>
        <TextField size="small" placeholder={t("leadsPage.filters.startDate")} value={formatDate(localStart)} InputProps={{ readOnly: true }} sx={{ flex: 1, "& input": { fontSize: 13 } }} />
        <Box sx={{ color: "text.disabled", fontSize: 18, px: 0.5 }}>›</Box>
        <TextField size="small" placeholder={t("leadsPage.filters.endDate")} value={formatDate(localEnd)} InputProps={{ readOnly: true }} sx={{ flex: 1, "& input": { fontSize: 13 } }} />
      </Box>

      {/* Body */}
      <Box sx={{ display: "flex" }}>
        {/* Presets */}
        <Box sx={{ width: 130, borderRight: "0.5px solid", borderColor: "divider", py: 1 }}>
          {PRESETS.map((p) => (
            <Box
              key={p.labelKey}
              onClick={() => applyPreset(p.days)}
              sx={{
                px: 2, py: 1, fontSize: 13, cursor: "pointer", color: "text.primary",
                "&:hover": { backgroundColor: "action.hover" },
              }}
            >
              {t(p.labelKey)}
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
          onClick={() => { setLocalStart(null); setLocalEnd(null); onApply(null, null); onClose(); }}
          sx={{ fontSize: 13, color: "#1976d2", fontWeight: 400 }}
        >
          {t("leadsPage.filters.clear")}
        </Button>
        <Button
          size="small"
          onClick={() => { onApply(localStart, localEnd); onClose(); }}
          sx={{ fontSize: 13, color: "text.disabled", fontWeight: 400 }}
          disabled={!localStart}
        >
          {t("leadsPage.filters.apply")}
        </Button>
      </Box>
    </Popover>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface FromWhereProps {
  filters: LeadFilters;
  onChange: (filters: LeadFilters) => void;
  onOpenColumnSettings?: () => void;
  onOpenSourceSettings?: () => void;
}

export const FromWhere = ({ filters, onChange, onOpenColumnSettings, onOpenSourceSettings }: FromWhereProps) => {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const { branchLabel } = useBranch();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const { data: sectionsData } = useAllLeadSectionsQuery();
  const { data: sourcesData } = useAllLeadSourcesQuery();
  const { data: courses } = useCoursesSelectQuery();
  const [fetchExcel] = useLazyReportLeadsExcelQuery();

  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);

  const startDate = fromIsoDate(filters.startDate);
  const endDate = fromIsoDate(filters.endDate);

  const filterConfigs: FilterConfig[] = [
    {
      key: "sectionId",
      label: t("leadsPage.filters.section"),
      options: (sectionsData?.data ?? []).map((s) => ({ value: s.id, label: s.name })),
    },
    {
      key: "sourceId",
      label: t("leadsPage.filters.source"),
      options: (sourcesData?.data ?? []).map((s) => ({ value: s.id, label: s.name })),
    },
    {
      key: "courseId",
      label: t("leadsPage.filters.course"),
      options: (courses ?? []).map((c) => ({ value: c.id, label: c.name })),
    },
    {
      key: "status",
      label: t("leadsPage.filters.status"),
      options: LEAD_STATUSES.map((s) => ({ value: s, label: t(`leadsPage.filters.statuses.${s}`) })),
    },
  ];

  const handleReset = () => onChange(EMPTY_LEAD_FILTERS);

  // There is no GET /leads/excel in the API — the leads report's export is the
  // only lead export, so it honours just the date range, status and branch.
  const handleExport = async () => {
    try {
      const blob = await fetchExcel({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        status: filters.status || undefined,
        branchId: selectedBranchId ?? undefined,
      }).unwrap();
      downloadExcelBlob(blob, "leads", branchLabel);
    } catch (err) {
      toast.error(withApiDetail(t("reports.common.exportError"), err));
    }
  };

  const moreMenuItems = [
    { key: "export", label: t("leadsPage.filters.menu.export"), icon: <FiDownload size={15} />, onClick: handleExport },
    { key: "divider" },
    { key: "columns", label: t("leadsPage.filters.menu.columns"), icon: <FiColumns size={15} />, onClick: onOpenColumnSettings },
    { key: "sources", label: t("leadsPage.filters.menu.sources"), icon: <FiShare2 size={15} />, onClick: onOpenSourceSettings },
    { key: "forms", label: t("leadsPage.filters.menu.forms"), icon: <FiFileText size={15} />, onClick: () => navigate("/settings/forms/list") },
  ];

  const dateLabel = startDate
    ? `${formatDate(startDate)} – ${endDate ? formatDate(endDate) : "..."}`
    : t("leadsPage.filters.dateRange");

  return (
    <Box sx={{ backgroundColor: "background.paper", borderBottom: "0.5px solid", borderColor: "divider" }}>
      <Box sx={{ px: 1.5, py: 1, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>

        {/* Search */}
        <TextField
          size="small"
          placeholder={t("leadsPage.filters.search")}
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FiSearch size={13} color="var(--color-text-muted)" />
              </InputAdornment>
            ),
            sx: { fontSize: 13, height: 32 },
          }}
          sx={{ width: 110 }}
        />

        {/* Filter dropdowns */}
        {filterConfigs.map((filter) => (
          <TextField
            key={filter.key}
            size="small"
            select
            value={filters[filter.key]}
            onChange={(e) => onChange({ ...filters, [filter.key]: e.target.value })}
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
            <MenuItem value=""><em>{t("leadsPage.filters.all")}</em></MenuItem>
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
          // Remounts when the applied range changes (e.g. on Reset) so the
          // picker's own draft selection never shows a stale range.
          key={`${filters.startDate}|${filters.endDate}`}
          anchorEl={dateAnchor}
          onClose={() => setDateAnchor(null)}
          startDate={startDate}
          endDate={endDate}
          onApply={(s, e) => onChange({
            ...filters,
            startDate: s ? toLocalISODate(s) : "",
            endDate: e ? toLocalISODate(e) : "",
          })}
        />

        {/* Reset */}
        <Button
          size="small"
          onClick={handleReset}
          title={t("leadsPage.filters.reset")}
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
            {moreMenuItems.map((item) => {
              if (item.key === "divider") {
                return <Divider key={item.key} sx={{ my: 0.5 }} />;
              }
              return (
                <MenuItem
                  key={item.key}
                  onClick={() => {
                    setMoreAnchor(null);
                    item.onClick?.();
                  }}
                  sx={{
                    fontSize: 13,
                    px: 2,
                    py: 0.75,
                    color: "text.primary",
                    "&:hover": { backgroundColor: "action.hover" },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 28, color: "text.secondary" }}>
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