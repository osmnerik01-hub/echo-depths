import test from "node:test";
import assert from "node:assert/strict";
import { game, tick } from "./helpers.js";
import {
  makeBoss,
  updateBoss,
  bossDefinitions,
  bossPhase,
  rayDistance,
} from "../src/bosses.js";
import { generateDungeon } from "../src/dungeon.js";
import { grantScrap, buy } from "../src/economy.js";
import { hazardState, updateEnvironment, roomHazards } from "../src/biomes.js";
import { makeVolley } from "../src/weapons.js";
function bossRoom(index) {
  const g = game();
  g.biomeIndex = index;
  g.dungeon = generateDungeon("BOSS-TEST", index);
  g.nextRoom(g.dungeon.boss);
  tick(g, 2.3);
  g.player.inv = 100;
  return g;
}
function special(g, type) {
  g.nextRoom(g.dungeon.nodes.find((n) => n.type === type).id);
  return g;
}
for (let index = 0; index < 3; index++) {
  test(`${bossDefinitions[index].name}: üç faz, geçiş koruması ve saldırı desenleri`, () => {
    const g = bossRoom(index),
      b = g.boss;
    assert.equal(b.phase, 1);
    b.hp = b.maxHp * 0.5;
    updateBoss(g, 0.01);
    assert.ok(b.phase >= 2);
    assert.ok(b.phaseTime > 0);
    assert.equal(g.combat.damage(b, 100), 0);
    b.hp = b.maxHp * 0.2;
    updateBoss(g, 0.01);
    assert.equal(b.phase, 3);
    b.phaseTime = 0;
    for (let seq = 0; seq < b.definition.patterns.length; seq++) {
      b.sequence = seq;
      b.attack = null;
      b.cool = 0;
      updateBoss(g, 0.01);
      const a = b.attack;
      assert.equal(a.kind, b.definition.patterns[seq]);
      assert.ok(a.warning >= 1);
      const hp = g.player.hp;
      updateBoss(g, 0.5);
      assert.equal(g.player.hp, hp);
      for (let i = 0; i < 650 && b.attack; i++) updateBoss(g, 1 / 120);
      assert.equal(b.attack, null);
      assert.ok(g.room.walls.length === 4);
    }
  });
  test(`${bossDefinitions[index].name}: yenilebilir, gerçek hasar sayılır, ödül bir kez verilir`, () => {
    const g = bossRoom(index),
      b = g.boss,
      hp = b.hp;
    g.combat.damage(b, hp + 1000);
    assert.equal(g.stats.damage, hp);
    assert.equal(g.stats.bosses, 1);
    assert.equal(g.kills, 0);
    assert.ok(g.scrap >= 100);
    const scrap = g.scrap;
    g.onBossKilled(b);
    assert.equal(g.scrap, scrap);
    tick(g, 2.2);
    if (index === 2) {
      assert.equal(g.state, "victory");
      assert.ok(g.finalized);
    } else {
      assert.equal(g.state, "upgrade");
      g.overlay.cards[0].onclick();
      assert.equal(g.state, "biomeTransition");
      tick(g, 1.7);
      assert.equal(g.biomeIndex, index + 1);
      assert.equal(g.currentNode.id, g.dungeon.start);
      assert.equal(g.state, "playing");
    }
  });
}
test("boss beam geometrisi görsel kalınlığıyla eşleşir; dash hasarı önler", () => {
  assert.equal(rayDistance({ x: 100, y: 10 }, { x: 0, y: 0 }, 0), 10);
  const g = bossRoom(0),
    b = g.boss;
  g.player.x = 640;
  g.player.y = 500;
  g.player.inv = 0;
  b.attack = {
    kind: "laser",
    angle: Math.PI / 2,
    age: 1.9,
    warning: 1.25,
    duration: 1.35,
    circles: [],
    angles: [],
    clones: [],
  };
  g.dash();
  const hp = g.player.hp;
  updateBoss(g, 0.01);
  assert.equal(g.player.hp, hp);
});
test("Hollow Mind arena sütunları oyuncunun üzerinde oluşmaz ve geçişte temizlenir", () => {
  const g = bossRoom(2),
    b = g.boss;
  g.player.x = 350;
  g.player.y = 400;
  b.sequence = 3;
  b.cool = 0;
  updateBoss(g, 0.01);
  updateBoss(g, 1.3);
  assert.equal(g.room.walls.length, 5);
  assert.ok(!g.room.walls.some((w) => w.x === 310));
  b.hp = b.maxHp * 0.5;
  updateBoss(g, 0.01);
  assert.equal(g.room.walls.length, 4);
  assert.equal(g.arenaBaseWalls, null);
});
test("Scrap kazanma/harcama, dört mağaza türü ve tekrar satın alma koruması", () => {
  const g = special(game(), "shop");
  g.player.hp = 40;
  grantScrap(g, 500);
  for (const id of ["weapon", "module", "heal", "boost"]) {
    const item = g.shopItems.find((i) => i.id === id),
      before = g.scrap;
    assert.ok(item);
    assert.ok(buy(g, id));
    assert.equal(g.scrap, before - item.price);
    assert.equal(buy(g, id), false);
  }
  assert.equal(g.player.hp, 80);
  assert.equal(g.player.tempBoost, 45);
  assert.equal(g.stats.scrapSpent, 500 - g.scrap);
  assert.equal(g.player.inventory.length, 2);
  assert.equal(Object.keys(g.player.upgrades).length, 1);
});
test("yetersiz para ve tam can alışverişi reddeder; geçici güç gerçek hasarı artırır", () => {
  const g = special(game(), "shop");
  assert.equal(buy(g, "weapon"), false);
  grantScrap(g, 100);
  assert.equal(buy(g, "heal"), false);
  const normal = makeVolley(g.player, 0, () => 0.99)[0].damage;
  assert.ok(buy(g, "boost"));
  assert.equal(makeVolley(g.player, 0, () => 0.99)[0].damage, normal * 1.25);
  g.state = "playing";
  updateEnvironment(g, 46);
  assert.equal(g.player.tempBoost, 0);
});
test("tamir ve hazine bir kez kullanılır; oda ödülü iki kez verilmez", () => {
  const g = special(game(), "repair");
  g.player.hp = 1;
  const claim = document.querySelector("#claim-event").onclick;
  claim();
  assert.equal(g.player.hp, g.player.maxHp);
  assert.equal(g.stats.roomsCleared, 1);
  claim();
  assert.equal(g.stats.roomsCleared, 1);
  special(g, "treasure");
  document.querySelector("#claim-event").onclick();
  assert.equal(g.scrap, 70);
  assert.equal(g.state, "upgrade");
  const earned = g.scrap;
  g.chooseUpgrade();
  assert.equal(g.scrap, earned);
});
test("çevre tehlikeleri en az 1,25 sn uyarı verir ve güvenli alan bırakır", () => {
  for (let b = 1; b < 3; b++) {
    const g = game();
    g.biomeIndex = b;
    g.hazards = roomHazards(b, "combat");
    const h = g.hazards[0];
    assert.equal(hazardState({ ...h, offset: 0 }, 0.8), "warning");
    g.player.x = h.x + h.w / 2;
    g.player.y = h.y + h.h / 2;
    g.player.inv = 0;
    g.roomTime = (h.period - h.offset) % h.period;
    const hp = g.player.hp;
    updateEnvironment(g, 0.4);
    assert.equal(g.player.hp, hp);
    updateEnvironment(g, 1);
    assert.ok(g.player.hp < hp);
    assert.ok(
      g.hazards.reduce((sum, h) => sum + h.w * h.h, 0) < 1280 * 800 * 0.2,
    );
  }
});
test("ölüm terminal istatistikleri dondurur; yeni koşu bütün yeni değişkenleri sıfırlar", () => {
  const g = bossRoom(1);
  grantScrap(g, 300);
  g.stats.damage = 1234;
  g.stats.weaponsUsed.add("pulse");
  g.player.inv = 0;
  g.hurt(1000);
  assert.equal(g.state, "dead");
  g.combat.damage(g.boss, 100);
  assert.equal(g.stats.damage, 1234);
  assert.match(g.overlay.innerHTML, /1234/);
  g.start("RESET");
  assert.equal(g.seed, "RESET");
  assert.equal(g.biomeIndex, 0);
  assert.equal(g.scrap, 0);
  assert.equal(g.stats.bosses, 0);
  assert.equal(g.stats.damage, 0);
  assert.equal(g.stats.weaponsUsed.size, 0);
  assert.equal(g.shopItems.length, 0);
  assert.equal(g.boss, null);
  assert.equal(g.finalized, false);
});
