import { distance, clamp, circleRect } from "./math.js";
import { Navigation } from "./navigation.js";
export function restoreArena(g) {
  if (!g.arenaBaseWalls) return;
  g.room.walls = g.arenaBaseWalls;
  g.arenaBaseWalls = null;
  g.navigation = new Navigation(g.room.walls);
}
export const bossDefinitions = [
  {
    id: "sentinel",
    name: "SENTINEL-01",
    title: "Güvenlik protokolü / 01",
    hp: 1600,
    r: 62,
    color: "#7afbe3",
    thresholds: [0.6, 0.28],
    patterns: ["laser", "radial", "slam"],
    sound: "sentinel",
  },
  {
    id: "tyrant",
    name: "THE IRON TYRANT",
    title: "Dökümhanenin son nöbetçisi",
    hp: 2400,
    r: 74,
    color: "#ffad68",
    thresholds: [0.55, 0.25],
    patterns: ["bombs", "arms", "crush", "slag"],
    sound: "tyrant",
  },
  {
    id: "hollow",
    name: "THE HOLLOW MIND",
    title: "Astral ana zekâ / sinyal bozuldu",
    hp: 3200,
    r: 58,
    color: "#e4a4ff",
    thresholds: [0.67, 0.34],
    patterns: ["spiral", "beams", "clones", "reshape"],
    sound: "hollow",
  },
];
export function bossPhase(b) {
  const ratio = b.hp / b.maxHp;
  return 1 + b.definition.thresholds.filter((t) => ratio <= t).length;
}
export function makeBoss(index, power = 1) {
  const d = bossDefinitions[index];
  return {
    id: "boss",
    type: 0,
    bossId: d.id,
    definition: d,
    x: 640,
    y: 280,
    r: d.r,
    hp: d.hp * power,
    maxHp: d.hp * power,
    angle: Math.PI / 2,
    phase: 1,
    phaseTime: 0,
    wind: 0,
    flash: 0,
    cool: 1.3,
    sequence: 0,
    attack: null,
    path: [],
    burnTime: 0,
    burnDamage: 0,
    slowTime: 0,
    slow: 0,
    deathHandled: false,
  };
}
export function beamEnd(b, angle, length = 1500) {
  return {
    x: b.x + Math.cos(angle) * length,
    y: b.y + Math.sin(angle) * length,
  };
}
export function rayDistance(p, a, angle, length = 1500) {
  const dx = Math.cos(angle),
    dy = Math.sin(angle),
    t = clamp((p.x - a.x) * dx + (p.y - a.y) * dy, 0, length);
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function bullet(g, b, angle, speed = 200) {
  if (g.bullets.length >= 220) return;
  g.bullets.push({
    x: b.x,
    y: b.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: 6,
    enemy: true,
    damage: 13,
    life: 5,
    color: b.definition.color,
  });
}
function circleAttack(x, y, r, warning = 1.1, active = 0.25) {
  return { x, y, r, warning, active, age: 0, exploded: false };
}
function begin(g, b) {
  const d = b.definition,
    kind = d.patterns[b.sequence++ % d.patterns.length],
    aim = Math.atan2(g.player.y - b.y, g.player.x - b.x);
  const a = {
    kind,
    age: 0,
    warning: kind === "crush" ? 1.15 : 1.25,
    duration:
      kind === "laser" || kind === "beams"
        ? 1.35
        : kind === "arms"
          ? 2.4
          : kind === "spiral"
            ? 2
            : kind === "slag"
              ? 2.6
              : 0.35,
    angle: aim,
    tick: 0,
    circles: [],
    angles: [],
    clones: [],
  };
  if (kind === "radial")
    a.angles = Array.from(
      { length: 10 + b.phase * 2 },
      (_, i) => (i * Math.PI * 2) / (10 + b.phase * 2) + 0.16,
    );
  if (kind === "beams") a.angles = [aim, aim + 1.15, aim - 1.15];
  if (kind === "bombs" || kind === "slag")
    for (let i = 0; i < 3 + b.phase; i++) {
      const angle = i * 2.4 + b.sequence;
      const x = i === 0 ? g.player.x : 640 + Math.cos(angle) * (220 + i * 15),
        y = i === 0 ? g.player.y : 420 + Math.sin(angle) * 200;
      a.circles.push(
        circleAttack(
          clamp(x, 150, 1130),
          clamp(y, 160, 640),
          kind === "slag" ? 78 : 65,
        ),
      );
    }
  if (kind === "slam") a.circles = [circleAttack(b.x, b.y, 290, 1.25, 0.35)];
  if (kind === "crush") {
    const reach = Math.min(220, distance(g.player, b));
    a.circles = [
      circleAttack(
        clamp(b.x + Math.cos(aim) * reach, 160, 1120),
        clamp(b.y + Math.sin(aim) * reach, 170, 640),
        105,
        1.15,
        0.4,
      ),
    ];
  }
  if (kind === "clones") {
    a.clones = [
      { x: 300, y: 260 },
      { x: 980, y: 260 },
    ];
    a.angles = a.clones.map((c) =>
      Math.atan2(g.player.y - c.y, g.player.x - c.x),
    );
    a.duration = 2;
    if (b.phase === 3) {
      a.clones.push({ x: 640, y: 170 });
      a.angles = a.clones.map((c) =>
        Math.atan2(g.player.y - c.y, g.player.x - c.x),
      );
    }
  }
  if (kind === "reshape") {
    a.duration = 2.7;
    a.circles = [
      circleAttack(350, 440, 125, 1.25, 2.7),
      circleAttack(930, 440, 125, 1.25, 2.7),
    ];
  }
  b.attack = a;
  g.audio.play("warning");
}
export function updateBoss(g, dt) {
  const b = g.boss;
  if (!b || b.hp <= 0) return;
  b.flash = Math.max(0, b.flash - dt);
  const phase = bossPhase(b);
  if (phase !== b.phase) {
    restoreArena(g);
    b.phase = phase;
    b.phaseTime = 1.15;
    b.attack = null;
    b.cool = 1;
    g.bullets = g.bullets.filter((s) => !s.enemy);
    g.effects.push({
      kind: "phase",
      x: b.x,
      y: b.y,
      r: 230,
      color: b.definition.color,
      life: 1.1,
      max: 1.1,
    });
    g.shake = 9;
    g.audio.play("phase");
    g.notice = `${b.definition.name} / FAZ ${phase}`;
    g.noticeTime = 2;
  }
  if (b.phaseTime > 0) {
    b.phaseTime = Math.max(0, b.phaseTime - dt);
    return;
  }
  if (b.burnTime > 0) {
    const duration = Math.min(b.burnTime, dt);
    b.burnTime -= dt;
    g.combat.damage(b, b.burnDamage * duration, { status: true });
    if (b.hp <= 0) return;
  }
  b.angle = Math.atan2(g.player.y - b.y, g.player.x - b.x);
  if (distance(g.player, b) < g.player.r + b.r) g.hurt(18);
  if (g.finalized) return;
  if (!b.attack) {
    b.cool -= dt;
    if (b.cool <= 0) begin(g, b);
    return;
  }
  const a = b.attack,
    previous = a.age;
  a.age += dt;
  if (a.age < a.warning) return;
  const elapsed = a.age - a.warning,
    justFired = previous < a.warning;
  if (a.kind === "reshape" && justFired) {
    g.arenaBaseWalls = g.room.walls;
    const blocks = [
      { x: 310, y: 350, w: 80, h: 180 },
      { x: 890, y: 350, w: 80, h: 180 },
    ].filter((w) => !circleRect({ ...g.player, r: g.player.r + 20 }, w));
    g.room.walls = [...g.room.walls, ...blocks];
    g.navigation = new Navigation(g.room.walls);
  }
  if (justFired) {
    g.audio.play(b.definition.sound);
    g.shake = Math.max(g.shake, 4);
  }
  if (a.kind === "laser" || a.kind === "beams") {
    // The entire swept sector is previewed; rotation is slow and leaves most arena safe.
    const turn = a.kind === "laser" ? 0.32 : 0.14,
      angles = a.kind === "laser" ? [a.angle] : a.angles;
    for (const base of angles)
      if (
        rayDistance(g.player, b, base + (elapsed / a.duration - 0.5) * turn) <
        g.player.r + 10
      )
        g.hurt(18);
  }
  if (a.kind === "radial" && justFired)
    for (const angle of a.angles) bullet(g, b, angle, 180 + b.phase * 12);
  if (a.kind === "spiral") {
    a.tick -= dt;
    if (a.tick <= 0) {
      a.tick = 0.22 - b.phase * 0.02;
      const angle = elapsed * 2.2 + b.sequence;
      const streams = 2 + b.phase;
      for (let i = 0; i < streams; i++)
        bullet(g, b, angle + (i * Math.PI * 2) / streams, 180 + b.phase * 15);
    }
  }
  if (a.kind === "arms") {
    const angle = a.angle + elapsed * 0.72;
    for (let i = 0; i < 2; i++)
      if (rayDistance(g.player, b, angle + i * Math.PI, 235) < g.player.r + 15)
        g.hurt(19);
  }
  if (a.kind === "clones") {
    a.tick -= dt;
    if (a.tick <= 0) {
      a.tick = 0.65;
      for (let i = 0; i < a.clones.length; i++) {
        const c = a.clones[i];
        for (let j = -1; j <= 1; j++)
          bullet(
            g,
            { ...c, definition: b.definition },
            a.angles[i] + j * 0.22,
            195,
          );
      }
    }
  }
  for (const circle of a.circles) {
    circle.age = a.age;
    const active = a.age >= a.warning && a.age <= a.warning + a.duration;
    const hit =
      a.kind === "slam"
        ? Math.abs(
            distance(g.player, circle) -
              circle.r * Math.min(1, elapsed / a.duration),
          ) <
          g.player.r + 16
        : distance(g.player, circle) < g.player.r + circle.r;
    if (active && hit) g.hurt(a.kind === "crush" ? 24 : 16);
    if (justFired && !circle.exploded) {
      circle.exploded = true;
      g.burst(circle.x, circle.y, b.definition.color, 14);
    }
  }
  if (a.age >= a.warning + a.duration) {
    restoreArena(g);
    b.attack = null;
    b.cool = Math.max(0.6, 1.65 - (b.phase - 1) * 0.35);
  }
}
