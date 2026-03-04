"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const variantMap: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 shadow-sm",
  secondary: "bg-secondary text-white hover:opacity-90 shadow-sm",
  outline: "border border-border bg-white text-foreground hover:bg-slate-50",
  ghost: "text-foreground hover:bg-slate-100",
  danger: "bg-error text-white hover:opacity-90 shadow-sm",
};

const sizeMap: Record<Size, string> = {
  sm: "min-h-8 px-3 py-1.5 text-xs rounded-lg",
  md: "min-h-11 px-4 py-2 text-sm rounded-xl",
  lg: "min-h-13 px-6 py-3 text-base rounded-xl",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  isLoading,
  iconLeft,
  iconRight,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition disabled:opacity-60 active:scale-[0.98]",
        variantMap[variant],
        sizeMap[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
          </svg>
          Cargando…
        </>
      ) : (
        <>
          {iconLeft}
          {children}
          {iconRight}
        </>
      )}
    </button>
  );
}
