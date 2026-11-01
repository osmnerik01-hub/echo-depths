import { safeLaunch } from "./browser-policy.mjs";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("docs/ignition", { recursive: true });
for (const variant of [
  { name: "headless", headless: true },
  { name: "headed", headless: false },
  { name: "chrome", headless: true, channel: "chrome" },
  { name: "edge", headless: true, channel: "msedge" },
]) {
  const { name, ...options } = variant;
  const headless = options.headless;
  let b;
  try {
    b = await chromium.launch({ ...safeLaunch, ...options });
  } catch (e) {
    await writeFile(
      `docs/ignition/environment-${name}-error.json`,
      JSON.stringify({ headless, error: String(e) }, null, 2),
    );
    console.log(`${name}: launch unavailable`);
    continue;
  }
  try {
    const c = await b.newBrowserCDPSession(),
      system = await c.send("SystemInfo.getInfo"),
      version = await c.send("Browser.getVersion"),
      commandLine = await c.send("Browser.getBrowserCommandLine");
    const p = await b.newPage();
    await p.goto(
      "http://127.0.0.1:5173/ignition/index.html?renderer=webgl&scene=boss",
    );
    await p.waitForFunction(() => window.ignition?.ready);
    const lab = await p.evaluate(() => ({
      active: ignition.active,
      fallback: ignition.fallback,
      info: ignition.info,
      error: ignition.renderer.gl?.getError(),
    }));
    console.log(
      JSON.stringify({
        headless,
        version: version.product,
        gpu: system.gpu.devices,
        features: system.gpu.featureStatus,
        lab,
      }),
    );
    await mkdir("docs/ignition", { recursive: true });
    await writeFile(
      `docs/ignition/environment-${name}.json`,
      JSON.stringify(
        { name, headless, version, system, commandLine, safeLaunch, lab },
        null,
        2,
      ),
    );
  } finally {
    await b.close();
  }
}
