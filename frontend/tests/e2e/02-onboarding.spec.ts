/**
 * E2E: Onboarding flow — Welcome → MEQ → Obligations → Review → Generate Plan.
 */
import { test, expect } from "@playwright/test";
import { makeTestUser, apiRegister, apiSubmitMEQ, API_URL } from "./helpers";

async function setupWithTokens(
  page: import("@playwright/test").Page,
  auth: { access_token: string; refresh_token: string },
) {
  await page.goto("/");
  await page.evaluate(([at, rt]) => {
    localStorage.setItem("access_token", at);
    localStorage.setItem("refresh_token", rt);
    document.cookie = `access_token=${at}; path=/; max-age=900; samesite=lax`;
    document.cookie = `refresh_token=${rt}; path=/; max-age=604800; samesite=lax`;
  }, [auth.access_token, auth.refresh_token]);
}

test.describe("Onboarding", () => {
  test("Welcome page renders correctly after login", async ({ page, request }) => {
    const user = makeTestUser();
    const auth = await apiRegister(request, user);
    await setupWithTokens(page, auth);

    await page.goto("/onboarding/welcome");
    await expect(page.locator("h1, h2").filter({ hasText: /bienvenido|ChronoSync|cronotipo/i }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("a, button").filter({ hasText: /comenzar|empezar|start/i }).first()).toBeVisible();
  });

  test("MEQ page displays intro screen and questions", async ({ page, request }) => {
    const user = makeTestUser();
    const auth = await apiRegister(request, user);
    await setupWithTokens(page, auth);

    await page.goto("/onboarding/meq");

    // Intro screen should be visible
    await expect(page.locator("text=/Descubre tu Cronotipo|MEQ|evaluación/i").first()).toBeVisible({ timeout: 10_000 });

    // Click start button to go to questions
    const startBtn = page.locator("button, a").filter({ hasText: /comenzar|start|empezar/i }).first();
    if (await startBtn.isVisible()) {
      await startBtn.click();
    }

    // Should show a question
    await expect(page.locator("text=/pregunta|question|Q1|levantarías|dormirías/i").first()).toBeVisible({ timeout: 10_000 });
  });

  test("MEQ completion via button clicks leads to results", async ({ page, request }) => {
    const user = makeTestUser();
    const auth = await apiRegister(request, user);
    await setupWithTokens(page, auth);

    await page.goto("/onboarding/meq");

    // Skip intro if present
    const startBtn = page.locator("button, a").filter({ hasText: /comenzar|empezar/i }).first();
    if (await startBtn.isVisible({ timeout: 3_000 })) {
      await startBtn.click();
    }

    // Answer all 19 MEQ questions by clicking the first option for each
    for (let i = 0; i < 19; i++) {
      // Wait for question content
      await page.waitForSelector("button:not([disabled])", { timeout: 10_000 });

      // Click the first available option button (not the back button)
      const optionBtns = page.locator("button").filter({ hasText: /^\d{1,2}|AM|PM|\d{2}:\d{2}|Nada|Algo|Bastante|Muy|No lo|Lo pondría|Dependería|Definitivamente|Moderadamente|Intermedio|Mañana|Tarde|Noche|En exce|Bien|Regular|Mal|Madrugada|Media|Mediodía/i });
      const count = await optionBtns.count();
      if (count > 0) {
        await optionBtns.first().click();
      } else {
        // Fallback: click any enabled button that's not back
        const anyBtn = page.locator("div button:not([disabled])").nth(1);
        await anyBtn.click();
      }

      // Small delay to let state update
      await page.waitForTimeout(100);
    }

    // Should now show results screen
    await expect(page.locator("text=/cronotipo|Puntuación MEQ|Matutino|Vespertino|Intermedio/i").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Obligations page loads with add form", async ({ page, request }) => {
    const user = makeTestUser();
    const auth = await apiRegister(request, user);
    await setupWithTokens(page, auth);

    await page.goto("/onboarding/obligations");
    await expect(page.locator("text=/obligación|Obligaciones|trabajo|clases/i").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="text"], input[placeholder*="nombre"], input[placeholder*="Ej:"]').first()).toBeVisible();
    await expect(page.locator('input[type="time"]').first()).toBeVisible();
  });

  /**
   * Full onboarding API flow test.
   * Verifies that a newly registered user can complete the entire onboarding
   * sequence (MEQ → obligations → plan generation) and end up on the dashboard
   * with a valid plan displayed.
   *
   * This integration test would have caught the "duplicate active plans"
   * and "00:00 times" bugs since it regenerates and checks for valid times.
   */
  test("Full onboarding flow produces valid plan on dashboard", async ({ page, request }) => {
    const user = makeTestUser();
    const auth = await apiRegister(request, user);

    // Complete onboarding via API
    await apiSubmitMEQ(request, auth.access_token);

    // Add an obligation
    const obRes = await request.post(`${API_URL}/api/v1/obligations`, {
      data: {
        name: "Trabajo",
        type: "work",
        start_time: "09:00:00",
        end_time: "17:00:00",
        days_of_week: [0, 1, 2, 3, 4],
        is_recurring: true,
        valid_from: new Date().toISOString().slice(0, 10),
        valid_until: null,
      },
      headers: { Authorization: `Bearer ${auth.access_token}` },
    });
    expect(obRes.status()).toBe(201);

    // Generate plan
    const today = new Date().toISOString().slice(0, 10);
    const planRes = await request.post(`${API_URL}/api/v1/plans/generate`, {
      data: { start_date: today },
      headers: { Authorization: `Bearer ${auth.access_token}` },
    });
    expect(planRes.status()).toBe(201);
    const planBody = await planRes.json() as {
      plan: { id: string; target_wake_time: string; target_sleep_time: string };
    };

    // Wake/sleep times must not be 00:00 (regression for optimizer bug)
    expect(planBody.plan.target_wake_time).not.toBe("00:00:00");
    expect(planBody.plan.target_sleep_time).not.toBe("00:00:00");

    // GET /current should return the same plan (regression for duplicate-plan tiebreaker bug)
    const currentRes = await request.get(`${API_URL}/api/v1/plans/current`, {
      headers: { Authorization: `Bearer ${auth.access_token}` },
    });
    expect(currentRes.status()).toBe(200);
    const currentBody = await currentRes.json() as { plan: { id: string } };
    expect(currentBody.plan.id).toBe(planBody.plan.id);

    // Verify the plan has schedule items (activities) for each day
    const schedules = currentBody as unknown as {
      schedules: Array<{
        date: string;
        wake_time: string;
        sleep_time: string;
        items: Array<{ activity_type: string; scheduled_time: string }>;
      }>;
    };
    if (schedules.schedules) {
      for (const s of schedules.schedules) {
        expect(s.wake_time).not.toBe("00:00:00");
        expect(s.sleep_time).not.toBe("00:00:00");
        expect(s.items.length).toBeGreaterThan(0);
      }
    }

    // Navigate to dashboard — plan should be visible
    const base = new URL(process.env.BASE_URL ?? "http://localhost:3001");
    await page.context().addCookies([
      { name: "access_token", value: auth.access_token, domain: base.hostname, path: "/", maxAge: 900, sameSite: "Lax" },
      { name: "refresh_token", value: auth.refresh_token, domain: base.hostname, path: "/", maxAge: 604800, sameSite: "Lax" },
      { name: "onboarding_complete", value: "1", domain: base.hostname, path: "/", maxAge: 31536000, sameSite: "Lax" },
    ]);
    await page.addInitScript(
      ({ at, rt }) => {
        localStorage.setItem("access_token", at);
        localStorage.setItem("refresh_token", rt);
        localStorage.setItem("onboarding_complete", "1");
      },
      { at: auth.access_token, rt: auth.refresh_token },
    );

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Dashboard should show plan info (not an empty state)
    await expect(
      page.locator("text=/PLAN DE HOY|plan|despertar|dormir/i").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  /**
   * Regenerating plan deactivates the old one.
   * Regression: previously two plans could be active simultaneously; GET /current
   * would return the stale one non-deterministically.
   */
  test("Regenerating plan replaces previous plan — GET /current always returns latest", async ({ request }) => {
    const user = makeTestUser();
    const auth = await apiRegister(request, user);
    await apiSubmitMEQ(request, auth.access_token);

    const today = new Date().toISOString().slice(0, 10);
    const headers = { Authorization: `Bearer ${auth.access_token}` };

    // Generate first plan
    const plan1Res = await request.post(`${API_URL}/api/v1/plans/generate`, {
      data: { start_date: today },
      headers,
    });
    expect(plan1Res.status()).toBe(201);
    const plan1 = await plan1Res.json() as { plan: { id: string } };

    // Generate second plan (regenerate)
    const plan2Res = await request.post(`${API_URL}/api/v1/plans/generate`, {
      data: { start_date: today },
      headers,
    });
    expect(plan2Res.status()).toBe(201);
    const plan2 = await plan2Res.json() as { plan: { id: string } };

    expect(plan2.plan.id).not.toBe(plan1.plan.id);

    // GET /current must return the second plan, not the first
    const currentRes = await request.get(`${API_URL}/api/v1/plans/current`, { headers });
    expect(currentRes.status()).toBe(200);
    const current = await currentRes.json() as { plan: { id: string } };
    expect(current.plan.id).toBe(plan2.plan.id);
  });
});
