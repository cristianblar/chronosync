interface ProgressBarProps {
  value: number;
  max?: number;
}

export function ProgressBar({ value, max = 100 }: ProgressBarProps) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div aria-valuemax={max} aria-valuemin={0} aria-valuenow={value} className="h-2 w-full rounded-full bg-slate-200" role="progressbar">
      <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all" style={{ width: `${percentage}%` }} />
    </div>
  );
}

