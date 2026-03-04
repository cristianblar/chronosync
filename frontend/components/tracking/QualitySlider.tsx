"use client";

interface QualitySliderProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  showEmoji?: boolean;
}

function emoji(value: number) {
  if (value <= 3) return "😴";
  if (value <= 7) return "😊";
  return "😄";
}

export function QualitySlider({
  value,
  onChange,
  label,
  showEmoji = true,
}: QualitySliderProps) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">
        {label}: {value}/10 {showEmoji ? emoji(value) : ""}
      </span>
      <input
        max={10}
        min={1}
        onChange={(event) => onChange(Number(event.target.value))}
        type="range"
        value={value}
      />
    </label>
  );
}
