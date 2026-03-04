/**
 * E2E: Dashboard and Plan views for a fully onboarded user.
 */
import { test, expect } from "@playwright/test";
import { setupOnboardedUser } from "./helpers";

test.describe("Dashboard", () => {
  test("Dashboard loads and shows greeting", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/dashboard");
    await expect(page.locator("text=/Buenos días|Buenas tardes|Buenas noches/i").first()).toBeVisible({ timeout: 15_000 });
  });

  test("Dashboard shows KPI cards", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    // Should have KPI cards for sleep quality, adherence, jet lag, energy
    await expect(page.locator("text=/Calidad|sueño/i").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=/Adherencia/i").first()).toBeVisible({ timeout: 5_000 });
  });

  test("Dashboard quick action links to tracking", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/dashboard");
    const trackingBtn = page.locator("a, button").filter({ hasText: /Registro rápido|tracking/i }).first();
    await expect(trackingBtn).toBeVisible({ timeout: 10_000 });
    await trackingBtn.click();
    await expect(page).toHaveURL(/tracking/, { timeout: 10_000 });
  });
});

test.describe("Plan", () => {
  test("Plan page shows weekly schedule", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/plan");
    await page.waitForLoadState("domcontentloaded");

    // Should show either the plan or a generate button
    const hasPlan = await page.locator("text=/Lun|Mar|Mié|Plan Semanal/i").first().isVisible({ timeout: 10_000 });
    const hasGenerateBtn = await page.locator("button, a").filter({ hasText: /Generar|generate/i }).first().isVisible();

    expect(hasPlan || hasGenerateBtn).toBeTruthy();
  });

  test("Plan day detail page loads", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    const today = new Date().toISOString().slice(0, 10);
    await page.goto(`/plan/${today}`);
    // Wait for the plan fetch (triggered by useEffect) to complete before asserting,
    // to avoid a race where the initial "No hay plan" flicker resolves to the
    // timeline (English activity names) before Playwright's first poll.
    await page.waitForLoadState("networkidle");

    // When plan is loaded: the timeline shows "Ver fundamento científico" buttons for
    // Wake/Sleep/LightExposure/WindDown items (always present for generated plans).
    // When no plan exists: shows "No hay plan disponible para este día."
    await expect(
      page.locator("text=/fundamento|No hay plan|Sin actividades/i").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Regenerate plan button exists on plan page", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/plan");
    await page.waitForLoadState("domcontentloaded");

    // Look for regenerate or generate button
    const btn = page.locator("button").filter({ hasText: /Regenerar|Generar/i }).first();
    await expect(btn).toBeVisible({ timeout: 10_000 });
  });
});
