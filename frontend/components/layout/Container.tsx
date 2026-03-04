import type { PropsWithChildren } from "react";

export function Container({ children }: PropsWithChildren) {
  return (
    <main className="mobile-container" id="main-content" tabIndex={-1}>
      {children}
    </main>
  );
}
