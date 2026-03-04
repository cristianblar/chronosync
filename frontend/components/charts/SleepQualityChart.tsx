"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface SleepQualityChartProps {
  data: Array<{ day: string; value: number }>;
}

export function SleepQualityChart({ data }: SleepQualityChartProps) {
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer height="100%" minWidth={0} width="100%">
        <LineChart data={data}>
          <XAxis dataKey="day" />
          <YAxis domain={[1, 10]} />
          <Tooltip />
          <Line dataKey="value" stroke="#6366F1" strokeWidth={2.5} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

