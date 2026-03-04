import type { PropsWithChildren } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Container } from "@/components/layout/Container";
import { ToastStack } from "@/components/ui/Toast";

export default function MainLayout({ children }: PropsWithChildren) {
  return (
    <>
      <Container>{children}</Container>
      <ToastStack />
      <BottomNav />
    </>
  );
}

