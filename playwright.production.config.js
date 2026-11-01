import { safeLaunch } from "./scripts/browser-policy.mjs";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e-release",
  workers: 1,
  timeout: 30000,
  use: {
    launchOptions: {
      ...safeLaunch,
      ...(process.env.ECHO_GPU_CHANNEL
        ? { channel: process.env.ECHO_GPU_CHANNEL }
        : {}),
    },
    baseURL: "http://127.0.0.1:5180",
    browserName: "chromium",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "npm run preview -- --port 5180 --strictPort",
    url: "http://127.0.0.1:5180",
    reuseExistingServer: false,
  },
  reporter: "list",
});
