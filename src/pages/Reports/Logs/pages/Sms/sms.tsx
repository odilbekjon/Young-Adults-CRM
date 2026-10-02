import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  Box,
  Typography,
  Chip,
  Divider,
  CircularProgress,
  MenuItem,
  Pagination,
  Select,
  TextField,
} from "@mui/material";
import { FiCircle } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useSmsHistoryQuery } from "../../../../../app/api/smsApi";
import type { RootState } from "../../../../../app/store";

const PAGE_SIZE = 10;
const SMS_PER_CHAR = 160;
const ROLES = ["TEACHER", "STUDENT"];

// "2026-09-24T22:28:08+05:00" -> { date: "24.09.2026", time: "22:28" } (shown
// in the viewer's local time zone).
const splitDateTime = (iso: string) => {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return { date: "—", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
};

export const Sms = () => {
  const { t } = useTranslation();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  // GET /sms/history
  const { data, isLoading, isFetching, isError } = useSmsHistoryQuery({
    search: debouncedSearch || undefined,
    role: role || undefined,
    branchId: selectedBranchId ?? "all",
    page,
    limit: PAGE_SIZE,
  });

  const rows = data?.rows ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <Box sx={{ m: 5, minHeight: "100vh", bgcolor: "#fff", p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 500, mb: 3, color: "#212121" }}>
        {t("reports.logs.sms.title")}
      </Typography>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
        <TextField
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("reports.logs.sms.searchPlaceholder")}
          sx={{ minWidth: 260 }}
        />
        <Select
          size="small"
          displayEmpty
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          sx={{ minWidth: 160, fontSize: 14 }}
        >
          <MenuItem value="">{t("reports.logs.sms.allRoles")}</MenuItem>
          {ROLES.map((r) => (
            <MenuItem key={r} value={r}>{t(`reports.logs.sms.roles.${r}`)}</MenuItem>
          ))}
        </Select>
        {isFetching && !isLoading && <CircularProgress size={20} sx={{ alignSelf: "center" }} />}
      </Box>

      <Box>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress size={26} /></Box>
        ) : isError ? (
          <Typography sx={{ py: 4, color: "error.main" }}>{t("reports.logs.sms.loadError")}</Typography>
        ) : rows.length === 0 ? (
          <Typography sx={{ py: 4, color: "text.secondary" }}>{t("reports.logs.sms.empty")}</Typography>
        ) : (
          rows.map((sms, index) => {
            const { date, time } = splitDateTime(sms.createdAt);
            const failed = sms.status === "FAILED";
            return (
              <Box key={sms.id}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, py: 1.5 }}>
                  {/* Circle icon */}
                  <Box sx={{ mt: 0.3, flexShrink: 0 }}>
                    <FiCircle size={18} color={failed ? "#e53935" : "#9e9e9e"} />
                  </Box>

                  {/* Recipient badge */}
                  <Box sx={{ flexShrink: 0, mt: 0.1 }}>
                    <Chip
                      label={sms.userRole ? t(`reports.logs.sms.roles.${sms.userRole}`, { defaultValue: sms.userRole }) : t("reports.logs.sms.system")}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "0.75rem", height: 22, borderColor: "#bdbdbd", color: "#555", borderRadius: "4px" }}
                    />
                  </Box>

                  {/* Recipient + message */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ color: "#555", display: "block" }}>
                      {[sms.userName, sms.phone].filter(Boolean).join(" · ")}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#212121", lineHeight: 1.6, wordBreak: "break-word" }}>
                      {sms.message}
                    </Typography>
                    {failed && sms.providerError && (
                      <Typography variant="caption" sx={{ color: "error.main", display: "block", mt: 0.5, wordBreak: "break-word" }}>
                        {sms.providerError}
                      </Typography>
                    )}
                  </Box>

                  {/* Status + SMS quantity */}
                  <Box sx={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
                    <Chip
                      label={t(`reports.logs.sms.status.${sms.status}`, { defaultValue: sms.status || "—" })}
                      size="small"
                      sx={{
                        fontSize: "0.7rem",
                        height: 20,
                        borderRadius: "4px",
                        bgcolor: failed ? "#fdecea" : "#e8f5e9",
                        color: failed ? "#c62828" : "#2e7d32",
                      }}
                    />
                    <Typography variant="caption" sx={{ color: "#555", whiteSpace: "nowrap" }}>
                      {t("reports.logs.sms.quantity", { count: Math.max(1, Math.ceil(sms.message.length / SMS_PER_CHAR)) })}
                    </Typography>
                  </Box>

                  {/* Date & Time */}
                  <Box sx={{ flexShrink: 0, textAlign: "right", minWidth: 80 }}>
                    <Typography variant="caption" sx={{ color: "#555", display: "block" }}>{date}</Typography>
                    <Typography variant="caption" sx={{ color: "#555", display: "block" }}>{time}</Typography>
                  </Box>
                </Box>
                {index < rows.length - 1 && <Divider />}
              </Box>
            );
          })
        )}
      </Box>

      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", pt: 2 }}>
          <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} size="small" />
        </Box>
      )}
    </Box>
  );
};
