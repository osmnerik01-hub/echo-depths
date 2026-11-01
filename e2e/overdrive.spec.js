const evidence = process.env.ECHO_EVIDENCE_DIR || "docs/overdrive";
import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
test("graphics profiles persist, resize rendering, F3 toggles, HUD nodes are reused", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "AYARLAR", exact: true }).click();
  await expect(page.locator('[data-quality="MEDIUM"]')).toHaveClass(/selected/);
  for (const [id, width] of [
    ["LOW", 1280],
    ["HIGH", 2560],
    ["MEDIUM", 1920],
  ]) {
    await page.locator(`[data-quality="${id}"]`).click();
    await expect
      .poll(() => page.locator("canvas").evaluate((c) => c.width))
      .toBe(width);
    expect(
      await page.evaluate(() => localStorage.getItem("echo-depths.quality")),
    ).toBe(id);
  }
  await page.reload();
  await page.getByRole("button", { name: "AYARLAR", exact: true }).click();
  await expect(page.locator('[data-quality="MEDIUM"]')).toHaveClass(/selected/);
  await mkdir(`${evidence}/screenshots`, { recursive: true });
  await page.screenshot({ path: `${evidence}/screenshots/settings.png` });
  await page.getByRole("button", { name: "GERİ DÖN", exact: true }).click();
  await page.getByRole("button", { name: /SİSTEMİ BAŞLAT/ }).click();
  await page.keyboard.press("F3");
  await expect(page.locator("#performance")).toBeVisible();
  await expect(page.locator("#performance")).toContainText("FPS");
  await expect(page.locator("#performance")).toContainText("PARÇACIK");
  const hp = await page.locator('[data-live="hp"]').elementHandle();
  await expect
    .poll(() =>
      page.evaluate(() => window.__echoSnapshot().performance.samples),
    )
    .toBeGreaterThan(25);
  expect(await hp.evaluate((el) => el.isConnected)).toBe(true);
  await page.screenshot({
    path: `${evidence}/screenshots/performance-hud.png`,
  });
  await page.keyboard.press("F3");
  await expect(page.locator("#performance")).toBeHidden();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "AYARLAR", exact: true }).click();
  await page.locator('[data-quality="LOW"]').click();
  await page.getByRole("button", { name: "GERİ DÖN", exact: true }).click();
  await expect(page.getByRole("button", { name: /DEVAM ET/ })).toBeVisible();
  expect(errors).toEqual([]);
});
