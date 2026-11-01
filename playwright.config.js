import { safeLaunch } from "./scripts/browser-policy.mjs";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  use: {
    launchOptions: {
      ...safeLaunch,
      ...(process.env.ECHO_GPU_CHANNEL
        ? { channel: process.env.ECHO_GPU_CHANNEL }
        : {}),
    },
    baseURL: "http://127.0.0.1:5173",
    browserName: "chromium",
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
