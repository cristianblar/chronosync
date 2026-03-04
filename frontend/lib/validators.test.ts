import { describe, expect, it } from "vitest";
import {
  emailSchema,
  eventSchema,
  loginSchema,
  obligationSchema,
  passwordSchema,
  registerSchema,
} from "@/lib/validators";

describe("validators", () => {
  it("validates email and password", () => {
    expect(emailSchema.safeParse("a@b.com").success).toBe(true);
    expect(emailSchema.safeParse("bad-email").success).toBe(false);
    expect(passwordSchema.safeParse("Password1").success).toBe(true);
    expect(passwordSchema.safeParse("short").success).toBe(false);
  });

  it("validates login/register schemas", () => {
    expect(
      loginSchema.safeParse({
        email: "a@b.com",
        password: "x",
      }).success,
    ).toBe(true);

    expect(
      registerSchema.safeParse({
        name: "Carlos",
        email: "a@b.com",
        password: "Password1",
      }).success,
    ).toBe(true);
  });

  it("validates obligation schema", () => {
    expect(
      obligationSchema.safeParse({
        name: "Trabajo oficina",
        type: "work",
        start_time: "08:00:00",
        end_time: "17:00:00",
        days_of_week: [0, 1],
        is_recurring: true,
        valid_from: "2026-02-18",
      }).success,
    ).toBe(true);
    expect(
      obligationSchema.safeParse({
        name: "x",
        type: "work",
        start_time: "08:00:00",
        end_time: "17:00:00",
        days_of_week: [],
        is_recurring: true,
        valid_from: "2026-02-18",
      }).success,
    ).toBe(false);
  });

  it("validates event schema", () => {
    expect(
      eventSchema.safeParse({
        name: "Examen final",
        type: "exam",
        event_date: "2026-03-01",
        importance: 5,
      }).success,
    ).toBe(true);
    expect(
      eventSchema.safeParse({
        name: "",
        type: "invalid",
        event_date: "2026-03-01",
        importance: 7,
      }).success,
    ).toBe(false);
  });
});
