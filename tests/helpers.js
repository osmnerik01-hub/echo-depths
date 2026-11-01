import { Game } from "../src/game.js";
import { Navigation } from "../src/navigation.js";
import { makeEnemy } from "../src/enemies.js";
const elements = new Map();
export function element() {
  return {
    innerHTML: "",
    onclick: null,
    addEventListener() {},
    querySelectorAll() {
      this.cards = [0, 1, 2].map((i) => ({
        dataset: { up: String(i) },
        onclick: null,
      }));
      return this.cards;
    },
  };
}
globalThis.window = {
  listeners: {},
  addEventListener(type, fn) {
    this.listeners[type] = fn;
  },
};
globalThis.document = {
  hidden: false,
  listeners: {},
  addEventListener(type, fn) {
    this.listeners[type] = fn;
  },
  querySelector(s) {
    if (!elements.has(s)) elements.set(s, element());
    return elements.get(s);
  },
};
export function game() {
  const g = new Game(element(), { worldPoint: (p) => p });
  g.audio = { unlock() {}, play() {} };
  g.start();
  return g;
}
export function arena(g, walls = []) {
  g.room.walls = walls;
  g.navigation = new Navigation(walls);
  g.remaining = 0;
  g.enemies = [];
  g.player.inv = 100;
  return g;
}
export function enemy(g, x, y, type = 0, hp = 1000) {
  const e = makeEnemy(type, { x, y }, 1, ++g.enemyId);
  e.hp = e.maxHp = hp;
  e.wind = 0;
  g.enemies.push(e);
  return e;
}
export function tick(g, seconds) {
  for (let i = 0; i < Math.ceil(seconds * 120); i++) g.update(1 / 120);
}
export function seeded(seed = 37) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
