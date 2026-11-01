const params = new URLSearchParams(location.search),
  phase = params.get("phase") || "after",
  scene = params.get("scene") || "empty";
const root = phase === "before" ? "/bench/baseline/src" : "/src";
const [
  { Game },
  { Renderer },
  { makeEnemy },
  { makeBoss },
  { seeded },
  { Navigation },
] = await Promise.all([
  import(`${root}/game.js`),
  import(`${root}/renderer.js`),
  import(`${root}/enemies.js`),
  import(`${root}/bosses.js`),
  import(`${root}/dungeon.js`),
  import(`${root}/navigation.js`),
]);
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = root + "/style.css";
document.head.append(link);
// CPU submission timings are inclusive; nested categories must not be added together.
const sums = {},
  counts = {},
  calls = {};
let measuring = false;
function wrap(object, key, label) {
  const original = object[key];
  object[key] = function (...args) {
    if (!measuring) return original.apply(this, args);
    const t = performance.now();
    try {
      return original.apply(this, args);
    } finally {
      sums[label] = (sums[label] || 0) + performance.now() - t;
      counts[label] = (counts[label] || 0) + 1;
    }
  };
}
wrap(Game.prototype, "update", "update");
wrap(Game.prototype, "updateEffects", "particlesEffects");
wrap(Game.prototype, "updateHUD", "hud");
wrap(Renderer.prototype, "draw", "render");
wrap(Renderer.prototype, "glow", "lights");
const random = seeded("OVERDRIVE-V1:" + scene);
Math.random = random;
const contextMode = params.get("context");
if (contextMode) {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, options) {
    if (this.id === "game" && type === "2d")
      options = {
        ...options,
        alpha: false,
        desynchronized: true,
        willReadFrequently: contextMode === "cpu",
      };
    return original.call(this, type, options);
  };
}
const canvas = document.querySelector("canvas"),
  r = new Renderer(canvas);
if (r.setQuality) r.setQuality("HIGH");
const g = new Game(canvas, r);
g.start("OVERDRIVE-V1");
if (g.setQuality) g.setQuality("HIGH");
g.audio.muted = true;
g.remaining = 1;
g.spawnTimer = 1e9;
g.transition = 0;
g.player.inv = 1e6;
g.player.critChance = 0;
g.player.hp = g.player.maxHp;
wrap(r.ctx, "ellipse", "shadowGeometry");
let particleEmitted = 0;
const originalBurst = g.burst.bind(g);
g.burst = (...args) => {
  const count = g.particles.length;
  originalBurst(...args);
  if (measuring) particleEmitted += g.particles.length - count;
};
const combat = g.combat;
wrap(combat, "update", "bulletPhysicsCollision");
const enemyCount = scene === "crowd" ? 12 : scene === "normal" ? 6 : 0;
for (let i = 0; i < enemyCount; i++) {
  const type = i % 6,
    pos = g.findSpawn(type);
  if (pos) {
    const e = makeEnemy(type, pos, 1, i + 1);
    e.hp = e.maxHp = 1e6;
    e.wind = 0;
    g.enemies.push(e);
  }
}
if (scene === "boss") {
  g.room.walls = g.room.walls.slice(0, 4);
  g.navigation = new Navigation(g.room.walls);
  g.biomeIndex = 2;
  g.boss = makeBoss(2);
  g.boss.hp = g.boss.maxHp * 0.2;
  g.boss.phase = 3;
  g.boss.cool = 0;
  g.enemies = [g.boss];
  g.player.y = 610;
}
wrap(g.navigation, "find", "astar");
wrap(g.navigation, "clear", "lineOfSight");
let emitted = 0;
const originalUpdate = g.update.bind(g);
g.update = (dt) => {
  if (scene !== "empty") {
    g.pointer = {
      x: g.enemies[0]?.x || 640,
      y: g.enemies[0]?.y || 280,
      down: true,
    };
    emitted += dt;
    while (emitted > 0.1) {
      emitted -= 0.1;
      g.burst(
        640,
        400,
        "#80ffe0",
        scene === "normal" ? 3 : scene === "crowd" ? 8 : 12,
      );
    }
  }
  originalUpdate(dt);
};
// Fine spans are generated into the frozen baseline and current update call sites.
g.profile = {
  start: () => (measuring ? performance.now() : null),
  end(label, t) {
    if (t === null || t === undefined) return;
    sums[label] = (sums[label] || 0) + performance.now() - t;
    counts[label] = (counts[label] || 0) + 1;
  },
};
const frames = [];
let last = performance.now(),
  acc = 0,
  hud = 0,
  peak = { enemies: 0, bullets: 0, particles: 0 };
function frame(now) {
  const raw = now - last;
  last = now;
  acc += Math.min(raw / 1000, 0.05);
  while (acc >= 1 / 120) {
    g.update(1 / 120);
    acc -= 1 / 120;
  }
  r.draw(g);
  hud += raw;
  if (hud >= 80) {
    g.updateHUD();
    hud = 0;
  }
  if (measuring) {
    frames.push(raw);
    peak.enemies = Math.max(peak.enemies, g.enemies.length);
    peak.bullets = Math.max(peak.bullets, g.bullets.length);
    peak.particles = Math.max(peak.particles, g.particles.length);
  }
  requestAnimationFrame(frame);
}
window.lab = {
  ready: true,
  start() {
    frames.length = 0;
    for (const k of Object.keys(sums)) delete sums[k];
    for (const k of Object.keys(counts)) delete counts[k];
    particleEmitted = 0;
    measuring = true;
    last = performance.now();
    acc = 0;
  },
  stop() {
    measuring = false;
    const sorted = [...frames].sort((a, b) => a - b),
      mean = frames.reduce((a, b) => a + b, 0) / frames.length,
      q = (p) =>
        sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
    return {
      phase,
      scene,
      navigationSameClass: g.navigation instanceof Navigation,
      context: r.ctx.getContextAttributes?.(),
      seed: "OVERDRIVE-V1",
      profile: "HIGH",
      viewport: [innerWidth, innerHeight],
      dpr: r.dpr,
      pixels: [canvas.width, canvas.height],
      samples: frames.length,
      fps: 1000 / mean,
      meanMs: mean,
      p50Ms: q(0.5),
      p95Ms: q(0.95),
      p99Ms: q(0.99),
      longFrames50: frames.filter((t) => t > 50).length,
      overBudget167: frames.filter((t) => t > 16.7).length,
      particleEmitted,
      cpuTotalsMs: sums,
      cpuCalls: counts,
      peak,
      heap: performance.memory
        ? {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
          }
        : null,
      particlesPool: g.particlePool?.stats?.() || null,
    };
  },
};
requestAnimationFrame(frame);
