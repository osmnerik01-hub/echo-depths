const output = process.env.ECHO_GPU_CHANNEL
  ? `docs/ignition/${process.env.ECHO_GPU_CHANNEL}`
  : "docs/ignition";
import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
test("F4 diagnostics are honest, toggle and survive unavailable WebGL2", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : get.call(this, type, ...args);
    };
  });
  await page.goto("/");
  await page.keyboard.press("F4");
  await expect(page.locator("#gpu-diagnostics")).toContainText(
    "WebGL2: Kullanılamıyor",
  );
  await expect(page.locator("#gpu-diagnostics")).toContainText(
    "Canvas 2D donanım doğrulaması: Bilinmiyor",
  );
  await page.keyboard.press("F4");
  await expect(page.locator("#gpu-diagnostics")).toBeHidden();
  await page.getByRole("button", { name: /SİSTEMİ BAŞLAT/ }).click();
  await expect(page.locator("#hud")).toContainText("GÖVDE BÜTÜNLÜĞÜ");
});
test("shared atlas Canvas and WebGL2 agree across four scenes", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await page.goto("/ignition/index.html?renderer=webgl");
  await page.waitForFunction(() => window.ignition?.ready);
  const results = await page.evaluate(async () => {
    const { createAssets, makeScene } = await import("/ignition/scene.js"),
      { CanvasBatch, WebGLBatch } = await import("/ignition/renderers.js"),
      assets = createAssets(),
      rows = [];
    for (const name of ["empty", "normal", "crowd", "boss"]) {
      const a = document.createElement("canvas"),
        b = document.createElement("canvas");
      a.width = b.width = 2560;
      a.height = b.height = 1600;
      const c = new CanvasBatch(a, assets);
      let g;
      try {
        g = new WebGLBatch(b, assets);
      } catch (e) {
        return { unsupported: String(e) };
      }
      const s = makeScene(name);
      s.update(2);
      c.draw(s.items, s.camera);
      g.draw(s.items, s.camera);
      const x = c.ctx.getImageData(0, 0, a.width, a.height).data,
        y = new Uint8Array(x.length);
      g.gl.readPixels(
        0,
        0,
        b.width,
        b.height,
        g.gl.RGBA,
        g.gl.UNSIGNED_BYTE,
        y,
      );
      let sum = 0,
        bad = 0,
        n = 0;
      for (let py = 0; py < a.height; py += 2)
        for (let px = 0; px < a.width; px += 2) {
          const j = (py * a.width + px) * 4,
            k = ((a.height - 1 - py) * a.width + px) * 4;
          let max = 0;
          for (let ch = 0; ch < 3; ch++) {
            const d = Math.abs(x[j + ch] - y[k + ch]);
            sum += d;
            max = Math.max(max, d);
          }
          if (max > 16) bad++;
          n++;
        }
      rows.push({
        scene: name,
        rgbMeanAbsoluteError: sum / (n * 3),
        pixelsOver16Percent: (bad / n) * 100,
        drawCalls: g.drawCalls,
        glError: g.gl.getError(),
        quads: s.items.length,
      });
      g.dispose();
      c.dispose();
    }
    return { rows };
  });
  await mkdir(output, { recursive: true });
  await writeFile(
    `${output}/visual-equivalence.json`,
    JSON.stringify(results, null, 2),
  );
  expect(results.unsupported).toBeUndefined();
  for (const r of results.rows) {
    expect(r.glError).toBe(0);
    expect(r.drawCalls).toBe(2);
    expect(r.rgbMeanAbsoluteError).toBeLessThan(3);
    expect(r.pixelsOver16Percent).toBeLessThan(3);
  }
  await info.attach("visual-equivalence", {
    body: JSON.stringify(results),
    contentType: "application/json",
  });
});
test("prototype restores WebGL resources after context loss", async ({
  page,
}) => {
  await page.goto("/ignition/index.html?renderer=webgl&scene=boss");
  await page.waitForFunction(() => window.ignition?.ready);
  expect(await page.evaluate(() => ignition.active)).toContain("WebGL2");
  await page.evaluate(() => {
    window.testLost = ignition.renderer.gl.getExtension("WEBGL_lose_context");
    testLost.loseContext();
  });
  await page.waitForFunction(() => ignition.renderer.lost);
  await page.evaluate(() => testLost.restoreContext());
  await page.waitForFunction(() => !ignition.renderer.lost);
  expect(
    await page.evaluate(() => {
      ignition.freeze();
      return {
        error: ignition.renderer.gl.getError(),
        calls: ignition.renderer.drawCalls,
      };
    }),
  ).toEqual({ error: 0, calls: 2 });
});
test("prototype falls back to Canvas when WebGL2 creation fails", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t, ...args) {
      return t === "webgl2" ? null : get.call(this, t, ...args);
    };
  });
  await page.goto("/ignition/index.html?renderer=webgl");
  await page.waitForFunction(() => window.ignition?.ready);
  expect(await page.evaluate(() => ignition.active)).toContain("Canvas");
});

test("Canvas loss notification pauses the game and restoration rebuilds caches", async ({
  page,
}) => {
  await page.goto("/?qa");
  await page.getByRole("button", { name: /SİSTEMİ BAŞLAT/ }).click();
  await page.evaluate(() =>
    document
      .querySelector("#game")
      .dispatchEvent(new Event("contextlost", { cancelable: true })),
  );
  await expect(page.getByRole("button", { name: /DEVAM ET/ })).toBeVisible();
  await page.evaluate(() =>
    document.querySelector("#game").dispatchEvent(new Event("contextrestored")),
  );
  await page.getByRole("button", { name: /DEVAM ET/ }).click();
  await page.keyboard.press("F4");
  await expect(page.locator("#gpu-diagnostics")).toContainText(
    "WebGL2: Kullanılabilir",
  );
  await expect(page.locator("#gpu-diagnostics")).toContainText(
    "Canvas 2D donanım doğrulaması: Bilinmiyor",
  );
  await mkdir(`${output}/screenshots`, { recursive: true });
  await page.screenshot({
    path: `${output}/screenshots/f4-diagnostics.png`,
  });
  expect(
    await page.evaluate(() => window.__echoSnapshot().render.cacheMatches),
  ).toBe(true);
});
