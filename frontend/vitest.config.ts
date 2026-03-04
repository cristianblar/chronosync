import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    // Exclude Playwright E2E tests — those are run via `npm run test:e2e`
    exclude: ["tests/e2e/**", "node_modules/**", "playwright-report/**"],
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "lib/**/*.ts",
        "components/ui/**/*.tsx",
        "components/legal/**/*.tsx",
        "store/onboardingStore.ts",
        "store/uiStore.ts",
        "hooks/useOffline.ts",
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
