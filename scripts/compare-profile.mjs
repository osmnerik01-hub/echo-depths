import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
const group = process.env.ECHO_PROFILE_GROUP || "final",
  repetitions = 3,
  all = { before: [], after: [] };
for (let run = 1; run <= repetitions; run++)
  for (const phase of ["before", "after"]) {
    await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ["scripts/profile-browser.mjs", phase],
        {
          stdio: "inherit",
          env: {
            ...process.env,
            ECHO_RUN_ID: group + "-r" + run,
            ECHO_SAMPLE_MS: "5000",
          },
        },
      );
      child.on("exit", (code) =>
        code === 0 ? resolve() : reject(Error(phase + " exit " + code)),
      );
      child.on("error", reject);
    });
    all[phase].push(
      JSON.parse(
        await readFile(`docs/overdrive/${phase}-${group}-r${run}.json`, "utf8"),
      ),
    );
  }
const median = (a) => [...a].sort((a, b) => a - b)[Math.floor(a.length / 2)];
const rows = ["empty", "normal", "crowd", "boss"].map((scene) => {
  const summarise = (phase) => {
    const runs = all[phase].map((x) =>
      x.results.find((s) => s.scene === scene),
    );
    const data = {
      runs: runs.map((r) => ({
        fps: r.fps,
        meanMs: r.meanMs,
        samples: r.samples,
      })),
    };
    for (const key of [
      "fps",
      "meanMs",
      "p50Ms",
      "p95Ms",
      "p99Ms",
      "longFrames50",
      "longTasks50",
    ])
      data[key] = median(runs.map((s) => s[key]));
    data.heapUsed = median(
      runs.map(
        (s) => s.cdpMetrics.find((m) => m.name === "JSHeapUsedSize").value,
      ),
    );
    data.cpuPerFrame = {};
    for (const key of new Set(runs.flatMap((r) => Object.keys(r.cpuTotalsMs))))
      data.cpuPerFrame[key] = median(
        runs.map((r) => (r.cpuTotalsMs[key] || 0) / r.samples),
      );
    data.particleEmitted = median(runs.map((r) => r.particleEmitted));
    data.pool = runs[0].particlesPool;
    return data;
  };
  const before = summarise("before"),
    after = summarise("after");
  return {
    scene,
    before,
    after,
    changePercent: (after.fps / before.fps - 1) * 100,
  };
});
const comparison = {
  method:
    "Median of 3 runs × 5 seconds after 1 second warmup; alternating before/after; same Chromium, 1280×800 CSS, DPR2 HIGH, fixed seed/fixture parameters; traces include overhead; CPU spans inclusive",
  chromium: all.before[0].chromium,
  gpu: all.before[0].hardware.gpu.devices,
  rows,
};
await writeFile(
  "docs/overdrive/comparison.json",
  JSON.stringify(comparison, null, 2),
);
for (const row of rows)
  console.log(
    JSON.stringify({
      scene: row.scene,
      before: row.before.fps,
      after: row.after.fps,
      change: row.changePercent,
    }),
  );
