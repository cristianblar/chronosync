import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Select } from "@/components/ui/Select";

describe("Select", () => {
  it("renders options and calls onChange", () => {
    const onChange = vi.fn();
    render(
      <Select
        label="Tipo"
        name="type"
        onChange={onChange}
        options={[
          { label: "Trabajo", value: "work" },
          { label: "Clase", value: "class" },
        ]}
        value="work"
      />,
    );
    const select = screen.getByLabelText("Tipo");
    expect(select).toHaveValue("work");
    fireEvent.change(select, { target: { value: "class" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

