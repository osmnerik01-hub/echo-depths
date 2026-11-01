// Real browser regression tests for the original vertical slice.
import { test, expect } from "@playwright/test";
const snapshot = (page) => page.evaluate(() => window.__echoSnapshot());
test("menu, movement, shooting, dash, pause, resize and runtime errors", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /ECHO/ })).toBeVisible();
  await page.screenshot({ path: info.outputPath("menu.png") });
  await page.getByRole("button", { name: /SİSTEMİ BAŞLAT/ }).click();
  await expect.poll(async () => (await snapshot(page)).state).toBe("playing");
  await expect(page.locator("#hud")).toContainText("Pulse Pistol");
  expect((await snapshot(page)).player.inventory).toEqual(["pulse"]);
  const before = (await snapshot(page)).player.x;
  await page.keyboard.down("d");
  await expect
    .poll(async () => (await snapshot(page)).player.x)
    .toBeGreaterThan(before + 25);
  await page.keyboard.up("d");
  await page.mouse.move(1100, 400);
  await page.mouse.down();
  await expect
    .poll(async () => (await snapshot(page)).bullets)
    .toBeGreaterThan(0);
  await page.mouse.up();
  await page.keyboard.press("Space");
  await expect
    .poll(async () => (await snapshot(page)).player.dashCd)
    .toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /DEVAM ET/ })).toBeVisible();
  expect((await snapshot(page)).state).toBe("paused");
  await page.getByRole("button", { name: /DEVAM ET/ }).click();
  await expect.poll(async () => (await snapshot(page)).state).toBe("playing");
  await page.setViewportSize({ width: 960, height: 600 });
  await expect
    .poll(() => page.locator("canvas").evaluate((c) => c.width))
    .toBe(1440);
  await page.screenshot({ path: info.outputPath("combat.png") });
  await info.attach("runtime-metrics", {
    body: JSON.stringify((await snapshot(page)).performance, null, 2),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
});
test("death and restart through real UI", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /SİSTEMİ BAŞLAT/ }).click();
  await expect(
    page.getByRole("button", { name: /YENİDEN BAĞLAN/ }),
  ).toBeVisible({ timeout: 55000 });
  expect((await snapshot(page)).state).toBe("dead");
  await page.getByRole("button", { name: /YENİDEN BAĞLAN/ }).click();
  const fresh = await snapshot(page);
  expect(fresh.state).toBe("playing");
  expect(fresh.room).toBe(1);
  expect(fresh.score).toBe(0);
  expect(fresh.player.hp).toBe(100);
  expect(fresh.player.inventory).toEqual(["pulse"]);
});
