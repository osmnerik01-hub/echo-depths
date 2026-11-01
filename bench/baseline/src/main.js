import "./style.css";
import { Game } from "./game.js";
import { Renderer } from "./renderer.js";
const canvas = document.querySelector("#game"),
  renderer = new Renderer(canvas),
  game = new Game(canvas, renderer);
let last = performance.now(),
  accumulator = 0,
  hudClock = 0;
const frames = [],
  cpu = [];
let qaAct = null;
if (import.meta.env.DEV)
  window.__echoSnapshot = () => {
    const sorted = [...frames].sort((a, b) => a - b),
      avg = (a) => a.reduce((sum, n) => sum + n, 0) / (a.length || 1);
    return {
      state: game.state,
      room: game.roomIndex,
      seed: game.seed,
      elapsed: game.elapsed,
      biome: game.biomeIndex,
      scrap: game.scrap,
      node: game.currentNode
        ? {
            id: game.currentNode.id,
            type: game.currentNode.type,
            cleared: game.currentNode.cleared,
            next: [...game.currentNode.next],
          }
        : null,
      graph: game.dungeon
        ? game.dungeon.nodes.map((n) => ({
            id: n.id,
            type: n.discovered ? n.type : "unknown",
            discovered: n.discovered,
            layer: n.layer,
            lane: n.lane,
          }))
        : [],
      boss: game.boss
        ? {
            id: game.boss.bossId,
            hp: game.boss.hp,
            maxHp: game.boss.maxHp,
            phase: game.boss.phase,
            attack: game.boss.attack?.kind,
          }
        : null,
      stats: { ...game.stats, weaponsUsed: [...game.stats.weaponsUsed] },
      score: game.score,
      remaining: game.remaining,
      player: {
        x: game.player.x,
        y: game.player.y,
        hp: game.player.hp,
        weapon: game.player.weapon,
        inventory: [...game.player.inventory],
        dashCd: game.player.dashCd,
      },
      bullets: game.bullets.length,
      enemies: game.enemies.map((e) => ({
        type: e.type,
        x: e.x,
        y: e.y,
        hp: e.hp,
      })),
      performance: {
        samples: frames.length,
        frameMeanMs: avg(frames),
        frameP95Ms: sorted[Math.floor(sorted.length * 0.95)] || 0,
        cpuMeanMs: avg(cpu),
      },
    };
  };
function frame(now) {
  const start = performance.now(),
    raw = now - last,
    dt = Math.min(raw / 1000, 0.05);
  last = now;
  accumulator += dt;
  while (accumulator >= 1 / 120) {
    if (qaAct) qaAct(game);
    game.update(1 / 120);
    accumulator -= 1 / 120;
  }
  renderer.draw(game);
  hudClock += dt;
  if (hudClock > 0.08) {
    game.updateHUD();
    hudClock = 0;
  }
  if (import.meta.env.DEV && !document.hidden) {
    frames.push(raw);
    cpu.push(performance.now() - start);
    if (frames.length > 600) {
      frames.shift();
      cpu.shift();
    }
  }
  requestAnimationFrame(frame);
}
document.addEventListener("visibilitychange", () => {
  last = performance.now();
  accumulator = 0;
});
// Explicitly opted-in development QA. Production builds remove this branch and bot.
if (import.meta.env.DEV && new URLSearchParams(location.search).has("qa")) {
  import("./testing/bot.js").then(({ act }) => {
    window.__echoQA = {
      autoplay(on) {
        qaAct = on ? act : null;
        if (on) {
          frames.length = 0;
          cpu.length = 0;
          last = performance.now();
          accumulator = 0;
        }
      },
      advance(seconds = 1, until = "") {
        const limit = Math.min(120, Math.max(0, seconds)) * 120;
        for (let i = 0; i < limit; i++) {
          if (
            ((until === "boss" || until === `boss:${game.biomeIndex}`) &&
              game.boss &&
              game.state === "playing") ||
            (until === "combat" &&
              game.state === "playing" &&
              game.enemies.length >= 1) ||
            until === game.state ||
            (until === `biome:${game.biomeIndex}` &&
              game.state === "playing") ||
            game.finalized
          )
            break;
          act(game);
          game.update(1 / 120);
        }
        renderer.draw(game);
        game.updateHUD();
        return window.__echoSnapshot();
      },
      idle(seconds = 1) {
        for (let i = 0; i < Math.min(15, seconds) * 120; i++)
          game.update(1 / 120);
        renderer.draw(game);
        game.updateHUD();
        return window.__echoSnapshot();
      },
    };
  });
}
requestAnimationFrame(frame);
