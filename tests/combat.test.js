import test from "node:test";
import assert from "node:assert/strict";
import { game, arena, enemy } from "./helpers.js";
import {
  weapons,
  makeVolley,
  weaponStats,
  switchWeapon,
  unlockWeapon,
} from "../src/weapons.js";
import {
  applyUpgrade,
  upgrades,
  rollRarity,
  upgradeChoices,
} from "../src/upgrades.js";
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.001, `${a} != ${b}`);
const mod = (p, id) =>
  applyUpgrade(
    p,
    upgrades.find((u) => u.id === id),
  );
test("beş silahın doğrudan hasarı ve saçma sayısı veriyle tutarlı", () => {
  for (const id of Object.keys(weapons)) {
    const g = arena(game()),
      p = g.player;
    p.weapon = id;
    p.critChance = 0;
    p.x = 100;
    p.y = 400;
    const e = enemy(g, 200, 400);
    const shots = makeVolley(p, 0, () => 0.99);
    assert.equal(shots.length, weapons[id].pellets);
    for (const b of shots) {
      b.hit = new Set();
      if (id === "nova") {
        b.x = e.x;
        b.y = e.y;
      }
      g.combat.hit(b, e, { x: 100, y: 400 });
    }
    const expected =
      id === "nova" ? weapons[id].damage : weapons[id].damage * shots.length;
    near(e.maxHp - e.hp, expected);
  }
});
test("Pulse başlangıçta tek silah; Q çevrimi ve duplicate keşif engeli", () => {
  const p = game().player;
  assert.deepEqual(p.inventory, ["pulse"]);
  assert.equal(switchWeapon(p), "pulse");
  assert.ok(unlockWeapon(p, "rail"));
  assert.equal(p.weapon, "rail");
  assert.equal(switchWeapon(p), "pulse");
  assert.equal(unlockWeapon(p, "rail"), false);
});
test("Rail ardışık hedefleri deler ve her hedefe yalnızca bir kez vurur", () => {
  const g = arena(game()),
    p = g.player;
  p.x = 100;
  p.y = 400;
  p.weapon = "rail";
  p.critChance = 0;
  const a = enemy(g, 190, 400),
    b = enemy(g, 260, 400),
    c = enemy(g, 350, 400);
  g.bullets = makeVolley(p, 0, () => 0.99);
  g.combat.update(0.2);
  near(a.hp, 900);
  near(b.hp, 900);
  near(c.hp, 900);
  g.combat.update(0.005);
  near(c.hp, 900);
});
test("elektrik zinciri yakındaki farklı hedeflere doğru hasarı verir", () => {
  const g = arena(game());
  const a = enemy(g, 200, 400),
    b = enemy(g, 300, 400),
    c = enemy(g, 400, 400),
    d = enemy(g, 800, 400);
  g.combat.chain(a, 40, 2);
  near(b.hp, 978);
  near(c.hp, 978);
  near(d.hp, 1000);
  assert.equal(g.effects.filter((f) => f.kind === "arc").length, 2);
});
test("zincir ve patlama duvar arkasına geçmez; patlama alanı dışında hasar yok", () => {
  const g = arena(game(), [{ x: 250, y: 0, w: 20, h: 800 }]);
  const a = enemy(g, 200, 400),
    b = enemy(g, 300, 400),
    far = enemy(g, 700, 400);
  g.combat.chain(a, 100, 3);
  near(b.hp, 1000);
  g.combat.explode({ x: 200, y: 400 }, 100, 120);
  near(a.hp, 900);
  near(b.hp, 1000);
  near(far.hp, 1000);
});
test("patlama merkez ve kenar hasarı, Epic yankı patlaması yalnızca bir kez", () => {
  const g = arena(game());
  g.player.echoBlast = true;
  const a = enemy(g, 200, 400),
    b = enemy(g, 300, 400);
  g.combat.explode({ x: 200, y: 400 }, 100, 100);
  near(a.hp, 900);
  near(b.hp, 945);
  assert.equal(g.delayed.length, 1);
  g.combat.update(0.23);
  near(a.hp, 855);
  assert.equal(g.delayed.length, 0);
  assert.equal(g.effects.filter((f) => f.kind === "explosion").length, 2);
});
test("Nova duvara çarpınca ve ömrü bitince bir kez patlar", () => {
  for (const wall of [true, false]) {
    const g = arena(game(), wall ? [{ x: 200, y: 0, w: 20, h: 800 }] : []);
    g.player.x = 100;
    g.player.y = 400;
    g.player.weapon = "nova";
    g.bullets = makeVolley(g.player, 0, () => 0.99);
    g.combat.update(wall ? 0.5 : 2);
    assert.equal(g.bullets.length, 0);
    assert.equal(g.effects.filter((f) => f.kind === "explosion").length, 1);
  }
});
test("ilk çarpışma sıralaması duvar önündeki hedefi vurur, arkasındakini korur", () => {
  const g = arena(game(), [{ x: 250, y: 0, w: 5, h: 800 }]);
  g.player.x = 100;
  g.player.y = 400;
  g.player.critChance = 0;
  const a = enemy(g, 220, 400),
    b = enemy(g, 290, 400);
  g.bullets = makeVolley(g.player, 0, () => 0.99);
  g.combat.update(0.3);
  near(a.hp, 976);
  near(b.hp, 1000);
});
test("Bulwark yönlü kalkan: önden %75 azaltma, arkadan tam hasar", () => {
  const g = arena(game()),
    e = enemy(g, 300, 400, 4);
  e.angle = 0;
  g.combat.damage(e, 100, { from: { x: 400, y: 400 } });
  near(e.hp, 975);
  g.combat.damage(e, 100, { from: { x: 200, y: 400 } });
  near(e.hp, 875);
});
test("kritik + deliş, zincir güçlendirici ve dash hasar sinerjileri", () => {
  const p = game().player;
  mod(p, "crit");
  mod(p, "critpower");
  mod(p, "pierce");
  mod(p, "chain");
  mod(p, "electric");
  mod(p, "dashpower");
  p.dashBoost = 1;
  const b = makeVolley(p, 0, () => 0)[0];
  assert.equal(b.crit, true);
  near(b.damage, 24 * 2.25 * 1.3);
  assert.equal(b.pierce, 1);
  assert.equal(b.chain, 1);
  near(p.chainPower, 0.8);
  assert.equal(p.chainRange, 200);
});
test("yanma ve kriyo gerçek hedef durumuna uygulanır; geri dönüşüm öldürmede iyileştirir", () => {
  const g = arena(game());
  mod(g.player, "burn");
  mod(g.player, "slow");
  mod(g.player, "repair");
  g.player.hp = 50;
  const e = enemy(g, 200, 400);
  const b = makeVolley(g.player, 0, () => 0.99)[0];
  g.combat.hit(b, e, { x: 100, y: 400 });
  assert.equal(e.burnTime, 2);
  assert.equal(e.burnDamage, 6);
  assert.equal(e.slowTime, 1.5);
  near(e.slow, 0.15);
  g.combat.damage(e, 2000);
  assert.equal(g.player.hp, 52);
});
test("hasar + atış hızı tüm silah istatistiklerine yansır", () => {
  const p = game().player;
  mod(p, "damage");
  mod(p, "rate");
  for (const id of Object.keys(weapons)) {
    const w = weaponStats(p, id);
    near(w.damage, weapons[id].damage * 1.2);
    near(w.delay, weapons[id].delay * 0.86);
  }
});
test("24 yükseltmenin tamamı istatistikleri değiştirir; yığın üst sınırları geçilmez", () => {
  assert.ok(upgrades.length >= 20);
  for (const u of upgrades) {
    const p = game().player;
    p.hp = 1;
    const before = JSON.stringify({ ...p, upgrades: {} });
    assert.ok(applyUpgrade(p, u));
    assert.notEqual(JSON.stringify({ ...p, upgrades: {} }), before, u.id);
    for (let i = 1; i < u.max; i++) assert.ok(applyUpgrade(p, u));
    assert.equal(applyUpgrade(p, u), false, u.id);
    assert.equal(p.upgrades[u.id], u.max);
    assert.ok(Number.isFinite(p.hp));
  }
});
test("nadirlik sınırları ve üç benzersiz seçim; tükenen modüller seçilemez", () => {
  assert.equal(
    rollRarity(() => 0),
    "Common",
  );
  assert.equal(
    rollRarity(() => 0.64),
    "Rare",
  );
  assert.equal(
    rollRarity(() => 0.93),
    "Epic",
  );
  const p = game().player;
  for (const rarity of ["Common", "Rare", "Epic"]) {
    const random = () =>
      rarity === "Common" ? 0.1 : rarity === "Rare" ? 0.7 : 0.97;
    const choices = upgradeChoices(p, random);
    assert.equal(new Set(choices.map((u) => u.id)).size, 3);
    assert.ok(choices.every((u) => u.rarity === rarity));
  }
  for (const u of upgrades) for (let i = 0; i < u.max; i++) applyUpgrade(p, u);
  assert.deepEqual(upgradeChoices(p), []);
});
