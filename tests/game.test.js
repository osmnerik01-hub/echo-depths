import test from "node:test";
import assert from "node:assert/strict";
import { game, arena, enemy, tick } from "./helpers.js";
import { applyUpgrade, upgrades } from "../src/upgrades.js";
import { unlockWeapon } from "../src/weapons.js";

test("seed alanına yazılan harfler oyun kısayollarını tetiklemez", () => {
  const g = game();
  g.menu();
  g.audio.muted = false;
  window.listeners.keydown({ code: "KeyM", target: { closest: () => true } });
  assert.equal(g.audio.muted, false);
  assert.equal(g.keys.has("KeyM"), false);
});

test("oyun girdisi silah değiştirir; menüde Tab korunur; odak ve görünürlük duraklatır", () => {
  const g = game();
  unlockWeapon(g.player, "rail");
  let prevented = false;
  window.listeners.keydown({
    code: "KeyQ",
    repeat: false,
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, false);
  assert.equal(g.player.weapon, "pulse");
  g.menu();
  prevented = false;
  window.listeners.keydown({
    code: "Tab",
    repeat: false,
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, false);
  g.start();
  g.keys.add("KeyD");
  g.pointer.down = true;
  window.listeners.blur();
  assert.equal(g.state, "paused");
  assert.equal(g.keys.size, 0);
  assert.equal(g.pointer.down, false);
  g.pause();
  document.hidden = true;
  document.listeners.visibilitychange();
  assert.equal(g.state, "paused");
  document.hidden = false;
});
test("başlat, duraklat, devam, ölüm ve yeniden başlat", () => {
  const g = game();
  g.start();
  assert.equal(g.state, "playing");
  assert.equal(g.remaining, 7);
  g.pause();
  const x = g.player.x;
  g.keys.add("KeyD");
  g.update(0.1);
  assert.equal(g.player.x, x);
  g.pause();
  g.player.inv = 0;
  g.hurt(100);
  assert.equal(g.state, "dead");
  g.start();
  assert.equal(g.player.hp, 100);
  assert.equal(g.roomIndex, 1);
  assert.equal(g.kills, 0);
});
test("dash cooldown ve dokunulmazlık", () => {
  const g = game();
  g.start();
  g.player.inv = 0;
  g.keys.add("KeyD");
  g.dash();
  assert.equal(g.player.dashCd, 1.6);
  g.hurt(50);
  assert.equal(g.player.hp, 100);
  g.update(0.1);
  assert.ok(g.player.x > 640);
  const cd = g.player.dashCd;
  g.dash();
  assert.equal(g.player.dashCd, cd);
});
test("mermi düşmanı öldürür, oda temizliği modül ekranına gider", () => {
  const g = game();
  g.start();
  g.remaining = 0;
  g.enemies = [
    {
      x: 700,
      y: 400,
      r: 17,
      type: 0,
      hp: 1,
      maxHp: 1,
      wind: 0,
      cool: 10,
      flash: 0,
    },
  ];
  g.bullets = [
    { x: 670, y: 400, vx: 810, vy: 0, r: 4, life: 1, enemy: false, damage: 24 },
  ];
  g.update(0.04);
  assert.equal(g.enemies.length, 0);
  assert.equal(g.kills, 1);
  tick(g, 1.3);
  assert.equal(g.state, "upgrade");
  g.nextRoom();
  assert.equal(g.state, "playing");
  assert.equal(g.roomIndex, 2);
});
test("modül seçimi sonraki odaya taşınır ve çift tıklama oda atlatmaz", () => {
  const g = arena(game());
  g.chooseUpgrade();
  assert.deepEqual(g.player.inventory, ["pulse", "scatter"]);
  const cards = g.overlay.cards;
  cards[0].onclick();
  assert.equal(g.state, "map");
  assert.equal(g.roomIndex, 1);
  assert.equal(Object.keys(g.player.upgrades).length, 1);
  cards[0].onclick();
  assert.equal(g.roomIndex, 1);
  assert.ok(g.travelTo(g.currentNode.next[0]));
  tick(g, 0.5);
  assert.equal(g.roomIndex, 2);
  assert.equal(g.state, "playing");
});
test("dört oda ödülü beş silahı açar; yeniden başlatma önceki koşuyu temizler", () => {
  const g = game();
  for (let i = 0; i < 4; i++) {
    g.chooseUpgrade();
    g.nextRoom();
  }
  assert.equal(g.player.inventory.length, 5);
  applyUpgrade(
    g.player,
    upgrades.find((u) => u.id === "echo"),
  );
  g.bullets.push({});
  g.effects.push({});
  g.numbers.push({});
  g.delayed.push({});
  g.hitStop = 0.1;
  g.shake = 10;
  g.player.dashBoost = 1;
  g.score = 1000;
  g.start();
  assert.deepEqual(g.player.inventory, ["pulse"]);
  assert.deepEqual(g.player.upgrades, {});
  assert.equal(g.player.echoBlast, false);
  assert.equal(g.score, 0);
  for (const key of ["bullets", "enemies", "effects", "numbers", "delayed"])
    assert.equal(g[key].length, 0);
  assert.equal(g.hitStop, 0);
  assert.equal(g.shake, 0);
  assert.equal(g.player.dashBoost, 0);
});
test("oda geçişinde eski patlama ve dash temizlenir; silah korunur", () => {
  const g = game();
  unlockWeapon(g.player, "nova");
  g.player.dash = 0.1;
  g.delayed.push({ time: 0.2 });
  g.nextRoom();
  assert.equal(g.delayed.length, 0);
  assert.equal(g.player.dash, 0);
  assert.equal(g.player.weapon, "nova");
  assert.equal(g.bullets.length, 0);
});
