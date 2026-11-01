import { test, expect } from "@playwright/test";


const scene = { seed: 7301, player: { x: 640, y: 400 }, angle: 0, time: 0, quality: "HIGH", viewport: { width: 1280, height: 800 }, dpr: 1, camera: { x: 0, y: 0, zoom: 1 } };
const ids = ["pulse", "scatter", "rail", "arc", "nova"];

test.use({ viewport: scene.viewport, deviceScaleFactor: 1 });

test("Chromium records all five player weapons in a fixed scene", async ({ page, browserName }, info) => {
  expect(browserName).toBe("chromium");
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Use a separate document: no game loop, input, enemies or HUD can alter captures.
  await page.goto("/src/renderer.js");
  await page.evaluate(async (scene) => {
    const { Renderer } = await import("/src/renderer.js");
    const { weapons } = await import("/src/weapons.js");
    document.body.replaceChildren();
    document.body.style.cssText = "margin:0;background:#101923";
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const renderer = new Renderer(canvas);
    renderer.setQuality(scene.quality);
    window.playerVisualTransform = {
      x: renderer.ox, y: renderer.oy, zoom: renderer.scale,
      dpr: renderer.dpr, quality: renderer.quality.id,
    };
    // Seed only floor generation; restore Math.random even if drawing fails.
    const originalRandom = Math.random;
    let seed = scene.seed;
    try {
      Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
      renderer.makeFloor(0);
    } finally {
      Math.random = originalRandom;
    }
    window.drawPlayerVisual = (weapon) => {
      const c = renderer.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = "#040911";
      c.fillRect(0, 0, renderer.width, renderer.height);
      c.save();
      c.translate(renderer.ox, renderer.oy);
      c.scale(renderer.scale, renderer.scale);
      c.drawImage(renderer.floor, 0, 0);
      renderer.robot({ x: scene.player.x, y: scene.player.y, r: 18, angle: scene.angle, inv: 0, flash: 0, weapon }, true, scene.time);
      c.restore();
      // Compare the rendered scene before labels, so names cannot mask identical weapons.
      const pixels = canvas.toDataURL();
      c.fillStyle = "#bdfff0";
      c.font = "20px monospace";
      c.fillText(weapons[weapon].name, 40, 48);
      return { weapon, width: canvas.width, height: canvas.height, pixels };
    };
    window.playerVisualWeaponIds = Object.keys(weapons);
  }, scene);
  expect(await page.evaluate(() => window.playerVisualTransform)).toEqual({
    ...scene.camera, dpr: scene.dpr, quality: scene.quality,
  });
  expect(await page.evaluate(() => window.playerVisualWeaponIds)).toEqual(ids);
  const log = [JSON.stringify(scene)];
  const captures = new Set();
  for (const weapon of ids) {
    await test.step(weapon, async () => {
      const first = await page.evaluate((id) => window.drawPlayerVisual(id), weapon);
      const repeat = await page.evaluate((id) => window.drawPlayerVisual(id), weapon);
      expect(repeat).toEqual(first);
      expect([first.width, first.height]).toEqual([1280, 800]);
      captures.add(first.pixels);
      const path = info.outputPath(`${weapon}.png`);
      await page.locator("canvas").screenshot({ path });
      await info.attach(weapon, { path, contentType: "image/png" });
      const message = `player-visual: ${weapon} (1280x800, scale=1, angle=0, t=0; repeat identical)`;
      log.push(message);
      console.log(message);
      console.log(`player-visual output: ${path}`);
    });
  }
  await info.attach("scene-and-captures", { body: log.join("\n"), contentType: "text/plain" });
  expect(captures.size).toBe(5);
  expect(errors).toEqual([]);
});



