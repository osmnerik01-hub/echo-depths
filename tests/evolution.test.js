import test from "node:test";
import assert from "node:assert/strict";
import { game, arena, enemy, seeded, tick } from "./helpers.js";
import { applyUpgrade, upgrades, rollRarity } from "../src/upgrades.js";
import { updateEnemies } from "../src/enemies.js";
import { makeVolley, weaponStats } from "../src/weapons.js";
import { Navigation } from "../src/navigation.js";
const mod = (p, id) =>
  applyUpgrade(
    p,
    upgrades.find((u) => u.id === id),
  );
test("yanma zaman içinde hasar verir ve sona erer; yavaşlık hareketi azaltır", () => {
  const a = arena(game()),
    b = arena(game());
  a.player.x = b.player.x = 1000;
  a.player.y = b.player.y = 400;
  const x = enemy(a, 200, 400),
    y = enemy(b, 200, 400);
  x.burnDamage = 6;
  x.burnTime = 2;
  x.slow = 0.5;
  x.slowTime = 1.5;
  for (let i = 0; i < 120; i++) {
    updateEnemies(a, 1 / 120);
    updateEnemies(b, 1 / 120);
  }
  assert.ok(Math.abs(x.hp - 994) < 0.01);
  assert.ok(y.x - x.x > 50);
  for (let i = 0; i < 240; i++) updateEnemies(a, 1 / 120);
  assert.ok(Math.abs(x.hp - 988) < 0.1);
  const hp = x.hp;
  for (let i = 0; i < 120; i++) updateEnemies(a, 1 / 120);
  assert.equal(x.hp, hp);
  assert.equal(x.slowTime, 0);
});
test("zırh hasarı azaltır, can modülü azamiyi artırıp onarır", () => {
  const g = game();
  mod(g.player, "armor");
  g.player.inv = 0;
  g.hurt(25);
  assert.equal(g.player.hp, 77);
  mod(g.player, "hull");
  assert.equal(g.player.hp, 125);
  assert.equal(g.player.maxHp, 125);
});
test("dash patlaması, ek patlama ve geniş alan birlikte çalışır", () => {
  const g = arena(game());
  const e = enemy(g, 750, 400);
  mod(g.player, "dashnova");
  mod(g.player, "echo");
  mod(g.player, "blast");
  mod(g.player, "blast");
  const hp = e.hp;
  g.dash();
  assert.ok(e.hp < hp);
  assert.equal(g.delayed.length, 1);
  const first = e.hp;
  g.combat.update(0.23);
  assert.ok(e.hp < first);
  assert.equal(g.delayed.length, 0);
});
test("dash kalkan süresi uzar ve geçici hasar artışı sonlanır", () => {
  const g = arena(game());
  g.remaining = 1;
  g.spawnTimer = 100;
  g.player.inv = 0;
  mod(g.player, "dashshield");
  mod(g.player, "dashpower");
  g.dash();
  assert.ok(g.player.inv > 0.32);
  const boosted = makeVolley(g.player, 0, () => 0.99)[0].damage;
  tick(g, 1.7);
  const normal = makeVolley(g.player, 0, () => 0.99)[0].damage;
  assert.ok(boosted > normal);
  assert.equal(g.player.dashBoost, 0);
});
test("sekme mermisi duvardan dönerek geri hedefi vurur", () => {
  const g = arena(game(), [{ x: 300, y: 0, w: 20, h: 800 }]);
  g.player.x = 200;
  g.player.y = 400;
  g.player.critChance = 0;
  mod(g.player, "ricochet");
  const e = enemy(g, 150, 400);
  g.bullets = makeVolley(g.player, 0, () => 0.99);
  g.combat.update(0.2);
  assert.equal(g.bullets.length, 1);
  assert.ok(g.bullets[0].vx < 0);
  g.combat.update(0.2);
  assert.equal(e.hp, 976);
});
test("düşük can overclock ateşi hızlandırır, execution yaralı hedefte çalışır", () => {
  const g = arena(game());
  mod(g.player, "overclock");
  g.player.hp = 20;
  g.pointer.down = true;
  g.update(1 / 120);
  assert.ok(
    Math.abs(g.player.fire - weaponStats(g.player).delay * 0.75) < 0.001,
  );
  const e = enemy(g, 200, 400);
  e.hp = 200;
  mod(g.player, "execution");
  g.combat.damage(e, 50);
  assert.equal(e.hp, 130);
});
test("Swarmer, Specter ve Bulwark saldırıdan önce hazırlık gösterir", () => {
  for (const type of [3, 4, 5]) {
    const g = arena(game());
    const e = enemy(g, g.player.x - 65, g.player.y, type);
    e.cool = 0;
    g.player.inv = 0;
    updateEnemies(g, 1 / 120);
    assert.ok(e.attack);
    assert.ok(e.attack.time >= 0.28);
    assert.equal(g.player.hp, 100);
    const a = e.attack;
    updateEnemies(g, a.time / 2);
    assert.ok(e.attack);
    assert.equal(g.bullets.length, 0);
  }
});
test("nadirlik dağılımı seed ile yaklaşık %64 / %29 / %7", () => {
  const random = seeded(17),
    count = { Common: 0, Rare: 0, Epic: 0 };
  for (let i = 0; i < 10000; i++) count[rollRarity(random)]++;
  assert.ok(Math.abs(count.Common - 6400) < 200);
  assert.ok(Math.abs(count.Rare - 2900) < 200);
  assert.ok(Math.abs(count.Epic - 700) < 100);
});
test("duvara yaslanan oyuncuya ağır gövde erişilebilir noktadan yaklaşır", () => {
  const nav = new Navigation([{ x: 300, y: 100, w: 100, h: 500 }]);
  const p = { x: 417, y: 400 },
    start = { x: 600, y: 400 };
  const path = nav.find(start, p, 27);
  assert.ok(path.length);
  let previous = start;
  for (const point of path) {
    assert.ok(nav.clear(previous, point, 27));
    previous = point;
  }
  assert.ok(Math.hypot(previous.x - p.x, previous.y - p.y) < 60);
});
test("yakından ateşlenen mermi ince duvarın diğer tarafında doğmaz", () => {
  const g = arena(game(), [{ x: 200, y: 0, w: 4, h: 800 }]);
  g.player.x = 183;
  g.player.y = 400;
  g.player.critChance = 0;
  const e = enemy(g, 230, 400);
  g.bullets = makeVolley(g.player, 0, () => 0.99);
  g.combat.update(0.1);
  assert.equal(e.hp, 1000);
  assert.equal(g.bullets.length, 0);
});
