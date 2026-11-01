import { Renderer } from "../src/renderer.js";
import { profiles } from "../src/quality.js";
import { drawBoss } from "../src/world-renderer.js";
import { makeBoss } from "../src/bosses.js";
export const sceneCounts = {
  empty: { enemies: 0, bullets: 0, particles: 0, lights: 2 },
  normal: { enemies: 6, bullets: 24, particles: 60, lights: 8 },
  crowd: { enemies: 12, bullets: 80, particles: 180, lights: 14 },
  boss: { enemies: 1, bullets: 120, particles: 240, lights: 10 },
};
export function createAssets() {
  const r = Object.create(Renderer.prototype);
  r.quality = profiles.HIGH;
  r.dpr = 2;
  r.scale = 1;
  r.ctx = document.createElement("canvas").getContext("2d");
  const previous = Math.random;
  let seed = 75;
  Math.random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  try {
    r.staticRoom({
      time: 0,
      roomIndex: 1,
      biomeIndex: 0,
      room: {
        walls: [
          { x: 0, y: 0, w: 1280, h: 40 },
          { x: 0, y: 760, w: 1280, h: 40 },
          { x: 0, y: 40, w: 40, h: 720 },
          { x: 1240, y: 40, w: 40, h: 720 },
          { x: 250, y: 240, w: 110, h: 70 },
          { x: 930, y: 500, w: 110, h: 70 },
        ],
      },
    });
  } finally {
    Math.random = previous;
  }
  const atlas = document.createElement("canvas");
  atlas.width = atlas.height = 2048;
  const c = atlas.getContext("2d");
  c.scale(2, 2);
  r.ctx = c;
  const regions = {
    room: {
      texture: "background",
      x: 0,
      y: 0,
      w: r.roomLayer.width,
      h: r.roomLayer.height,
    },
  };
  for (let i = 0; i < 7; i++) {
    const x = i * 128,
      y = 0;
    c.save();
    c.beginPath();
    c.rect(x, 0, 128, 128);
    c.clip();
    r.robot(
      {
        x: x + 64,
        y: 64,
        type: i % 6,
        weapon: "pulse",
        r: 16,
        angle: 0,
        wind: 0,
        inv: 0,
        hp: 100,
        maxHp: 100,
        flash: 0,
      },
      i === 6,
      0,
    );
    c.restore();
    regions["actor" + i] = {
      texture: "atlas",
      x: x * 2,
      y: y * 2,
      w: 256,
      h: 256,
    };
  }
  const b = makeBoss(2);
  b.x = 128;
  b.y = 384;
  b.phase = 3;
  drawBoss(r, b, 0);
  regions.boss = { texture: "atlas", x: 0, y: 512, w: 512, h: 512 };
  for (const [name, x, color] of [
    ["glow", 320, "#60fcdc"],
    ["purple", 448, "#c387ff"],
    ["particle", 576, "#8cfce0"],
    ["bullet", 704, "#ffc08c"],
  ]) {
    const y = 320;
    const grad = c.createRadialGradient(x, y, 0, x, y, 60);
    grad.addColorStop(0, color + (name === "particle" ? "ff" : "66"));
    grad.addColorStop(0.25, color + "44");
    grad.addColorStop(1, color + "00");
    c.fillStyle = grad;
    c.fillRect(x - 64, y - 64, 128, 128);
    if (name === "bullet") {
      c.fillStyle = color;
      c.fillRect(x - 18, y - 2, 36, 4);
    }
    if (name === "particle") {
      c.fillStyle = color;
      c.fillRect(x - 3, y - 3, 6, 6);
    }
    regions[name] = {
      texture: "atlas",
      x: (x - 64) * 2,
      y: (y - 64) * 2,
      w: 256,
      h: 256,
    };
  }
  return { background: r.roomLayer, atlas, regions };
}
export function makeScene(name) {
  const counts = sceneCounts[name] || sceneCounts.normal,
    items = [];
  const add = (sprite, x, y, w, h, alpha = 1) => {
    items.push({ sprite, x, y, w, h, alpha, angle: 0 });
  };
  add("room", 640, 400, 1280, 800);
  // A separate translucent lighting layer, shared by both backends.
  add("glow", 220, 150, 480, 480, 0.4);
  add("purple", 1050, 650, 440, 440, 0.35);
  for (let i = 0; i < counts.lights; i++)
    add(
      i % 2 ? "glow" : "purple",
      130 + ((i * 193) % 1020),
      120 + ((i * 137) % 560),
      150,
      150,
      0.45,
    );
  for (let i = 0; i < counts.enemies; i++)
    add(
      name === "boss" ? "boss" : "actor" + (i % 6),
      160 + ((i * 173) % 960),
      name === "boss" ? 280 : 180 + ((i * 89) % 410),
      name === "boss" ? 256 : 128,
      name === "boss" ? 256 : 128,
    );
  for (let i = 0; i < counts.bullets; i++)
    add("bullet", 100 + ((i * 73) % 1080), 100 + ((i * 131) % 600), 48, 48);
  for (let i = 0; i < counts.particles; i++)
    add(
      "particle",
      70 + ((i * 79) % 1140),
      80 + ((i * 43) % 640),
      12 + (i % 5) * 3,
      12 + (i % 5) * 3,
      0.3 + (i % 7) / 10,
    );
  add("actor6", 640, 610, 128, 128);
  const origins = items.map((p) => ({ x: p.x, y: p.y }));
  return {
    counts,
    items,
    camera: { x: 640, y: 400, zoom: 1, angle: 0 },
    update(t) {
      this.camera.x = 640 + Math.sin(t * 0.3) * 3;
      this.camera.y = 400 + Math.cos(t * 0.3) * 2;
      this.camera.zoom = 1.005;
      this.camera.angle = Math.sin(t * 0.2) * 0.002;
      for (let i = 1; i < items.length; i++) {
        const p = items[i];
        p.x = origins[i].x + Math.sin(t * 1.5 + i) * 3;
        p.y = origins[i].y + Math.cos(t + i) * 3;
        if (p.sprite.startsWith("actor") || p.sprite === "bullet")
          p.angle = Math.sin(t + i) * 0.6;
      }
    },
  };
}
