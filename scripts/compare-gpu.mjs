import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { safeLaunch } from "./browser-policy.mjs";
const duration = 5000,
  warmup = 1000,
  repetitions = 3,
  out = process.env.ECHO_GPU_CHANNEL
    ? `docs/ignition/${process.env.ECHO_GPU_CHANNEL}`
    : "docs/ignition";
await mkdir(out + "/screenshots", { recursive: true });
const browser = await chromium.launch({
  ...safeLaunch,
  ...(process.env.ECHO_GPU_CHANNEL
    ? { channel: process.env.ECHO_GPU_CHANNEL }
    : {}),
});
try {
  const system = await browser.newBrowserCDPSession(),
    hardware = await system.send("SystemInfo.getInfo"),
    commandLine = await system.send("Browser.getBrowserCommandLine");
  if (
    commandLine.arguments.some((s) =>
      /^--(enable-unsafe|no-sandbox|disable-gpu-sandbox|ignore-gpu-blocklist|disable-web-security)/.test(
        s,
      ),
    )
  )
    throw Error("Unsafe browser flag");
  const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
    }),
    results = [];
  for (let run = 1; run <= repetitions; run++)
    for (const scene of ["empty", "normal", "crowd", "boss"])
      for (const backend of run % 2
        ? ["canvas", "webgl"]
        : ["webgl", "canvas"]) {
        const page = await context.newPage(),
          cdp = await context.newCDPSession(page),
          errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(
          `http://127.0.0.1:5173/ignition/index.html?renderer=${backend}&scene=${scene}`,
        );
        await page.waitForFunction(() => window.ignition?.ready);
        await page.waitForTimeout(warmup);
        await cdp.send("Performance.enable");
        await cdp.send("HeapProfiler.collectGarbage");
        const before = Object.fromEntries(
          (await cdp.send("Performance.getMetrics")).metrics.map((m) => [
            m.name,
            m.value,
          ]),
        );
        await page.evaluate(() => ignition.start());
        await page.waitForTimeout(duration);
        const data = await page.evaluate(() => ignition.stop());
        if (
          data.samples < 3 ||
          data.fallback ||
          (backend === "webgl" && !data.active.startsWith("WebGL2"))
        )
          throw Error(
            `Ölçüm geçersiz veya WebGL2 kullanılamıyor: ${data.fallback || data.active}`,
          );
        if (
          data.pixels[0] !== 2560 ||
          data.pixels[1] !== 1600 ||
          data.frames.reduce((s, n) => s + n, 0) < duration * 0.8
        )
          throw Error(
            "Çözünürlük veya ölçüm süresi eşleşmedi; kaynak/sekme değişikliğini kontrol edin",
          );
        const after = Object.fromEntries(
          (await cdp.send("Performance.getMetrics")).metrics.map((m) => [
            m.name,
            m.value,
          ]),
        );
        const elapsed = after.Timestamp - before.Timestamp;
        Object.assign(data, {
          run,
          scene,
          backend,
          requestedDurationMs: duration,
          measuredFrameDurationMs: data.frames.reduce((s, n) => s + n, 0),
          heapBefore: before.JSHeapUsedSize,
          heapUsed: after.JSHeapUsedSize,
          taskCpuMsPerSecond:
            (1000 * (after.TaskDuration - before.TaskDuration)) / elapsed,
          scriptMsPerSecond:
            (1000 * (after.ScriptDuration - before.ScriptDuration)) / elapsed,
          errors,
        });
        results.push(data);
        await writeFile(
          out + "/raw.json",
          JSON.stringify(
            {
              browser: browser.version(),
              hardware,
              commandLine,
              safeLaunch,
              viewport: [1280, 800],
              dpr: 2,
              warmup,
              duration,
              repetitions,
              results,
            },
            null,
            2,
          ),
        );
        console.log(
          JSON.stringify({
            run,
            scene,
            backend,
            active: data.active,
            fps: data.meanFps,
            p95: data.p95Ms,
            errors,
          }),
        );
        if (run === 1) {
          await page.evaluate(() => ignition.freeze());
          await page
            .locator("canvas")
            .screenshot({ path: `${out}/screenshots/${scene}-${backend}.png` });
        }
        await page.close();
      }
  const median = (a) => [...a].sort((a, b) => a - b)[Math.floor(a.length / 2)],
    rows = [];
  for (const scene of ["empty", "normal", "crowd", "boss"]) {
    const row = { scene };
    for (const backend of ["canvas", "webgl"]) {
      const runs = results.filter(
        (r) => r.scene === scene && r.backend === backend,
      );
      row[backend] = {};
      for (const key of [
        "meanFps",
        "medianFps",
        "p95Ms",
        "renderCpuMeanMs",
        "sceneCpuMeanMs",
        "taskCpuMsPerSecond",
        "scriptMsPerSecond",
        "heapBefore",
        "heapUsed",
      ])
        row[backend][key] = median(runs.map((r) => r[key]));
      row[backend].runs = runs.map((r) => r.meanFps);
      row[backend].active = runs[0].active;
      row[backend].counts = runs[0].counts;
      row[backend].quads = runs[0].quads;
    }
    row.changePercent = (row.webgl.meanFps / row.canvas.meanFps - 1) * 100;
    rows.push(row);
  }
  await writeFile(
    out + "/comparison.json",
    JSON.stringify(
      {
        method:
          "Median across three matched 5s captures, after 1s warmup; renderer order alternates. meanFps=1000/mean(frame); medianFps=1000/median(frame). Synthetic shared-atlas render-only scenes; NOT full game renderer comparison.",
        browser: browser.version(),
        gpu: hardware.gpu.devices,
        features: hardware.gpu.featureStatus,
        viewport: [1280, 800],
        dpr: 2,
        rows,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
