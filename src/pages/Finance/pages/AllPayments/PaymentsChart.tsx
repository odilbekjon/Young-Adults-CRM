import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";

import { bucketLabel, bucketRangeLabel, type ChartSeries } from "./period";
import { fmt } from "./format";

const LINE_COLOR = "#e07020";
// A month of days still gets a dot per point; a year of weeks or years of
// months would only be a smear of circles.
const MAX_DOTS = 40;
// Even a period with no payments at all gets a readable 0..100 000 axis.
const MIN_AXIS_TOP = 100_000;

interface Datum {
  label: string;
  range: string;
  amount: number;
}

// Money received per day (or per week / month for a long period) across the
// whole selected range — empty days are 0, so the line always spans it.
export const PaymentsChart = ({ series, spansMonths }: { series: ChartSeries; spansMonths: boolean }) => {
  const { t } = useTranslation();

  const data = useMemo<Datum[]>(
    () =>
      series.buckets.map((bucket) => ({
        label: bucketLabel(bucket, series.granularity, spansMonths),
        range: bucketRangeLabel(bucket),
        amount: bucket.amount,
      })),
    [series, spansMonths],
  );

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="label"
          interval="preserveStartEnd"
          minTickGap={6}
          tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, (max: number) => Math.max(max, MIN_AXIS_TOP)]}
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
          tickFormatter={(v) => `${fmt(Number(v))} UZS`}
          tickLine={false}
          axisLine={false}
          width={112}
        />
        <Tooltip
          labelFormatter={(label, payload) => (payload?.[0]?.payload as Datum | undefined)?.range ?? label}
          formatter={(v) => (v !== undefined ? [`${fmt(Number(v))} UZS`, t("finance.allPayments.chart.payments")] : null)}
          contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
        />
        <Line
          type="monotone"
          dataKey="amount"
          name={t("finance.allPayments.chart.payments")}
          stroke={LINE_COLOR}
          strokeWidth={2.5}
          dot={data.length <= MAX_DOTS ? { r: 3.5, fill: "var(--color-surface)", stroke: LINE_COLOR, strokeWidth: 2 } : false}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
