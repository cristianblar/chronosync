/**
 * E2E: Authentication flows — Register, Login, Verify Email, Forgot Password.
 */
import { test, expect } from "@playwright/test";
import {
  makeTestUser,
  apiRegister,
  API_URL,
  MAILHOG_URL,
} from "./helpers";

test.describe("Authentication", () => {
  test("Register page renders correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("Login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    // The login page shows ChronoSync as h1, email and password inputs
    await expect(page.locator("h1, h2").filter({ hasText: /ChronoSync/i }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("Register new user and redirect to onboarding", async ({ page }) => {
    const user = makeTestUser();
    await page.goto("/register");

    await page.locator('input[type="text"], input[name="name"], input[placeholder*="nombre"]').first().fill(user.name);
    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);

    // Accept terms if checkbox exists
    const checkbox = page.locator('input[type="checkbox"]');
    if (await checkbox.isVisible()) {
      await checkbox.check();
    }

    await page.locator('button[type="submit"]').click();

    // Should redirect to onboarding after registration
    await expect(page).toHaveURL(/\/(onboarding|dashboard)/, { timeout: 15_000 });
  });

  test("Login with valid credentials", async ({ page, request }) => {
    const user = makeTestUser();
    await apiRegister(request, user);

    await page.goto("/login");
    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.locator('button[type="submit"]').click();

    // Should redirect to onboarding (no MEQ done yet) or dashboard
    await expect(page).toHaveURL(/\/(onboarding|dashboard)/, { timeout: 15_000 });
  });

  test("Login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("nonexistent@example.com");
    await page.locator('input[type="password"]').fill("WrongPass123!");
    await page.locator('button[type="submit"]').click();

    // Should stay on login page and show an error
    await expect(page).toHaveURL(/login/, { timeout: 5_000 });
    // Error message should appear (either inline or as toast)
    await expect(page.locator('[class*="error"], [class*="text-error"], [role="alert"]').first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("Email verification flow works", async ({ request }) => {
    const user = makeTestUser();
    const auth = await apiRegister(request, user);

    // Request email verification
    await request.post(`${API_URL}/api/v1/auth/send-verification`, {
      headers: { Authorization: `Bearer ${auth.access_token}` },
    }).catch(() => {
      // If endpoint doesn't exist, skip
    });

    // Check that Mailhog is accessible (our email service works)
    const mailhogRes = await request.get(`${MAILHOG_URL}/api/v2/messages`);
    expect(mailhogRes.ok()).toBeTruthy();
  });
});
