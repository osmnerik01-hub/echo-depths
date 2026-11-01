import { createAssets, makeScene } from "./scene.js";
import { CanvasBatch, WebGLBatch } from "./renderers.js";
import { probeWebGL2 } from "../src/gpu-diagnostics.js";
const params = new URLSearchParams(location.search),
  requested = params.get("renderer") || "canvas",
  scene = makeScene(params.get("scene") || "normal"),
  assets = createAssets();
let canvas = document.querySelector("canvas"),
  renderer,
  fallback = null;
const status = document.querySelector("#status");
const resize = () => {
  canvas.width = Math.round(innerWidth * Math.min(devicePixelRatio || 1, 2));
  canvas.height = Math.round(innerHeight * Math.min(devicePixelRatio || 1, 2));
};
resize();
try {
  renderer =
    requested === "webgl"
      ? new WebGLBatch(canvas, assets)
      : new CanvasBatch(canvas, assets);
} catch (e) {
  fallback = String(e);
  const fresh = document.createElement("canvas");
  canvas.replaceWith(fresh);
  canvas = fresh;
  resize();
  renderer = new CanvasBatch(canvas, assets);
}
window.addEventListener("resize", resize);
const info = probeWebGL2(),
  frames = [],
  cpu = [],
  updateCpu = [];
let last = null,
  start = null,
  measuring = false,
  frozen = false;
const percentile = (a, q) => {
  const s = [...a].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * q))] || 0;
};
const avg = (a) => a.reduce((s, n) => s + n, 0) / (a.length || 1);
window.ignition = {
  ready: true,
  requested,
  active: renderer.name,
  info,
  fallback,
  renderer,
  scene,
  assets,
  CanvasBatch,
  WebGLBatch,
  start() {
    frames.length = cpu.length = updateCpu.length = 0;
    last = null;
    start = null;
    measuring = true;
    frozen = false;
  },
  stop() {
    measuring = false;
    return {
      requested,
      active: renderer.name,
      info,
      fallback,
      counts: scene.counts,
      quads: scene.items.length,
      pixels: [canvas.width, canvas.height],
      samples: frames.length,
      meanFps: avg(frames) ? 1000 / avg(frames) : 0,
      medianFps: percentile(frames, 0.5) ? 1000 / percentile(frames, 0.5) : 0,
      p95Ms: percentile(frames, 0.95),
      meanFrameMs: avg(frames),
      renderCpuMeanMs: avg(cpu),
      sceneCpuMeanMs: avg(updateCpu),
      frames: [...frames],
      cpu: [...cpu],
      drawCalls: renderer.drawCalls ?? scene.items.length,
    };
  },
  freeze(t = 2) {
    frozen = true;
    scene.update(t);
    renderer.draw(scene.items, scene.camera);
  },
  dispose() {
    renderer.dispose();
  },
};
let statusAt = 0;
function frame(now) {
  if (start === null) start = now;
  if (!document.hidden && !frozen) {
    const u = performance.now();
    scene.update((now - start) / 1000);
    const r = performance.now();
    const drawn = renderer.draw(scene.items, scene.camera),
      end = performance.now();
    if (measuring && drawn && last !== null) {
      frames.push(now - last);
      cpu.push(end - r);
      updateCpu.push(r - u);
    }
    last = now;
  }
  if (now - statusAt > 500) {
    statusAt = now;
    status.textContent = `${renderer.name} · ${canvas.width}×${canvas.height} · HIGH
${info.adapter}
Donanım doğrulaması: ${info.acceleration}
${frames.length ? (1000 / avg(frames)).toFixed(1) : "—"} FPS · ${scene.items.length} quad
${renderer.lost ? "Bağlam kayıp; geri yüklenmesi bekleniyor." : fallback || "İzole prototip; oyun renderer geçişi değildir."}`;
  }
  requestAnimationFrame(frame);
}
document.addEventListener("visibilitychange", () => {
  last = null;
});
requestAnimationFrame(frame);

for (const a of document.querySelectorAll("a")) {
  const u = new URL(a.href);
  if (!u.searchParams.has("renderer"))
    u.searchParams.set("renderer", requested);
  else u.searchParams.set("scene", params.get("scene") || "normal");
  a.href = u.href;
}
const button = document.querySelector("#measure");
button.addEventListener("click", async () => {
  button.disabled = true;
  window.ignition.start();
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const result = {
    ...window.ignition.stop(),
    userAgent: navigator.userAgent,
    scope: "Local browser; no CDP hardware verification; GPU memory unknown",
  };
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = `ignition-${requested}-${params.get("scene") || "normal"}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  button.disabled = false;
});
