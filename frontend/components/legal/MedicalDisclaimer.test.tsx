import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MedicalDisclaimer } from "@/components/legal/MedicalDisclaimer";

describe("MedicalDisclaimer", () => {
  it("renders footer variant", () => {
    render(<MedicalDisclaimer variant="footer" />);
    expect(screen.getByText(/no reemplaza orientación médica/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /medical disclaimer/i });
    expect(link).toHaveAttribute("href", "/settings/about");
  });

  it("renders inline variant content", () => {
    render(<MedicalDisclaimer variant="inline" />);
    expect(screen.getByText(/información importante de salud/i)).toBeInTheDocument();
  });

  it("requires checkbox before acknowledge in modal", () => {
    localStorage.removeItem("chronosync_medical_disclaimer_ack");
    render(<MedicalDisclaimer variant="modal" />);
    const button = screen.getByRole("button", { name: "Entendido" });
    const scrollArea = screen.getByText(/desplázate hasta el final/i).closest("div");
    expect(scrollArea).not.toBeNull();
    const area = scrollArea as HTMLElement;
    expect(button).toBeDisabled();
    Object.defineProperty(area, "scrollHeight", { configurable: true, value: 300 });
    Object.defineProperty(area, "clientHeight", { configurable: true, value: 100 });
    Object.defineProperty(area, "scrollTop", { configurable: true, value: 200 });
    fireEvent.scroll(area);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(localStorage.getItem("chronosync_medical_disclaimer_ack")).toBe("true");
  });
});
