const evidence = process.env.ECHO_EVIDENCE_DIR || "docs/overdrive";
import { test, expect } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
test("ten full runs release room caches and keep post-GC heap bounded", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(180000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const system = await browser.newBrowserCDPSession(),
    hardware = await system.send("SystemInfo.getInfo"),
    reference = JSON.parse(
      await readFile("docs/overdrive/comparison.json", "utf8"),
    );
  expect(browser.version()).toBe(reference.chromium);
  expect(hardware.gpu.devices[0].deviceString).toBe(
    reference.gpu[0].deviceString,
  );
  await page.goto("/?qa");
  await page.waitForFunction(() => !!window.__echoQA);
  await page.getByRole("button", { name: "AYARLAR", exact: true }).click();
  await page.locator('[data-quality="HIGH"]').click();
  await page.getByRole("button", { name: "GERİ DÖN", exact: true }).click();
  await page.locator("#seed-input").fill("ABYSS-07");
  await page.getByRole("button", { name: /SİSTEMİ BAŞLAT/ }).click();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const samples = [];
  let roomDraws = 0,
    simulatedSeconds = 0;
  for (let run = 1; run <= 10; run++) {
    let s;
    for (let step = 0; step < 60; step++) {
      s = await page.evaluate(() =>
        window.__echoQA.advance(120, "room-change"),
      );
      expect(s.state).not.toBe("dead");
      expect(s.render.cacheMatches).toBe(true);
      expect(s.render.cachedRoom).toBe(s.room);
      roomDraws++;
      if (s.state === "victory") break;
    }
    expect(s.state).toBe("victory");
    expect(s.stats.roomsCleared).toBe(18);
    expect(s.stats.bosses).toBe(3);
    simulatedSeconds += s.elapsed;
    await page.getByRole("button", { name: "AYNI SEED İLE YENİDEN" }).click();
    const fresh = await page.evaluate(() => window.__echoQA.idle(0));
    expect(fresh.render.cacheMatches).toBe(true);
    expect(fresh.render.pixels).toEqual([2560, 1600]);
    expect(fresh.stats.bosses).toBe(0);
    expect(fresh.particles).toBe(0);
    expect(fresh.pool.created).toBeLessThanOrEqual(650);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: /DEVAM ET/ })).toBeVisible();
    await page.waitForTimeout(2000);
    await cdp.send("HeapProfiler.collectGarbage");
    const metrics = (await cdp.send("Performance.getMetrics")).metrics,
      dom = await cdp.send("Memory.getDOMCounters");
    samples.push({
      run,
      heapUsed: metrics.find((m) => m.name === "JSHeapUsedSize").value,
      dom,
      pool: fresh.pool,
    });
    await page.getByRole("button", { name: /DEVAM ET/ }).click();
  }
  const steady = samples.slice(2),
    heapRange =
      Math.max(...steady.map((s) => s.heapUsed)) -
      Math.min(...steady.map((s) => s.heapUsed)),
    growth = steady.at(-1).heapUsed - steady[0].heapUsed;
  const result = {
    scope:
      "10 accelerated complete runs, 180 rooms / 30 bosses, HIGH DPR2; every room rendered; paused for 2 real seconds after restart before forced GC; not a wall-clock endurance/GPU-memory proof",
    chromium: browser.version(),
    gpu: hardware.gpu.devices,
    viewport: [1280, 800],
    deviceScaleFactor: 2,
    roomDraws,
    simulatedSeconds,
    samples,
    quietPauseMs: 2000,
    steadyAfterWarmupRuns: 2,
    steadyHeapRangeBytes: heapRange,
    lastMinusFirstSteadyBytes: growth,
  };
  await mkdir(evidence, { recursive: true });
  await writeFile(
    `${evidence}/memory-soak.json`,
    JSON.stringify(result, null, 2),
  );
  await info.attach("memory-soak", {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });
  expect(heapRange).toBeLessThan(2 * 1024 * 1024);
  expect(growth).toBeLessThan(1024 * 1024);
  expect(
    Math.max(...steady.map((s) => s.dom.nodes)) -
      Math.min(...steady.map((s) => s.dom.nodes)),
  ).toBeLessThan(100);
  expect(errors).toEqual([]);
});
