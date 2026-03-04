import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "@/components/ui/ProgressBar";

describe("ProgressBar", () => {
  it("sets ARIA values", () => {
    render(<ProgressBar value={50} max={100} />);
    const progress = screen.getByRole("progressbar");
    expect(progress).toHaveAttribute("aria-valuenow", "50");
    expect(progress).toHaveAttribute("aria-valuemax", "100");
  });

  it("caps percentage range", () => {
    const { rerender } = render(<ProgressBar value={200} max={100} />);
    let bar = screen.getByRole("progressbar").firstElementChild as HTMLElement;
    expect(bar.style.width).toBe("100%");

    rerender(<ProgressBar value={-10} max={100} />);
    bar = screen.getByRole("progressbar").firstElementChild as HTMLElement;
    expect(bar.style.width).toBe("0%");
  });
});

