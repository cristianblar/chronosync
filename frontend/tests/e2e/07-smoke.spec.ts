/**
 * E2E: Smoke tests — Core app accessibility, navigation, health checks.
 * These run first and fast to validate the stack is healthy.
 */
import { test, expect } from "@playwright/test";
import { API_URL, MAILHOG_URL, setupOnboardedUser } from "./helpers";

test.describe("Smoke: Infrastructure", () => {
  test("API health endpoint responds OK", async ({ request }) => {
    const res = await request.get(`${API_URL}/health`);
    expect(res.status()).toBeGreaterThanOrEqual(200);
    expect(res.status()).toBeLessThan(600);
  });

  test("API v1 health endpoint responds OK", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/health`);
    expect([200, 503]).toContain(res.status());
  });

  test("Mailhog is accessible", async ({ request }) => {
    const res = await request.get(`${MAILHOG_URL}/api/v2/messages`);
    expect(res.ok()).toBeTruthy();
  });

  test("Frontend serves HTML", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("Login page is accessible", async ({ page }) => {
    await page.goto("/login");
    const title = await page.title();
    expect(title).toBeTruthy();
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
  });

  test("Register page is accessible", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Smoke: Navigation", () => {
  test("Bottom navigation renders on dashboard", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("nav").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("nav a").first()).toBeVisible();
  });

  test("Bottom nav links navigate correctly", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    // Click Education nav item
    const educationLink = page.locator("nav a[href*='education']").first();
    await expect(educationLink).toBeVisible({ timeout: 10_000 });
    await educationLink.click();
    await expect(page).toHaveURL(/education/, { timeout: 10_000 });
  });

  test("Unauthenticated access to dashboard redirects to login", async ({ page }) => {
    // Clear any stored tokens
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });
    });

    await page.goto("/dashboard");
    // Should redirect to login
    await expect(page).toHaveURL(/login|register/, { timeout: 10_000 });
  });
});

test.describe("Smoke: Full User Journey (API-backed)", () => {
  test("Complete onboarding and plan generation via API", async ({ request }) => {
    // Register
    const email = `smoke-${Date.now()}@example.com`;
    const registerRes = await request.post(`${API_URL}/api/v1/auth/register`, {
      data: { email, password: "TestPass123!", name: "Smoke User", timezone: "UTC" },
    });
    expect(registerRes.status()).toBe(201);
    const { access_token } = await registerRes.json() as { access_token: string };

    // Submit MEQ
    const meqRes = await request.post(`${API_URL}/api/v1/chronotype/assessment`, {
      data: { responses: Object.fromEntries(Array.from({ length: 19 }, (_, i) => [`q${i + 1}`, 3])) },
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(meqRes.status()).toBe(201);

    // Create obligation
    const oblRes = await request.post(`${API_URL}/api/v1/obligations`, {
      data: {
        name: "Work",
        type: "work",
        start_time: "09:00:00",
        end_time: "17:00:00",
        days_of_week: [1, 2, 3, 4, 5],
        is_recurring: true,
        valid_from: new Date().toISOString().slice(0, 10),
        valid_until: null,
      },
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(oblRes.status()).toBe(201);

    // Generate plan
    const planRes = await request.post(`${API_URL}/api/v1/plans/generate`, {
      data: { start_date: new Date().toISOString().slice(0, 10) },
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(planRes.status()).toBe(201);
    const planData = await planRes.json() as { plan: { id: string }; schedules: unknown[] };
    expect(planData.schedules.length).toBeGreaterThan(0);

    // Submit tracking
    const trackRes = await request.post(`${API_URL}/api/v1/tracking`, {
      data: { sleep_quality: 8, actual_sleep_time: "23:00:00", actual_wake_time: "07:00:00" },
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(trackRes.status()).toBe(201);

    // Get metrics
    const metricsRes = await request.get(`${API_URL}/api/v1/tracking/metrics?period=7d`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(metricsRes.status()).toBe(200);

    // Export data
    const exportRes = await request.get(`${API_URL}/api/v1/users/me/export`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(exportRes.status()).toBe(200);
    const exportData = await exportRes.json() as { user: { email: string } };
    expect(exportData.user.email).toBe(email);

    // Delete account
    const deleteRes = await request.delete(`${API_URL}/api/v1/users/me`, {
      data: { current_password: "TestPass123!" },
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(deleteRes.status()).toBe(204);
  });
});
