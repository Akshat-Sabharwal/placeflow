import { defineConfig, devices } from "@playwright/test";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch {}

const productionServer = process.env.PLAYWRIGHT_PRODUCTION === "true";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "html" : "line",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: productionServer ? "npm run build && npm start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_test",
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? "sb_secret_test",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY:
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "test-public-key",
    },
  },
  projects: [
    { name: "desktop", testMatch: "public-flow.spec.ts", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", testMatch: "public-flow.spec.ts", use: { ...devices["Pixel 7"] } },
    { name: "authenticated", testMatch: "authenticated-flow.spec.ts", use: { ...devices["Desktop Chrome"] } },
  ],
});
