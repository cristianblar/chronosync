import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ label: string; value: string }>;
}

export function Select({ label, options, id, ...props }: SelectProps) {
  const selectId = id ?? props.name;
  return (
    <label className="grid gap-1 text-sm" htmlFor={selectId}>
      {label ? <span className="font-medium">{label}</span> : null}
      <select className="min-h-11 rounded-xl border bg-white px-3 py-2 text-sm" id={selectId} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

