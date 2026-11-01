// CPU simulation only. This does not measure Canvas, GPU, browser input or FPS.
import { performance } from "node:perf_hooks";
import { game, enemy, seeded } from "../tests/helpers.js";
import { difficulty } from "../src/enemies.js";
import { weapons } from "../src/weapons.js";
const previousRandom = Math.random;
Math.random = seeded(20261031);
const g = game();
g.roomIndex = 11;
g.nextRoom();
g.balance = difficulty(12, g.player);
g.remaining = 0;
g.player.inv = 1e9;
g.player.inventory = Object.keys(weapons);
g.player.chain = 2;
g.player.pierce = 2;
g.player.echoBlast = true;
function populate() {
  while (g.enemies.length < 12) {
    const type = g.enemies.length % 6,
      pos = g.findSpawn(type);
    if (!pos) break;
    enemy(g, pos.x, pos.y, type, 1000);
  }
}
populate();
const samples = [];
const startSearches = g.navigation.searches;
let peakBullets = 0,
  peakEnemies = 0;
for (let i = 0; i < 7200; i++) {
  if (g.state !== "playing")
    throw new Error("Benchmark unexpectedly left combat");
  const start = performance.now();
  if (i % 120 === 0) populate();
  if (i % 240 === 0) g.player.weapon = Object.keys(weapons)[(i / 240) % 5];
  const angle = i * 0.012;
  g.pointer.x = 640 + Math.cos(angle) * 400;
  g.pointer.y = 400 + Math.sin(angle) * 260;
  g.pointer.down = true;
  g.update(1 / 120);
  samples.push(performance.now() - start);
  peakBullets = Math.max(peakBullets, g.bullets.length);
  peakEnemies = Math.max(peakEnemies, g.enemies.length);
}
Math.random = previousRandom;
samples.sort((a, b) => a - b);
console.log(
  JSON.stringify(
    {
      scope: "Node CPU simulation, no rendering; not a browser FPS result",
      steps: samples.length,
      simulatedSeconds: 60,
      gameplaySeconds: g.elapsed,
      peakEnemies,
      meanMs: samples.reduce((a, b) => a + b, 0) / samples.length,
      p95Ms: samples[Math.floor(samples.length * 0.95)],
      p99Ms: samples[Math.floor(samples.length * 0.99)],
      maxMs: samples.at(-1),
      aStarSearches: g.navigation.searches - startSearches,
      peakBullets,
    },
    null,
    2,
  ),
);
