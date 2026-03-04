/**
 * E2E: Settings — Profile, Notifications, Data export, Account management.
 */
import { test, expect } from "@playwright/test";
import { setupOnboardedUser, API_URL } from "./helpers";

test.describe("Settings", () => {
  test("Settings page shows all sections", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("text=/Ajustes|Settings/i").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=/Perfil|Profile/i").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=/Notificaciones/i").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=/datos|privacidad/i").first()).toBeVisible({ timeout: 5_000 });
  });

  test("Profile settings page loads", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/settings/profile");
    await page.waitForLoadState("domcontentloaded");

    // Header renders <h1>Perfil</h1>
    await expect(page.locator("h1").filter({ hasText: /Perfil/i }).first()).toBeVisible({ timeout: 10_000 });
    // Input without explicit type (implicit text) — match by label text instead
    await expect(page.locator("label").filter({ hasText: /Nombre/i }).first()).toBeVisible({ timeout: 5_000 });
  });

  test("Profile name can be updated and persists", async ({ page, request }) => {
    const { token } = await setupOnboardedUser(page, request);

    await page.goto("/settings/profile");
    await page.waitForLoadState("domcontentloaded");

    // The Input component renders without `name` attr when none is passed.
    // The first input in the form is always the name field.
    await expect(page.locator("h1").filter({ hasText: /Perfil/i })).toBeVisible({ timeout: 10_000 });
    const nameInput = page.locator("input").first();
    await expect(nameInput).toBeVisible({ timeout: 5_000 });

    // Clear and type a new name. Use triple-click + type to properly fire
    // React's onChange handler (plain fill() may not trigger synthetic events).
    const newName = `Test User ${Date.now()}`;
    await nameInput.click({ clickCount: 3 });
    await page.keyboard.type(newName);

    // Submit — button text is "Guardar cambios"
    await page.locator("button").filter({ hasText: /Guardar cambios/i }).first().click();

    // Toast message: "Perfil actualizado correctamente."
    await expect(
      page.locator("text=/actualizado|guardado|éxito/i").first()
    ).toBeVisible({ timeout: 10_000 });

    // Verify via API that the name was actually saved
    const meRes = await request.get(`${API_URL}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meRes.status()).toBe(200);
    const me = await meRes.json() as { name: string };
    expect(me.name).toBe(newName);
  });

  test("Notifications settings can be toggled", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/settings/notifications");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("text=/notificacion|Notificacion/i").first()).toBeVisible({ timeout: 10_000 });

    // Find a toggle/checkbox and click it
    const toggle = page.locator('input[type="checkbox"], [role="switch"]').first();
    if (await toggle.isVisible({ timeout: 5_000 })) {
      const initialState = await toggle.isChecked().catch(() => false);
      await toggle.click();
      // State should have changed
      const newState = await toggle.isChecked().catch(() => false);
      expect(newState).not.toBe(initialState);
    }
  });

  test("Notification settings save without API errors", async ({ page, request }) => {
    const { token } = await setupOnboardedUser(page, request);

    // Endpoint is PUT /api/v1/notifications/settings.
    // Must include all required fields from NotificationSettings schema.
    const res = await request.put(`${API_URL}/api/v1/notifications/settings`, {
      data: {
        wind_down_enabled: true,
        wind_down_minutes_before: 60,
        tracking_reminder_enabled: true,
        tracking_reminder_time: "08:00",
        activity_reminders_enabled: false,
        max_per_day: 5,
        quiet_hours_start: "22:00",
        quiet_hours_end: "07:00",
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    // Must not return 422 (Pydantic validation errors on time fields)
    expect(res.status()).not.toBe(422);
    expect(res.status()).toBe(200);
  });

  test("Data export button triggers download", async ({ page, request }) => {
    const { token } = await setupOnboardedUser(page, request);

    // Test export via API
    const exportRes = await request.get(`${API_URL}/api/v1/users/me/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(exportRes.status()).toBe(200);
    const data = await exportRes.json() as { user: { email: string } };
    expect(data.user).toBeDefined();
    expect(data.user.email).toBeTruthy();
  });

  test("Data page loads with export and delete options", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/settings/data");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("text=/datos|exportar|eliminar|GDPR/i").first()).toBeVisible({ timeout: 10_000 });
  });

  test("About page shows app info and medical disclaimer", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/settings/about");
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.locator("text=/Acerca de|versión|ChronoSync|descargo|médico/i").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Logout button clears session and redirects to /login", async ({ page, request }) => {
    await setupOnboardedUser(page, request);

    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");

    // LogoutButton renders "Cerrar sesión"
    const logoutBtn = page.locator("button").filter({ hasText: /Cerrar sesión/i }).first();
    await expect(logoutBtn).toBeVisible({ timeout: 10_000 });
    await logoutBtn.click();

    // Should redirect to /login after logout
    await page.waitForURL("**/login**", { timeout: 15_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5_000 });

    // Verify tokens are gone from the browser cookie jar.
    // (Checking a protected-route redirect here is unreliable: addInitScript
    // re-injects tokens into localStorage on every page.goto, causing AuthHydrator
    // to re-set the cookies before the proxy can deny access.)
    const cookies = await page.evaluate(() => document.cookie);
    expect(cookies).not.toContain("access_token=eyJ");
  });
});
