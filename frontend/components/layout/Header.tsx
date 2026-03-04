import type { ReactNode } from "react";
interface HeaderProps {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
}

export function Header({ title, subtitle, rightSlot }: HeaderProps) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {rightSlot}
    </header>
  );
}

