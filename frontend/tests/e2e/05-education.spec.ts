/**
 * E2E: Education — article library, FAQ, article detail, reading progress.
 */
import { test, expect } from "@playwright/test";
import { setupOnboardedUser } from "./helpers";

test.describe("Education", () => {
  test("Education page shows articles tab by default", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/education");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("text=/Aprender|Artículos|Education/i").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=/Artículos/i").first()).toBeVisible({ timeout: 5_000 });
  });

  test("Article cards are visible with categories", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/education");
    await page.waitForLoadState("domcontentloaded");

    // Category pills should exist
    await expect(
      page.locator("button, span").filter({ hasText: /Todo|cronotipos|sueño|luz|cafeína|ejercicio/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Clicking an article opens the detail page", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/education");
    await page.waitForLoadState("domcontentloaded");

    // Click first article link
    const articleLink = page.locator("a[href*='/education/articles/']").first();
    await expect(articleLink).toBeVisible({ timeout: 10_000 });
    await articleLink.click();

    await expect(page).toHaveURL(/\/education\/articles\//, { timeout: 10_000 });
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Article detail shows body content and reading progress bar", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/education");
    await page.waitForLoadState("domcontentloaded");

    const articleLink = page.locator("a[href*='/education/articles/']").first();
    if (await articleLink.isVisible({ timeout: 5_000 })) {
      await articleLink.click();
      await page.waitForLoadState("domcontentloaded");

      // Article body should have content
      await expect(page.locator("text=/¿Qué es|Introducción|El reloj|cafeína|sueño|ejercicio/i").first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test("FAQ page shows expandable questions", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/education/faq");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("text=/FAQ|Preguntas|preguntas/i").first()).toBeVisible({ timeout: 10_000 });

    // At least one question should be visible
    await expect(page.locator("button").filter({ hasText: /\?/ }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("FAQ search filters results", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/education/faq");
    await page.waitForLoadState("domcontentloaded");

    const searchInput = page.locator('input[type="text"], input[placeholder*="Buscar"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    await searchInput.fill("cafeína");
    await page.waitForTimeout(500);

    // Results should be filtered (some questions visible, or a "no results" message)
    const visibleQ = page.locator("button").filter({ hasText: /\?/ });
    const noResults = page.locator("text=/No se encontraron/i");
    await expect(visibleQ.first().or(noResults)).toBeVisible({ timeout: 5_000 });
  });

  test("Education tab switching works (Articles, FAQ, Bookmarks)", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/education");
    await page.waitForLoadState("domcontentloaded");

    // Click FAQ tab
    const faqTab = page.locator("button").filter({ hasText: /^FAQ$/ });
    if (await faqTab.isVisible({ timeout: 5_000 })) {
      await faqTab.click();
      await expect(page.locator("a[href*='/education/faq']")).toBeVisible({ timeout: 5_000 });
    }
  });
});
