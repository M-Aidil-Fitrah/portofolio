import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3102",
    channel: process.env.CI ? undefined : "chrome",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command: "pnpm exec next start -p 3102",
    url: "http://127.0.0.1:3102/admin/login",
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ADMIN_EMAIL: "admin@test.local",
      ADMIN_PASSWORD: "test-password-123",
      ADMIN_SESSION_SECRET: "playwright-only-session-secret-that-is-long",
    },
  },
});
