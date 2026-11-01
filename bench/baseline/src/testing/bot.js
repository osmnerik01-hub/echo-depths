// QA-only input controller. Never grants health, invulnerability, damage or currency.
// It uses normal projectiles, upgrades, purchases, movement and cooldown-limited dash.
import { distance, circleRect, segmentCircle } from "../math.js";
import { nodeById } from "../dungeon.js";
import { buy } from "../economy.js";
import { rayDistance } from "../bosses.js";
export function act(g) {
  if (g.state === "upgrade") {
    const rank = (u) => {
      const low = g.player.hp / g.player.maxHp < 0.65;
      return (
        (low && u.id === "hull" ? 200 : 0) +
        ({
          damage: 100,
          rate: 95,
          repair: 90,
          hull: 80,
          critpower: 70,
          crit: 65,
          armor: 60,
          chain: 50,
          burn: 50,
        }[u.id] || 10)
      );
    };
    const sorted = g.rewardChoices
      .map((u, i) => ({ u, i }))
      .sort((a, b) => rank(b.u) - rank(a.u));
    if (sorted.length) {
      const cards = g.overlay.cards || g.overlay.querySelectorAll("[data-up]");
      cards[sorted[0].i].onclick();
    } else document.querySelector("#service").onclick();
    return;
  }
  if (g.state === "map") {
    const ids = g.currentNode.next,
      low = g.player.hp / g.player.maxHp < 0.75;
    const rank = (id) => {
      const n = nodeById(g.dungeon, id);
      return n.type === "repair"
        ? low
          ? 100
          : 20
        : n.type === "treasure"
          ? 90
          : n.type === "shop"
            ? 70
            : n.type === "elite"
              ? 5
              : 40;
    };
    const id = [...ids].sort((a, b) => rank(b) - rank(a))[0];
    if (id) g.travelTo(id);
    return;
  }
  if (g.state === "event") {
    document.querySelector("#claim-event").onclick();
    return;
  }
  if (g.state === "shop") {
    if (g.player.hp < g.player.maxHp) buy(g, "heal");
    buy(g, "module");
    buy(g, "weapon");
    buy(g, "boost");
    g.markCleared();
    g.showMap(true);
    return;
  }
  if (g.state !== "playing") return;
  const p = g.player,
    enemies = g.enemies.filter((e) => e.hp > 0 && e.wind <= 0),
    visible = enemies.filter((e) => g.navigation.clear(p, e)),
    target = [...(visible.length ? visible : enemies)].sort(
      (a, b) => distance(p, a) - distance(p, b),
    )[0];
  if (target) {
    g.pointer.x = target.x;
    g.pointer.y = target.y;
    g.pointer.down = true;
  } else g.pointer.down = false;
  if (g.boss) g.player.weapon = "pulse";
  else if (enemies.length >= 3 && p.inventory.includes("arc")) p.weapon = "arc";
  else if (target?.type === 4 && p.inventory.includes("nova"))
    p.weapon = "nova";
  else if (
    target &&
    distance(p, target) < 220 &&
    p.inventory.includes("scatter")
  )
    p.weapon = "scatter";
  else if (p.inventory.includes("rail")) p.weapon = "rail";
  else p.weapon = "pulse";
  const angle = g.roomTime * 0.55,
    goal = g.boss
      ? { x: 640 + Math.cos(angle) * 385, y: 440 + Math.sin(angle) * 210 }
      : { x: 640 + Math.cos(angle) * 310, y: 400 + Math.sin(angle) * 220 };
  g.botNavCd = (g.botNavCd || 0) - 1 / 120;
  if (g.botNavCd <= 0) {
    g.botNav = g.navigation.find(p, goal, p.r);
    g.botNavCd = 0.5;
  }
  while (g.botNav?.length && distance(p, g.botNav[0]) < 24) g.botNav.shift();
  const waypoint = g.botNav?.[0] || goal;
  const risk = (point) => {
    if (
      point.x < 80 ||
      point.x > 1200 ||
      point.y < 100 ||
      point.y > 710 ||
      g.room.walls.some((w) => circleRect({ ...point, r: p.r + 3 }, w))
    )
      return 1e6;
    let value = distance(point, waypoint) * 0.25;
    for (const e of enemies) {
      const d = distance(point, e) - e.r;
      if (d < 85) value += (85 - d) * 18;
    }
    for (const b of g.bullets)
      if (
        b.enemy &&
        segmentCircle(
          b,
          { x: b.x + b.vx * 0.4, y: b.y + b.vy * 0.4 },
          point,
          p.r + b.r + 14,
        )
      )
        value += 1000;
    for (const h of g.hazards)
      if (h.state !== "idle" && circleRect({ ...point, r: p.r + 22 }, h))
        value += 1800;
    const b = g.boss,
      a = b?.attack;
    if (a && a.age + 0.3 >= a.warning) {
      for (const h of a.circles)
        if (distance(point, h) < h.r + p.r + 30) value += 2200;
      const elapsed = Math.max(0, a.age - a.warning),
        progress = Math.min(1, elapsed / a.duration);
      if (a.kind === "laser" || a.kind === "beams") {
        const angles = a.kind === "laser" ? [a.angle] : a.angles,
          turn = a.kind === "laser" ? 0.32 : 0.14;
        for (const base of angles)
          if (rayDistance(point, b, base + (progress - 0.5) * turn) < p.r + 38)
            value += 2500;
      }
      if (a.kind === "arms")
        for (let i = 0; i < 2; i++)
          if (
            rayDistance(point, b, a.angle + elapsed * 0.72 + i * Math.PI, 250) <
            p.r + 35
          )
            value += 2500;
    }
    return value;
  };
  let best = null;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      dx = Math.cos(a),
      dy = Math.sin(a),
      q = { x: p.x + dx * 52, y: p.y + dy * 52 },
      score = risk(q);
    if (!best || score < best.score) best = { dx, dy, score };
  }
  g.keys.clear();
  if (best.dx > 0.3) g.keys.add("KeyD");
  if (best.dx < -0.3) g.keys.add("KeyA");
  if (best.dy > 0.3) g.keys.add("KeyS");
  if (best.dy < -0.3) g.keys.add("KeyW");
  if (p.dashCd <= 0 && risk(p) > 450 && best.score < risk(p)) g.dash();
}
