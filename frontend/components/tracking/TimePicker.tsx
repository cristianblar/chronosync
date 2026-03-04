"use client";

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  label: string;
}

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        className="rounded-xl border bg-white px-3 py-2 text-sm"
        onChange={(event) => onChange(`${event.target.value}:00`)}
        type="time"
        value={value.slice(0, 5)}
      />
    </label>
  );
}
