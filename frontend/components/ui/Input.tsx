import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, icon, className, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    const errorId = error ? `${inputId}-error` : undefined;
    return (
      <div className="grid gap-1 text-sm">
        {label ? (
          <label className="font-medium text-foreground" htmlFor={inputId}>
            {label}
          </label>
        ) : null}
        <div className="relative">
          {icon ? (
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
              {icon}
            </div>
          ) : null}
          <input
            ref={ref}
            aria-describedby={errorId}
            aria-invalid={Boolean(error)}
            id={inputId}
            className={cn(
              "min-h-11 w-full rounded-xl border bg-white py-2 text-sm outline-none transition",
              icon ? "pl-10 pr-3" : "px-3",
              error ? "border-error focus:ring-error/30" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20",
              className,
            )}
            {...props}
          />
        </div>
        {helper && !error ? <span className="text-xs text-muted">{helper}</span> : null}
        {error ? (
          <span className="text-xs text-error" id={errorId}>
            {error}
          </span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
