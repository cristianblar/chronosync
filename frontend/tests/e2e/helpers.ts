/**
 * E2E test helpers.
 * Provides utilities for auth flows, Mailhog API, and common page actions.
 */
import { type Page, type APIRequestContext, expect } from "@playwright/test";

export const API_URL = process.env.API_URL ?? "http://localhost:8001";
export const MAILHOG_URL = process.env.MAILHOG_URL ?? "http://localhost:8026";

/** Generate a unique test email address. */
export function uniqueEmail(prefix = "e2e") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

/** Standard test user credentials. */
export interface TestUser {
  email: string;
  password: string;
  name: string;
}

export function makeTestUser(): TestUser {
  return {
    email: uniqueEmail(),
    password: "TestPass123!",
    name: "E2E Test User",
  };
}

/** Wait for Mailhog to receive an email for the given recipient, return the latest message. */
export async function waitForEmail(
  request: APIRequestContext,
  toEmail: string,
  timeout = 10_000,
): Promise<{ subject: string; body: string }> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const res = await request.get(`${MAILHOG_URL}/api/v2/messages`);
    const data = await res.json() as { items: MailhogMessage[] };
    const msg = data.items?.find((m) =>
      m.To?.some((r) => r.Mailbox + "@" + r.Domain === toEmail),
    );
    if (msg) {
      const body = msg.Content?.Body ?? "";
      const subject = msg.Content?.Headers?.Subject?.[0] ?? "";
      return { subject, body };
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email found for ${toEmail} within ${timeout}ms`);
}

interface MailhogMessage {
  To?: Array<{ Mailbox: string; Domain: string }>;
  Content?: {
    Headers?: { Subject?: string[] };
    Body?: string;
  };
}

/** Extract verification token from email body (URL-encoded). */
export function extractToken(emailBody: string): string | null {
  const m = emailBody.match(/token=([A-Za-z0-9_\-%.]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Register a user via the API directly (faster than through UI). */
export async function apiRegister(
  request: APIRequestContext,
  user: TestUser,
): Promise<{ access_token: string; refresh_token: string }> {
  const res = await request.post(`${API_URL}/api/v1/auth/register`, {
    data: { email: user.email, password: user.password, name: user.name, timezone: "Europe/Madrid" },
  });
  expect(res.status()).toBe(201);
  return res.json();
}

/** Submit MEQ assessment via the API directly. */
export async function apiSubmitMEQ(
  request: APIRequestContext,
  token: string,
): Promise<void> {
  const responses: Record<string, number> = {};
  for (let i = 1; i <= 19; i++) {
    responses[`q${i}`] = 3;
  }
  const res = await request.post(`${API_URL}/api/v1/chronotype/assessment`, {
    data: { responses },
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(201);
}

/** Create obligation via the API directly. */
export async function apiCreateObligation(
  request: APIRequestContext,
  token: string,
): Promise<void> {
  const res = await request.post(`${API_URL}/api/v1/obligations`, {
    data: {
      name: "Trabajo E2E",
      type: "work",
      start_time: "09:00:00",
      end_time: "17:00:00",
      days_of_week: [0, 1, 2, 3, 4],
      is_recurring: true,
      valid_from: new Date().toISOString().slice(0, 10),
      valid_until: null,
    },
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(201);
}

/** Generate sleep plan via the API directly. */
export async function apiGeneratePlan(
  request: APIRequestContext,
  token: string,
): Promise<string> {
  const res = await request.post(`${API_URL}/api/v1/plans/generate`, {
    data: { start_date: new Date().toISOString().slice(0, 10) },
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(201);
  const data = await res.json() as { plan: { id: string } };
  return data.plan.id;
}

/**
 * Complete full onboarding via API (bypasses UI) and inject tokens into the page.
 * Uses Playwright's context.addCookies() for reliable server-side cookie delivery
 * (the Next.js middleware reads cookies from the request, not from JS).
 */
export async function setupOnboardedUser(
  page: Page,
  request: APIRequestContext,
): Promise<{ user: TestUser; token: string }> {
  const user = makeTestUser();
  const auth = await apiRegister(request, user);
  await apiSubmitMEQ(request, auth.access_token);
  await apiCreateObligation(request, auth.access_token);
  await apiGeneratePlan(request, auth.access_token);

  // Set cookies at the browser-context level — these are sent with every request,
  // including server-side navigation requests checked by Next.js middleware.
  const base = new URL(process.env.BASE_URL ?? "http://localhost:3001");
  await page.context().addCookies([
    {
      name: "access_token",
      value: auth.access_token,
      domain: base.hostname,
      path: "/",
      maxAge: 900,
      sameSite: "Lax",
    },
    {
      name: "refresh_token",
      value: auth.refresh_token,
      domain: base.hostname,
      path: "/",
      maxAge: 604800,
      sameSite: "Lax",
    },
    {
      name: "onboarding_complete",
      value: "1",
      domain: base.hostname,
      path: "/",
      maxAge: 31536000,
      sameSite: "Lax",
    },
  ]);

  // Use addInitScript to set localStorage BEFORE page JavaScript runs.
  // This avoids the race condition where navigating to a page (like /dashboard)
  // triggers API calls before the tokens are available in localStorage.
  // addInitScript runs on every subsequent page.goto() in this page context.
  await page.addInitScript(
    ({ accessToken, refreshToken }) => {
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      localStorage.setItem("onboarding_complete", "1");
    },
    { accessToken: auth.access_token, refreshToken: auth.refresh_token },
  );

  return { user, token: auth.access_token };
}
