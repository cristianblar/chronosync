import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "@/components/ui/Input";

describe("Input", () => {
  it("renders label and value", () => {
    render(<Input label="Email" name="email" value="a@b.com" onChange={() => undefined} />);
    expect(screen.getByLabelText("Email")).toHaveValue("a@b.com");
  });

  it("shows error text", () => {
    render(<Input label="Password" name="password" error="Requerido" onChange={() => undefined} />);
    expect(screen.getByText("Requerido")).toBeInTheDocument();
  });

  it("triggers onChange", () => {
    let value = "";
    render(<Input label="Nombre" name="nombre" onChange={(e) => (value = e.target.value)} />);
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Carlos" } });
    expect(value).toBe("Carlos");
  });

  it("renders icon when provided", () => {
    render(
      <Input
        label="Search"
        name="search"
        icon={<span data-testid="icon">🔍</span>}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});
