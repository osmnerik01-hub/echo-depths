const evidence = process.env.ECHO_EVIDENCE_DIR || "docs/overdrive";
import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const dir = path.resolve(`${evidence}/screenshots`);
const snap = (page) => page.evaluate(() => window.__echoSnapshot());
const advance = (page, until) =>
  page.evaluate((until) => window.__echoQA.advance(120, until), until);
test("TAB map preserves combat, fog and weapon selection", async ({ page }) => {
  await page.goto("/");
  await page.locator("#seed-input").fill("MAP-TEST");
  await page.getByRole("button", { name: /SİSTEMİ BAŞLAT/ }).click();
  const before = await snap(page);
  await page.keyboard.press("Tab");
  await expect(page.locator(".map-panel")).toBeVisible();
  expect((await snap(page)).state).toBe("map");
  expect((await snap(page)).player.weapon).toBe(before.player.weapon);
  await expect(page.locator(".map-node.unknown")).not.toHaveCount(0);
  await expect(page.locator(".map-node.boss")).toBeVisible();
  await expect(page.locator(".map-node.available")).toHaveCount(0);
  await page.keyboard.press("Tab");
  expect((await snap(page)).state).toBe("playing");
});
test("all biomes, shops, bosses and victory using normal combat input bot", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mkdir(dir, { recursive: true });
  await page.goto("/?qa");
  await page.waitForFunction(() => !!window.__echoQA);
  await page.screenshot({ path: path.join(dir, "menu.png") });
  await page.locator("#seed-input").fill("ABYSS-07");
  await page.getByRole("button", { name: /SİSTEMİ BAŞLAT/ }).click();
  await page.evaluate(() => window.__echoQA.idle(3.5));
  await page.screenshot({ path: path.join(dir, "combat.png") });
  let s = await advance(page, "upgrade");
  expect(s.state).toBe("upgrade");
  await page.screenshot({ path: path.join(dir, "upgrade.png") });
  // Select an earned module through the actual UI; route screen follows.
  await page.locator("[data-up]").first().click();
  await expect(page.locator(".map-panel")).toBeVisible();
  await page.screenshot({ path: path.join(dir, "map.png") });
  for (let biome = 0; biome < 3; biome++) {
    for (let n = 0; n < 8; n++) {
      s = await advance(page, `boss:${biome}`);
      if (s.biome === biome && s.node.type === "boss" && s.state === "playing")
        break;
      expect(s.state).not.toBe("dead");
    }
    expect(s.biome).toBe(biome);
    expect(s.node.type).toBe("boss");
    expect(s.boss.hp).toBeGreaterThan(0);
    await page.evaluate(() => window.__echoQA.advance(3));
    await page.screenshot({
      path: path.join(
        dir,
        ["boss-sentinel.png", "boss-tyrant.png", "boss-hollow.png"][biome],
      ),
    });
  }
  for (let n = 0; n < 5; n++) {
    s = await advance(page, "victory");
    if (s.state === "victory") break;
    expect(s.state).not.toBe("dead");
  }
  expect(s.state).toBe("victory");
  expect(s.stats.bosses).toBe(3);
  expect(s.stats.roomsCleared).toBe(18);
  expect(s.stats.damage).toBeGreaterThan(6000);
  expect(s.scrap).toBeGreaterThanOrEqual(0);
  expect(s.stats.scrapSpent).toBeGreaterThan(0);
  await expect(
    page.getByRole("heading", { name: "Derinlik artık seni duyuyor." }),
  ).toBeVisible();
  await page.screenshot({ path: path.join(dir, "victory.png") });
  await info.attach("complete-run", {
    body: JSON.stringify(s, null, 2),
    contentType: "application/json",
  });
  await mkdir("docs/validation", { recursive: true });
  await writeFile(`${evidence}/full-run.json`, JSON.stringify(s, null, 2));
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "AYNI SEED İLE YENİDEN" }).click();
  const fresh = await snap(page);
  expect(fresh.seed).toBe("ABYSS-07");
  expect(fresh.biome).toBe(0);
  expect(fresh.stats.bosses).toBe(0);
  expect(fresh.scrap).toBe(0);
  expect(fresh.player.inventory).toEqual(["pulse"]);
});

test("real-time Hollow Mind frame timing sample", async ({ page }, info) => {
  test.setTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?qa");
  await page.waitForFunction(() => !!window.__echoQA);
  await page.locator("#seed-input").fill("ABYSS-07");
  await page.getByRole("button", { name: /SİSTEMİ BAŞLAT/ }).click();
  let s;
  for (let n = 0; n < 8; n++) {
    s = await advance(page, "boss:2");
    if (s.biome === 2 && s.boss?.hp > 0) break;
    expect(s.state).not.toBe("dead");
  }
  expect(s.biome).toBe(2);
  await page.evaluate(() => window.__echoQA.autoplay(true));
  await page.waitForFunction(
    () => window.__echoSnapshot().performance.samples >= 180,
    null,
    { timeout: 25000 },
  );
  const metrics = await page.evaluate(() => {
    const m = window.__echoSnapshot().performance;
    window.__echoQA.autoplay(false);
    return m;
  });
  const result = {
    scope:
      "Headless Chromium, 1280x800 CSS pixels, MEDIUM / effective DPR 1.5, real-time Hollow Mind combat with QA input controller",
    ...metrics,
    approxFps: 1000 / metrics.frameMeanMs,
  };
  await mkdir("docs/validation", { recursive: true });
  await writeFile(
    `${evidence}/full-run-performance.json`,
    JSON.stringify(result, null, 2),
  );
  await info.attach("frame-timing", {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });
  expect(metrics.samples).toBeGreaterThanOrEqual(180);
  expect(errors).toEqual([]);
});
