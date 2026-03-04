import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders label and handles click", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Guardar</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows loading state and disables button", () => {
    render(<Button isLoading>Guardar</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("applies variant styles", () => {
    render(<Button variant="danger">Eliminar</Button>);
    expect(screen.getByRole("button", { name: "Eliminar" })).toHaveClass("bg-error");
  });
});

