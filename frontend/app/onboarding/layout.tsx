import type { PropsWithChildren } from "react";
import { Container } from "@/components/layout/Container";

export default function OnboardingSegmentLayout({ children }: PropsWithChildren) {
  return <Container>{children}</Container>;
}

