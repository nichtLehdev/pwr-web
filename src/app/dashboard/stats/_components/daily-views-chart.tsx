"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const CHART_GRID_STROKE_LIGHT = "#e5e7eb";
const CHART_GRID_STROKE_DARK = "#2d3340"; // dark-border
const CHART_AXIS_TICK_LIGHT = "#6b7280";
const CHART_AXIS_TICK_DARK = "#8a8d93"; // dark-text-muted

type VisitorDetails = {
  topVisitors: { userDisplayName: string; count: number }[];
  otherViews: number;
  otherUsers: number;
};

/**
 * The daily page-view chart, in its own module so recharts (~100-150 KB
 * gzipped) is only loaded when the stats page renders it (via next/dynamic).
 */
export default function DailyViewsChart({
  recentDays,
  dayVisitorDetails,
  isDark,
}: {
  recentDays: { date: string; count: number }[];
  dayVisitorDetails?: Record<string, VisitorDetails>;
  isDark: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={recentDays.map((d) => ({
          date: d.date,
          Aufrufe: d.count,
          fullDate: d.date,
        }))}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-primary)"
              stopOpacity={0.4}
            />
            <stop
              offset="100%"
              stopColor="var(--color-primary)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={isDark ? CHART_GRID_STROKE_DARK : CHART_GRID_STROKE_LIGHT}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          interval={0}
          tick={{
            fontSize: 10,
            fill: isDark ? CHART_AXIS_TICK_DARK : CHART_AXIS_TICK_LIGHT,
          }}
          tickFormatter={(value: string) => {
            const parts = value.split("-");
            const m = parts[1];
            const d = parts[2];
            return m && d ? `${d}.${m}` : value;
          }}
          axisLine={{
            stroke: isDark ? CHART_GRID_STROKE_DARK : CHART_GRID_STROKE_LIGHT,
          }}
          tickLine={false}
        />
        <YAxis
          tick={{
            fontSize: 12,
            fill: isDark ? CHART_AXIS_TICK_DARK : CHART_AXIS_TICK_LIGHT,
          }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v.toLocaleString("de-DE")}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: isDark ? "1px solid #2d3340" : "1px solid #e5e7eb",
            backgroundColor: isDark ? "#252b36" : "#ffffff",
            color: isDark ? "#e4e6eb" : "#111827",
            boxShadow:
              "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
          }}
          content={(props) => (
            <ChartDayTooltipContent
              active={props.active}
              payload={props.payload}
              label={props.label != null ? String(props.label) : undefined}
              dayVisitorDetails={dayVisitorDetails}
              isDark={isDark}
            />
          )}
        />
        <Area
          type="monotone"
          dataKey="Aufrufe"
          stroke="var(--color-primary)"
          strokeWidth={2}
          fill="url(#visitorsGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ChartDayTooltipContent({
  active,
  payload,
  label,
  dayVisitorDetails,
  isDark,
}: {
  active?: boolean;
  payload?: readonly { value: number; name: string }[];
  label?: string;
  dayVisitorDetails?: Record<string, VisitorDetails>;
  isDark?: boolean;
}) {
  if (!active || !payload?.length || label == null) return null;
  const value = payload[0]?.value ?? 0;
  const details = dayVisitorDetails?.[label];
  const hasDetails =
    details && (details.topVisitors.length > 0 || details.otherViews > 0);

  const bg = isDark ? "#252b36" : "#ffffff";
  const color = isDark ? "#e4e6eb" : "#111827";
  const border = isDark ? "#2d3340" : "#e5e7eb";
  const muted = isDark ? "#8a8d93" : "#6b7280";
  const borderMuted = isDark ? "#2d3340" : "#e5e7eb";

  return (
    <div
      className="min-w-48 rounded-lg px-3 py-2 shadow-lg"
      style={{
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
      }}
    >
      <p className="font-medium">Datum: {label}</p>
      <p
        className="text-sm font-medium"
        style={{ color: "var(--color-primary)" }}
      >
        Aufrufe: {value.toLocaleString("de-DE")}
      </p>
      {hasDetails && details && (
        <>
          <p
            className="mt-2 text-xs font-medium tracking-wider uppercase"
            style={{ color: muted }}
          >
            Mit Konto zugeordnet
          </p>
          <ul className="mt-1 space-y-0.5">
            {details.topVisitors.map((v, i) => (
              <li key={i} className="flex justify-between gap-4 text-sm">
                <span className="truncate" title={v.userDisplayName}>
                  {v.userDisplayName}
                </span>
                <span className="shrink-0 tabular-nums">
                  {v.count} {v.count === 1 ? "Aufruf" : "Aufrufe"}
                </span>
              </li>
            ))}
          </ul>
          {details.otherViews > 0 && (
            <p
              className="mt-1.5 border-t pt-1.5 text-xs"
              style={{ borderColor: borderMuted, color: muted }}
            >
              {details.otherViews.toLocaleString("de-DE")} Aufrufe von{" "}
              {details.otherUsers}{" "}
              {details.otherUsers === 1
                ? "weiterem Nutzer"
                : "weiteren Nutzern"}
            </p>
          )}
        </>
      )}
    </div>
  );
}
