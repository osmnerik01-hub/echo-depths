import { test, expect } from "@playwright/test";
test("production build boots, plays and maps without QA APIs", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?qa");
  await expect(
    page.getByRole("button", { name: /SİSTEMİ BAŞLAT/ }),
  ).toBeVisible();
  expect(await page.evaluate(() => typeof window.__echoSnapshot)).toBe(
    "undefined",
  );
  expect(await page.evaluate(() => typeof window.__echoQA)).toBe("undefined");
  await page.getByRole("button", { name: "AYARLAR", exact: true }).click();
  await page.locator('[data-quality="LOW"]').click();
  expect(
    await page.evaluate(() => localStorage.getItem("echo-depths.quality")),
  ).toBe("LOW");
  await page.getByRole("button", { name: "GERİ DÖN", exact: true }).click();
  await page.locator("#seed-input").fill("RELEASE-04");
  await page.getByRole("button", { name: /SİSTEMİ BAŞLAT/ }).click();
  await expect(page.locator("#hud")).toContainText("Pulse Pistol");
  await page.keyboard.press("F3");
  await expect(page.locator("#performance")).toBeVisible();
  await page.keyboard.press("F3");
  await page.keyboard.press("F4");
  await expect(page.locator("#gpu-diagnostics")).toContainText(
    "Aktif renderer: Canvas 2D",
  );
  await expect(page.locator("#gpu-diagnostics")).toContainText(
    "Canvas 2D donanım doğrulaması: Bilinmiyor",
  );
  await page.keyboard.press("F4");
  await page.keyboard.press("Tab");
  await expect(page.locator(".map-panel")).toBeVisible();
  await expect(page.locator(".map-panel")).toContainText("RELEASE-04");
  await page.keyboard.press("Tab");
  await expect(page.locator(".map-panel")).toHaveCount(0);
  await page.mouse.move(1100, 400);
  await page.mouse.click(1100, 400);
  await page.keyboard.press("Space");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /DEVAM ET/ })).toBeVisible();
  expect(errors).toEqual([]);
});
