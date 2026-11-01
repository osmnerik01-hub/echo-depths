import test from "node:test";
import assert from "node:assert/strict";
import { Renderer } from "../src/renderer.js";
import { game, enemy } from "./helpers.js";
import { weapons } from "../src/weapons.js";
import { generateDungeon } from "../src/dungeon.js";
import { updateBoss } from "../src/bosses.js";

test("tüm silahlar, altı siluet ve efektler geçerli Canvas çağrıları üretir", () => {
  const g = game();
  let depth = 0,
    calls = 0,
    gradients = 0;
  const gradient = {
    addColorStop(pos, color) {
      assert.ok(pos >= 0 && pos <= 1);
      assert.equal(typeof color, "string");
    },
  };
  const ctx = new Proxy(
    {},
    {
      get(target, key) {
        if (key in target) return target[key];
        if (key === "createRadialGradient")
          return (...args) => {
            gradients++;
            assert.ok(args.every(Number.isFinite));
            assert.ok(args[2] >= 0 && args[5] >= 0);
            return gradient;
          };
        if (key === "save") return () => depth++;
        if (key === "restore")
          return () => {
            depth--;
            assert.ok(depth >= 0);
          };
        return (...args) => {
          calls++;
          const minimum =
            {
              ellipse: 7,
              arc: 5,
              fillRect: 4,
              strokeRect: 4,
              drawImage: 3,
              setTransform: 6,
              fillText: 3,
              strokeText: 3,
              moveTo: 2,
              lineTo: 2,
              translate: 2,
              scale: 2,
              rotate: 1,
            }[key] || 0;
          assert.ok(
            args.length >= minimum,
            `${key}: expected at least ${minimum} arguments`,
          );
          for (const arg of args)
            if (typeof arg === "number") assert.ok(Number.isFinite(arg), key);
        };
      },
      set(target, key, value) {
        if (typeof value === "number") assert.ok(Number.isFinite(value), key);
        target[key] = value;
        return true;
      },
    },
  );
  const previous = document.createElement;
  document.createElement = () => ({ getContext: () => ctx });
  globalThis.innerWidth = 1280;
  globalThis.innerHeight = 800;
  globalThis.devicePixelRatio = 2;
  const canvas = { getContext: () => ctx, addEventListener() {} },
    r = new Renderer(canvas);
  for (let i = 0; i < 6; i++) {
    const e = enemy(g, 100 + i * 150, 200, i);
    e.attack = {
      kind: i === 4 ? "volley" : "charge",
      time: 0.2,
      max: 0.7,
      angle: 0,
    };
    e.hp /= 2;
  }
  g.effects = [
    {
      kind: "arc",
      x: 100,
      y: 100,
      tx: 200,
      ty: 150,
      life: 0.1,
      max: 0.2,
      color: "#abccff",
    },
    {
      kind: "explosion",
      x: 300,
      y: 100,
      r: 100,
      life: 0.2,
      max: 0.4,
      color: "#ffb16c",
    },
    {
      kind: "death",
      x: 400,
      y: 100,
      r: 17,
      angle: 0,
      life: 0.2,
      max: 0.4,
      color: "#ffb16c",
    },
    {
      kind: "muzzle",
      x: 500,
      y: 100,
      r: 30,
      angle: 0,
      life: 0.04,
      max: 0.08,
      color: "#ffb16c",
    },
  ];
  g.numbers = [
    { x: 100, y: 90, text: 24, life: 0.5, crit: true, color: "#fff" },
  ];
  for (const id of Object.keys(weapons)) {
    g.player.weapon = id;
    g.shoot(g.player, 0);
    r.draw(g);
    assert.equal(depth, 0);
  }
  for (const state of ["menu", "paused", "upgrade", "dead"]) {
    g.state = state;
    g.player.hp = 10;
    r.draw(g);
    assert.equal(depth, 0);
  }
  for (let index = 0; index < 3; index++) {
    g.biomeIndex = index;
    g.dungeon = generateDungeon("RENDER", index);
    g.nextRoom(g.dungeon.boss);
    r.draw(g);
    g.state = "playing";
    g.player.inv = 100;
    const b = g.boss;
    for (let seq = 0; seq < b.definition.patterns.length; seq++) {
      b.sequence = seq;
      b.cool = 0;
      b.attack = null;
      updateBoss(g, 0.001);
      r.draw(g);
      const a = b.attack;
      updateBoss(g, a.warning + 0.01);
      r.draw(g);
      updateBoss(g, a.duration + 0.01);
      assert.equal(depth, 0);
    }
    b.hp = b.maxHp * 0.2;
    updateBoss(g, 0.01);
    r.draw(g);
    b.phaseTime = 0;
    g.combat.damage(b, b.hp + 1);
    r.draw(g);
    assert.equal(depth, 0);
  }
  const cached = r.roomLayer;
  r.draw(g);
  assert.equal(r.roomLayer, cached);
  g.room.walls = [...g.room.walls];
  r.draw(g);
  assert.notEqual(r.roomLayer, cached);
  r.setQuality("LOW");
  const lowStart = gradients;
  r.draw(g);
  const lowGradients = gradients - lowStart;
  r.setQuality("HIGH");
  const highStart = gradients;
  r.draw(g);
  assert.ok(gradients - highStart > lowGradients);
  assert.ok(calls > 1000);
  document.createElement = previous;
});
