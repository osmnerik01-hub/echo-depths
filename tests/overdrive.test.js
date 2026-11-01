import test from "node:test";
import assert from "node:assert/strict";
import { ParticlePool } from "../src/particles.js";
import { FixedClock, FrameMeter } from "../src/timing.js";
import { profiles, readQuality, storeQuality } from "../src/quality.js";
import { rectHitTime, segmentRect } from "../src/math.js";
import { segmentRect as referenceRect } from "../bench/baseline/src/math.js";
import { Navigation } from "../src/navigation.js";
import { game, arena, seeded } from "./helpers.js";
test("oda geçişi çarpışma önbelleklerindeki önceki hedef referanslarını bırakır", () => {
  const g = game(),
    e = { x: 1, y: 1 };
  g.combat.boundsSource = g.room.walls;
  g.combat.boundsByRadius.set(4, [{}]);
  g.combat.hitRecords.push({ e, t: 0.2 });
  g.nextRoom();
  assert.equal(g.combat.boundsSource, null);
  assert.equal(g.combat.boundsByRadius.size, 0);
  assert.equal(g.combat.hitRecords[0].e, null);
});
test("parçacık havuzu sınırı, geri dönüşüm ve dizi kimliği korunur", () => {
  const pool = new ParticlePool(2),
    a = pool.acquire(),
    b = pool.acquire();
  assert.equal(pool.acquire(), null);
  a.life = 0.01;
  b.life = 1;
  const active = [a, b];
  pool.update(active, 0.02);
  assert.deepEqual(active, [b]);
  assert.equal(pool.acquire(), a);
  assert.equal(pool.created, 2);
  assert.equal(pool.reused, 1);
  pool.clear(active);
  assert.equal(active.length, 0);
});
test("LOW/MEDIUM/HIGH gerçek parçacık yoğunluğunu ve üst sınırı değiştirir", () => {
  const counts = [];
  for (const id of Object.keys(profiles)) {
    const g = game();
    g.setQuality(id);
    g.burst(640, 400, "#fff", 100);
    counts.push(g.particles.length);
    g.burst(640, 400, "#fff", 10000);
    assert.ok(g.particles.length <= profiles[id].maxParticles);
    assert.ok(g.particlePool.created <= 650);
  }
  assert.ok(counts[0] < counts[1] && counts[1] < counts[2]);
});
test("görsel kalite dövüş uyarılarını, hasarı ve cooldown durumunu değiştirmez", () => {
  const g = game();
  g.player.damage = 50;
  g.player.dashCd = 1;
  const fx = { kind: "phase", life: 1 };
  g.effects.push(fx);
  for (const id of Object.keys(profiles)) g.setQuality(id);
  assert.equal(g.player.damage, 50);
  assert.equal(g.player.dashCd, 1);
  assert.equal(g.effects[0], fx);
});
test("ayar varsayılanı MEDIUM; localStorage geçersiz/engelli olduğunda güvenli", () => {
  const previous = globalThis.localStorage;
  let saved = null;
  globalThis.localStorage = {
    getItem: () => saved,
    setItem: (k, v) => (saved = v),
  };
  assert.equal(readQuality(), "MEDIUM");
  assert.ok(storeQuality("LOW"));
  assert.equal(readQuality(), "LOW");
  saved = "broken";
  assert.equal(readQuality(), "MEDIUM");
  globalThis.localStorage = {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("blocked");
    },
  };
  assert.equal(readQuality(), "MEDIUM");
  assert.equal(storeQuality("HIGH"), false);
  assert.equal(storeQuality("invalid"), false);
  globalThis.localStorage = previous;
});
test("uzun kare en çok altı fizik adımı çalıştırır; reset zaman sıçramasını siler", () => {
  const c = new FixedClock();
  c.reset(0);
  let sum = 0;
  const frame = c.advance(10000, (dt) => (sum += dt));
  assert.equal(frame.steps, 6);
  assert.ok(Math.abs(sum - 0.05) < 1e-9);
  c.reset(20000);
  assert.equal(c.advance(20000, () => {}).steps, 0);
  assert.equal(c.advance(20008.4, () => {}).steps, 1);
});
test("30 ve 120 FPS hareket aynı sonuca ulaşır", () => {
  function simulate(fps) {
    const g = arena(game());
    g.remaining = 1;
    g.spawnTimer = 1e6;
    g.keys.add("KeyD");
    const c = new FixedClock();
    c.reset(0);
    for (let i = 1; i <= fps; i++)
      c.advance((i * 1000) / fps, (dt) => g.update(dt));
    return g.player.x;
  }
  assert.ok(Math.abs(simulate(30) - simulate(120)) < 1e-6);
});
test("kare ölçer sabit bellek ve dönen pencereyle doğru ortalama verir", () => {
  const m = new FrameMeter(2);
  m.add(10);
  m.add(30);
  assert.equal(m.mean, 20);
  assert.equal(m.fps, 50);
  m.add(50);
  assert.equal(m.mean, 40);
  assert.equal(m.count, 2);
  m.add(NaN);
  assert.equal(m.count, 2);
});
test("A* çalışma alanı yeniden kullanılır ve sonuçlar korunur", () => {
  const nav = new Navigation([{ x: 300, y: 200, w: 100, h: 400 }]),
    scores = nav.scores;
  const a = nav.find({ x: 180, y: 400 }, { x: 520, y: 400 });
  const b = nav.find({ x: 180, y: 400 }, { x: 520, y: 400 });
  assert.equal(nav.scores, scores);
  assert.deepEqual(a, b);
  assert.ok(nav.expanded.size > 0);
});
test("tahsis yapmayan slab çarpışması 2000 rastgele örnekte referansla eşleşir", () => {
  const r = seeded(204);
  for (let i = 0; i < 2000; i++) {
    const a = { x: r() * 1000, y: r() * 800 },
      b = { x: r() * 1000, y: r() * 800 },
      w = { x: r() * 800, y: r() * 600, w: r() * 100 + 1, h: r() * 100 + 1 };
    assert.equal(segmentRect(a, b, w), referenceRect(a, b, w));
    assert.equal(Number.isFinite(rectHitTime(a, b, w)), referenceRect(a, b, w));
  }
});
test("dash sırasında sınırlı yön düzeltmesi hız büyüklüğünü korur", () => {
  const g = arena(game());
  g.remaining = 1;
  g.spawnTimer = 100;
  g.keys.add("KeyD");
  g.dash();
  g.keys.clear();
  g.keys.add("KeyS");
  const y = g.player.y;
  g.update(1 / 120);
  assert.ok(g.player.y > y);
  assert.ok(g.player.dx > 0);
  assert.ok(Math.abs(Math.hypot(g.player.dx, g.player.dy) - 1) < 1e-9);
});
test("ayarlar açıkken simülasyon ve hit-stop donar", () => {
  const g = game();
  g.hitStop = 0.03;
  g.openSettings();
  const elapsed = g.elapsed;
  g.update(1);
  assert.equal(g.state, "settings");
  assert.equal(g.elapsed, elapsed);
  assert.equal(g.hitStop, 0.03);
});
