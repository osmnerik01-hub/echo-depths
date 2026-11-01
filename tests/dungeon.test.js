import test from "node:test";
import assert from "node:assert/strict";
import {
  generateDungeon,
  seeded,
  mapView,
  nodeById,
  canTravel,
} from "../src/dungeon.js";
import { game, tick } from "./helpers.js";
test("aynı seed üç biyomda aynı grafiği üretir; farklı seed değiştirir", () => {
  for (let b = 0; b < 3; b++) {
    assert.deepEqual(generateDungeon("ABYSS", b), generateDungeon("ABYSS", b));
    assert.notDeepEqual(
      generateDungeon("ABYSS", b),
      generateDungeon("OTHER", b),
    );
  }
});
test("500 seed × üç biyom: tüm odalar erişilir, boss ve ödül/tamir garanti", () => {
  for (let seed = 0; seed < 500; seed++)
    for (let biome = 0; biome < 3; biome++) {
      const d = generateDungeon(seed, biome),
        seen = new Set([d.start]),
        q = [d.start];
      while (q.length) {
        const n = nodeById(d, q.shift());
        for (const id of n.next) {
          const target = nodeById(d, id);
          assert.ok(target);
          assert.ok(target.previous.includes(n.id));
          assert.equal(target.layer, n.layer + 1);
          if (!seen.has(id)) {
            seen.add(id);
            q.push(id);
          }
        }
      }
      assert.equal(seen.size, d.nodes.length);
      assert.ok(seen.has(d.boss));
      assert.ok(d.nodes.some((n) => n.type === "repair"));
      assert.ok(d.nodes.some((n) => n.type === "treasure"));
      assert.ok(d.nodes.some((n) => n.type === "shop"));
      assert.ok(d.nodes.some((n) => n.next.length > 1));
      for (const n of d.nodes) if (n.id !== d.boss) assert.ok(n.next.length);
    }
});
test("görsel RNG seed haritasını veya ödül RNG akışını değiştirmez", () => {
  const a = generateDungeon("ISOLATED"),
    ra = seeded("rewards"),
    rb = seeded("rewards");
  const values = [ra(), ra(), ra()];
  for (let i = 0; i < 1000; i++) Math.random();
  assert.deepEqual(a, generateDungeon("ISOLATED"));
  assert.deepEqual(values, [rb(), rb(), rb()]);
});
test("sis içerikleri gizler, boss görünür; sadece biten odanın bağlantısına gidilir", () => {
  const g = game();
  const initial = mapView(g.dungeon);
  assert.ok(initial.some((n) => n.type === "unknown"));
  assert.equal(initial.find((n) => n.id === g.dungeon.boss).type, "boss");
  assert.equal(canTravel(g.dungeon, g.currentNode.next[0]), false);
  g.currentNode.cleared = true;
  assert.ok(canTravel(g.dungeon, g.currentNode.next[0]));
  assert.equal(canTravel(g.dungeon, g.dungeon.boss), false);
});
test("TAB haritası zamanı ve mermileri dondurur; kapanınca durum korunur", () => {
  const g = game();
  g.shoot(g.player, 0);
  const life = g.bullets[0].life,
    elapsed = g.elapsed;
  g.keys.add("KeyD");
  g.showMap();
  tick(g, 2);
  assert.equal(g.bullets[0].life, life);
  assert.equal(g.elapsed, elapsed);
  assert.equal(g.keys.size, 0);
  assert.ok(g.closeMap());
  assert.equal(g.state, "playing");
  g.pause();
  g.showMap();
  g.closeMap();
  assert.equal(g.state, "paused");
});
test("zorunlu rota haritası kapatılamaz; geçiş tek kez çalışır ve geri gidilemez", () => {
  const g = game();
  g.markCleared();
  g.showMap(true);
  assert.equal(g.closeMap(), false);
  const id = g.currentNode.next[0];
  assert.equal(g.travelTo(g.dungeon.boss), false);
  assert.ok(g.travelTo(id));
  assert.equal(g.travelTo(id), false);
  tick(g, 0.5);
  assert.equal(g.currentNode.id, id);
  assert.equal(g.roomIndex, 2);
  assert.equal(g.currentNode.visited, true);
});
