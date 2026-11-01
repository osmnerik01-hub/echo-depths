import { distance, moveBody, clamp } from "./math.js";
export const enemyTypes = [
  {
    name: "TRACKER",
    r: 17,
    hp: 42,
    speed: 125,
    color: "#ff6c74",
    contact: 13,
    score: 100,
  },
  {
    name: "SENTRY",
    r: 17,
    hp: 55,
    speed: 90,
    color: "#be8aff",
    contact: 10,
    score: 150,
  },
  {
    name: "GUARDIAN",
    r: 23,
    hp: 110,
    speed: 62,
    color: "#ffb16c",
    contact: 20,
    score: 220,
  },
  {
    name: "SPECTER",
    r: 15,
    hp: 34,
    speed: 185,
    color: "#ce85ff",
    contact: 14,
    score: 180,
  },
  {
    name: "BULWARK",
    r: 27,
    hp: 240,
    speed: 48,
    color: "#ffc86d",
    contact: 23,
    score: 350,
  },
  {
    name: "SWARMER",
    r: 10,
    hp: 18,
    speed: 165,
    color: "#9aee86",
    contact: 7,
    score: 55,
  },
];
export function difficulty(room, p) {
  const power =
    Math.max(0, Math.log2(p.damage / 24)) +
    Object.values(p.upgrades || {}).reduce((a, b) => a + b, 0) * 0.035;
  return {
    hp: 1 + Math.min(1.8, (room - 1) * 0.075) + Math.min(0.25, power * 0.08),
    count: Math.min(22, 5 + room * 2),
    active: Math.min(12, 4 + Math.floor(room * 1.2)),
    interval: Math.max(0.8, 1.35 - room * 0.035),
    types:
      room === 1
        ? [0]
        : room === 2
          ? [0, 1]
          : room === 3
            ? [0, 1, 2]
            : room === 4
              ? [0, 1, 2, 3]
              : room === 5
                ? [0, 1, 2, 3, 5]
                : [0, 1, 2, 3, 4, 5],
  };
}
export function makeEnemy(type, pos, scale = 1, id = 0) {
  const d = enemyTypes[type];
  return {
    ...pos,
    id,
    type,
    r: d.r,
    hp: d.hp * scale,
    maxHp: d.hp * scale,
    angle: 0,
    cool: 1.2 + (id % 5) * 0.17,
    wind: 0.85,
    flash: 0,
    navCd: (id % 6) * 0.08,
    path: [],
    unreachable: 0,
    attack: null,
    charge: 0,
    burnTime: 0,
    burnDamage: 0,
    slowTime: 0,
    slow: 0,
  };
}
function steer(g, e, target, speed, dt, direct) {
  const nav = g.navigation;
  if (direct ?? nav.clear(e, target, e.r + 2)) {
    e.path = [];
    e.unreachable = 0;
  } else {
    e.navCd -= dt;
    if (e.navCd <= 0 && g.pathBudget > 0) {
      g.pathBudget--;
      e.path = nav.find(e, target, e.r);
      e.navCd = 0.55 + (e.id % 5) * 0.07;
    }
    while (e.path.length && distance(e, e.path[0]) < 10) e.path.shift();
    if (e.path.length) {
      target = e.path[0];
      e.unreachable = 0;
    } else {
      e.unreachable += dt;
      return;
    }
  }
  const d = distance(e, target);
  if (d > 3)
    moveBody(
      e,
      ((target.x - e.x) / d) * speed * dt,
      ((target.y - e.y) / d) * speed * dt,
      g.room.walls,
    );
}
function attack(g, e, kind, duration, angle = e.angle) {
  e.attack = { kind, time: duration, max: duration, angle };
  e.cool =
    kind === "pounce"
      ? 1.15
      : kind === "charge"
        ? 2.7
        : kind === "volley"
          ? 3.3
          : 2;
}
function releaseAttack(g, e, a) {
  if (a.kind === "charge" || a.kind === "pounce") {
    e.charge = a.kind === "pounce" ? 0.16 : 0.28;
    e.chargeSpeed = a.kind === "pounce" ? 430 : 610;
    e.chargeAngle = a.angle;
    return;
  }
  const n = a.kind === "volley" ? 5 : a.kind === "spread" ? 3 : 1;
  for (let i = 0; i < n; i++)
    g.shoot(e, a.angle + (i - (n - 1) / 2) * 0.21, true);
  g.audio.play("enemy");
  g.burst(
    e.x + Math.cos(a.angle) * 30,
    e.y + Math.sin(a.angle) * 30,
    enemyTypes[e.type].color,
    6,
  );
}
export function updateEnemies(g, dt) {
  const p = g.player;
  g.pathBudget = 1;
  for (const e of g.enemies) {
    if (e.bossId) continue;
    if (e.hp <= 0) continue;
    e.flash = Math.max(0, e.flash - dt);
    e.wind = Math.max(0, e.wind - dt);
    if (e.wind > 0) continue;
    if (e.burnTime > 0) {
      e.burnTime -= dt;
      g.combat.damage(e, e.burnDamage * dt, { status: true, color: "#ffaf70" });
      if (e.hp <= 0) continue;
    }
    e.slowTime = Math.max(0, e.slowTime - dt);
    e.cool -= dt;
    const d = distance(e, p),
      aim = Math.atan2(p.y - e.y, p.x - e.x),
      def = enemyTypes[e.type];
    // Bulwark turns slowly; flanking its shield remains possible.
    if (e.type === 4) {
      let da = Math.atan2(Math.sin(aim - e.angle), Math.cos(aim - e.angle));
      e.angle += clamp(da, -dt * 1.5, dt * 1.5);
    } else if (!e.attack && !e.charge) e.angle = aim;
    if (e.attack) {
      e.attack.time -= dt;
      if (e.attack.time <= 0) {
        releaseAttack(g, e, e.attack);
        e.attack = null;
      }
      continue;
    }
    if (e.charge > 0) {
      e.charge = Math.max(0, e.charge - dt);
      moveBody(
        e,
        Math.cos(e.chargeAngle) * e.chargeSpeed * dt,
        Math.sin(e.chargeAngle) * e.chargeSpeed * dt,
        g.room.walls,
      );
      if (e.type === 3) g.burst(e.x, e.y, "#c583ff", 1);
    } else {
      let target = p,
        speed = def.speed * (e.slowTime > 0 ? 1 - e.slow : 1);
      const sight = g.navigation.clear(e, p, e.r + 2);
      if (e.type === 1 && sight) {
        if (d < 260) {
          target = { x: e.x - Math.cos(aim) * 90, y: e.y - Math.sin(aim) * 90 };
          if (!g.navigation.clear(e, target, e.r + 2)) speed = 0;
        } else if (d < 370) speed = 0;
      }
      if (e.type === 3 && sight) {
        const a = aim + (e.id % 2 ? 1.05 : -1.05);
        target = { x: p.x - Math.cos(a) * 180, y: p.y - Math.sin(a) * 180 };
        if (!g.navigation.clear(e, target, e.r + 2)) target = p;
      }
      if (e.type === 5 && sight && d > 100) {
        const a = ((e.id % 8) * Math.PI) / 4;
        target = { x: p.x + Math.cos(a) * 70, y: p.y + Math.sin(a) * 70 };
        if (!g.navigation.clear(e, target, e.r + 2)) target = p;
      }
      if (speed)
        steer(g, e, target, speed, dt, target === p ? sight : undefined);
      if (e.cool <= 0 && sight) {
        if (e.type === 1) attack(g, e, "shot", 0.45, aim);
        if (e.type === 2) attack(g, e, "spread", 0.65, aim);
        if (e.type === 4 && d < 580) attack(g, e, "volley", 0.95, e.angle);
        if (e.type === 3 && d < 320) attack(g, e, "charge", 0.55, aim);
        if (e.type === 5 && d < 95) attack(g, e, "pounce", 0.28, aim);
      }
    }
    if (e.unreachable > 7) {
      const pos = g.findSpawn(e.type);
      if (pos) {
        e.x = pos.x;
        e.y = pos.y;
        e.path = [];
        e.wind = 1;
        e.unreachable = 0;
      } else {
        e.hp = 0;
        g.notice = "ERİŞİLEMEYEN TEHDİT DEVRE DIŞI";
      }
    }
    if (distance(e, p) < e.r + p.r + 2 && (e.type !== 5 || e.charge > 0))
      g.hurt(def.contact);
  }
  // At most 12 live enemies: a bounded pair pass costs less than another spatial index.
  for (let i = 0; i < g.enemies.length; i++)
    for (let j = i + 1; j < g.enemies.length; j++) {
      const a = g.enemies[i],
        b = g.enemies[j];
      if (a.bossId || b.bossId) continue;
      if (a.hp <= 0 || b.hp <= 0) continue;
      const dx = a.x - b.x,
        dy = a.y - b.y,
        wanted = a.r + b.r + 8;
      if (dx * dx + dy * dy >= wanted * wanted) continue;
      const d = Math.hypot(dx, dy);
      const angle = d ? Math.atan2(a.y - b.y, a.x - b.x) : (a.id + 1) * 2.4;
      const force = Math.min(100, (wanted - d) * 9) * dt;
      moveBody(
        a,
        Math.cos(angle) * force,
        Math.sin(angle) * force,
        g.room.walls,
      );
      moveBody(
        b,
        -Math.cos(angle) * force,
        -Math.sin(angle) * force,
        g.room.walls,
      );
    }
}
