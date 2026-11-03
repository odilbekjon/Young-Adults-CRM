import { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Box, Typography } from "@mui/material";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RTooltip,
  CartesianGrid, ResponsiveContainer, ReferenceDot,
} from "recharts";

import type { FinanceChartMonth } from "../../app/api/financeApi/types";

// The monthly revenue line. Lives in its own file so recharts (the biggest
// library in the app) is a separate chunk the Dashboard fetches while its numbers
// are loading, instead of weighing down the first download of every page.

const formatChartValue = (value: number, currency: string) => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B ${currency}`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)} 000 000 ${currency}`;
  return `${new Intl.NumberFormat("uz-UZ").format(value)} ${currency}`;
};

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChartTooltip = ({ active, payload, label }: any) => {
  const { t } = useTranslation();
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      background: "var(--color-surface)", border: "1px solid var(--color-border)",
      borderRadius: 2, px: 2.2, py: 1.6,
      boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
    }}>
      <Typography sx={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 700 }}>{label}</Typography>
      <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#f97316", mt: 0.3 }}>
        {formatChartValue(payload[0].value, t("dashboard.chart.currency"))}
      </Typography>
    </Box>
  );
};

// Memoised: the Dashboard re-renders each time one of its dozen queries lands,
// and redrawing the chart (and replaying its animation) for each of those would
// be wasted work - it only depends on the months themselves.
export const RevenueChart = memo(({ months }: { months: FinanceChartMonth[] }) => {
  const { t } = useTranslation();
  const currency = t("dashboard.chart.currency");

  const peakPoint = useMemo(() => {
    if (months.length === 0) return null;
    return months.reduce((max, point) => (point.totalPayments > max.totalPayments ? point : max), months[0]);
  }, [months]);

  const formatTick = useCallback((v: unknown) => formatChartValue(v as number, currency), [currency]);

  return (
    <Box height={230}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={months} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
            axisLine={false} tickLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
            axisLine={false} tickLine={false}
            tickFormatter={formatTick}
            width={130}
          />
          <RTooltip content={<ChartTooltip />} />
          <Line
            type="monotone" dataKey="totalPayments"
            stroke="#f97316" strokeWidth={2.5}
            dot={{ r: 4, fill: "var(--color-surface)", stroke: "#f97316", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#f97316" }}
            isAnimationActive
          />
          {peakPoint && (
            <ReferenceDot
              x={peakPoint.month}
              y={peakPoint.totalPayments}
              r={5} fill="#f97316" stroke="var(--color-surface)" strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
});

export default RevenueChart;
