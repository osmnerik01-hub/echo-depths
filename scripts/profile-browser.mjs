import { safeLaunch } from "./browser-policy.mjs";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const phase = process.argv[2] || "before",
  duration = Number(process.env.ECHO_SAMPLE_MS || 5000),
  out = process.env.ECHO_PROFILE_OUT || "docs/overdrive",
  variant = process.argv[3] || "",
  label =
    phase +
    (variant ? "-" + variant : "") +
    (process.env.ECHO_RUN_ID ? "-" + process.env.ECHO_RUN_ID : "");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
    ...safeLaunch,
    ...(process.env.ECHO_GPU_CHANNEL
      ? { channel: process.env.ECHO_GPU_CHANNEL }
      : {}),
  }),
  context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
const browserSession = await browser.newBrowserCDPSession();
let hardware;
try {
  hardware = await browserSession.send("SystemInfo.getInfo");
} catch (e) {
  hardware = { error: String(e) };
}
const results = [];
for (const scene of process.argv[4]
  ? [process.argv[4]]
  : ["empty", "normal", "crowd", "boss"]) {
  const page = await context.newPage(),
    cdp = await context.newCDPSession(page),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    `http://127.0.0.1:5173/bench/index.html?phase=${phase}&scene=${scene}&context=${variant}`,
  );
  await page.waitForFunction(() => window.lab?.ready);
  await page.waitForTimeout(1000);
  await cdp.send("Performance.enable");
  await cdp.send("HeapProfiler.collectGarbage");
  const metricsBefore = (await cdp.send("Performance.getMetrics")).metrics;
  await cdp.send("Tracing.start", {
    categories:
      "devtools.timeline,disabled-by-default-devtools.timeline,blink,cc,gpu",
    transferMode: "ReturnAsStream",
  });
  await page.evaluate(() => window.lab.start());
  await page.waitForTimeout(duration);
  const result = await page.evaluate(() => window.lab.stop());
  const ended = new Promise((resolve) =>
    cdp.once("Tracing.tracingComplete", resolve),
  );
  await cdp.send("Tracing.end");
  const { stream } = await ended;
  let trace = "";
  for (;;) {
    const chunk = await cdp.send("IO.read", { handle: stream });
    trace += chunk.data;
    if (chunk.eof) break;
  }
  await cdp.send("IO.close", { handle: stream });
  await writeFile(`${out}/${label}-${scene}.trace.json.gz`, gzipSync(trace));
  const events = JSON.parse(trace).traceEvents,
    totals = {};
  for (const e of events)
    if (e.ph === "X" && e.dur) {
      const v = (totals[e.name] ??= { ms: 0, count: 0 });
      v.ms += e.dur / 1000;
      v.count++;
    }
  result.cdpBefore = metricsBefore;
  result.longTasks50 = events.filter(
    (e) => e.name === "RunTask" && e.ph === "X" && e.dur > 50000,
  ).length;
  result.traceTop = Object.entries(totals)
    .sort((a, b) => b[1].ms - a[1].ms)
    .slice(0, 25);
  result.cdpMetrics = (await cdp.send("Performance.getMetrics")).metrics;
  result.errors = errors;
  result.durationMs = duration;
  results.push(result);
  console.log(
    JSON.stringify({
      phase,
      scene,
      fps: result.fps,
      mean: result.meanMs,
      p95: result.p95Ms,
      errors,
    }),
  );
  await page.close();
}
await writeFile(
  `${out}/${label}.json`,
  JSON.stringify(
    { phase, duration, chromium: browser.version(), hardware, results },
    null,
    2,
  ),
);
await browser.close();
if (results.some((r) => r.errors.length)) process.exitCode = 1;
