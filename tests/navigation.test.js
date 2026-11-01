import test from "node:test";
import assert from "node:assert/strict";
import { Navigation } from "../src/navigation.js";
import { updateEnemies, difficulty } from "../src/enemies.js";
import { distance, circleRect } from "../src/math.js";
import { createRoom } from "../src/rooms.js";
import { game, arena, enemy } from "./helpers.js";
test("A* engelin çevresinden güvenli yarıçapla dolaşır", () => {
  const nav = new Navigation([{ x: 300, y: 200, w: 100, h: 400 }]);
  const start = { x: 180, y: 400 },
    end = { x: 520, y: 400 };
  for (const r of [10, 17, 27]) {
    const path = nav.find(start, end, r);
    assert.ok(path.length > 1);
    let prev = start;
    for (const p of path) {
      assert.ok(nav.clear(prev, p, r));
      prev = p;
    }
    assert.equal(distance(prev, end), 0);
  }
});
test("açık görüş A* araması gerektirmez; erişilemez hedef sonlanır", () => {
  const n = new Navigation([]);
  assert.equal(n.find({ x: 100, y: 100 }, { x: 900, y: 500 }).length, 1);
  assert.equal(n.searches, 0);
  const blocked = new Navigation([{ x: 300, y: 0, w: 100, h: 800 }]);
  assert.deepEqual(blocked.find({ x: 180, y: 400 }, { x: 520, y: 400 }), []);
});
test("tüm oda şablonlarında ağır gövde engelleri aşar", () => {
  for (let i = 0; i < 4; i++) {
    const room = createRoom(8, () => i / 4 + 0.01),
      nav = new Navigation(room.walls);
    for (const start of [
      { x: 95, y: 95 },
      { x: 1185, y: 705 },
      { x: 95, y: 705 },
    ]) {
      const path = nav.find(start, { x: 640, y: 400 }, 27);
      assert.ok(path.length > 0);
      let previous = start;
      for (const p of path) {
        assert.ok(nav.clear(previous, p, 27));
        previous = p;
      }
    }
  }
});
test("gerçek düşman hareketi duvara girmeden engelin etrafından oyuncuya ulaşır", () => {
  const g = arena(game(), [{ x: 300, y: 200, w: 100, h: 400 }]);
  g.player.x = 520;
  g.player.y = 400;
  const e = enemy(g, 180, 400);
  for (let i = 0; i < 1500; i++) {
    updateEnemies(g, 1 / 120);
    assert.equal(
      g.room.walls.some((w) => circleRect(e, w)),
      false,
    );
  }
  assert.ok(distance(e, g.player) < 60, `mesafe ${distance(e, g.player)}`);
  assert.ok(g.navigation.searches < 30);
});
test("separation üst üste düşmanları ayırır", () => {
  const g = arena(game());
  const a = enemy(g, 200, 200),
    b = enemy(g, 200, 200);
  a.wind = b.wind = 10;
  for (let i = 0; i < 60; i++) updateEnemies(g, 1 / 120);
  assert.ok(distance(a, b) > 25);
});
test("erişilemeyen tehdit oda akışını kilitlemez", () => {
  const g = arena(game(), [{ x: 300, y: 0, w: 100, h: 800 }]);
  g.player.x = 520;
  g.player.y = 400;
  const e = enemy(g, 180, 400);
  g.findSpawn = () => null;
  for (let i = 0; i < 1000; i++) updateEnemies(g, 1 / 120);
  assert.ok(e.hp <= 0);
});
test("zorluk sayısı sınırlı ve yeni tipler kademeli; güç ölçeği kontrollü", () => {
  const p = game().player;
  assert.deepEqual(difficulty(1, p).types, [0]);
  assert.equal(difficulty(3, p).types.length, 3);
  assert.equal(difficulty(6, p).types.length, 6);
  assert.equal(difficulty(100, p).active, 12);
  assert.equal(difficulty(100, p).count, 22);
  p.damage *= 10;
  assert.ok(difficulty(100, p).hp <= 3.05);
});
test("doğumlar güvenli mesafede, engel dışında ve erişilebilir", () => {
  const g = game();
  g.roomIndex = 6;
  g.nextRoom();
  for (let i = 0; i < 10; i++) {
    const pos = g.findSpawn(i % 6);
    assert.ok(pos);
    assert.ok(distance(pos, g.player) >= 330);
    assert.equal(
      g.room.walls.some((w) => circleRect(pos, w)),
      false,
    );
    assert.ok(g.navigation.find(pos, g.player, pos.r - 15).length > 0);
  }
});
