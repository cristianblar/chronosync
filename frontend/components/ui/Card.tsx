import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  gradient?: boolean;
}

export function Card({ className, elevated = false, gradient = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-white p-4",
        elevated && "shadow-md",
        gradient && "gradient-hero border-none text-white",
        !elevated && !gradient && "shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
