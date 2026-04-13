# Nexus Testing Guide

This guide documents how the testing infrastructure was previously configured in this project. The testing libraries and configurations were removed to simplify the codebase for a solo developer environment, but can be easily restored using the instructions below.

## Quick Restore

To restore all testing capabilities (Unit & E2E), run the following command:

```bash
npm install --save-dev @playwright/test @testing-library/jest-dom @testing-library/react @vitejs/plugin-react jsdom vitest
```

Then, add these scripts to your `package.json` under `"scripts"`:

```json
"test": "vitest",
"test:ui": "vitest --ui",
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

## Unit Testing (Vitest + JSDOM)

We use Vitest as the fast, Vite-native test runner, and JSDOM to simulate a browser environment for testing React components.

**1. Create `vitest.config.ts` in the root directory:**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**2. Create the setup file `tests/setup.ts`:**

```typescript
import "@testing-library/jest-dom";
```

**3. Write Tests:**
Place your unit tests inside the `tests/unit/` folder with the suffix `.test.ts` or `.test.tsx`.

## End-to-End Testing (Playwright)

We use Playwright to simulate actual user journeys through a real Chromium browser.

**1. Create `playwright.config.ts` in the root directory:**

```typescript
import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

**2. Write Tests:**
Place your E2E tests inside the `tests/e2e/` folder. Ensure your Playwright tests focus on critical user flows to maximize ROI.
