import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration.
 *
 * When running via `make test-e2e` the full stack is already up via Docker.
 * BASE_URL defaults to the E2E stack web port (3001).
 * API_URL defaults to the E2E stack API port (8001).
 * MAILHOG_URL is the Mailhog HTTP API for reading test emails.
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";
const API_URL = process.env.API_URL ?? "http://localhost:8001";
const MAILHOG_URL = process.env.MAILHOG_URL ?? "http://localhost:8026";

export { API_URL, MAILHOG_URL };

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // Sequential to avoid DB conflicts across tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["junit", { outputFile: "test-results/e2e-results.xml" }],
  ],
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // E2E tests expect the stack to already be running (started by make test-e2e)
  // webServer is not used here; the stack is managed externally via Docker.
  timeout: 60_000,
});
