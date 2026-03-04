"use client";

type TimeOfDay =
  | "early_morning"
  | "morning"
  | "midday"
  | "afternoon"
  | "evening"
  | "night";

interface EnergySlidersProps {
  values: Record<TimeOfDay, number>;
  onChange: (timeOfDay: TimeOfDay, value: number) => void;
}

const order: TimeOfDay[] = [
  "early_morning",
  "morning",
  "midday",
  "afternoon",
  "evening",
  "night",
];

export function EnergySliders({ values, onChange }: EnergySlidersProps) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">Energía por franja</p>
      {order.map((period) => (
        <label className="grid gap-1 text-xs" key={period}>
          <span>
            {period.replace("_", " ")}: {values[period]}/10
          </span>
          <input
            max={10}
            min={1}
            onChange={(event) => onChange(period, Number(event.target.value))}
            type="range"
            value={values[period]}
          />
        </label>
      ))}
    </div>
  );
}
