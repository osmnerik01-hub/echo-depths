import { W, H } from "./rooms.js";
import { enemyTypes } from "./enemies.js";
import { weapons } from "./weapons.js";
import { biomes } from "./biomes.js";
import {
  drawDecor,
  drawAnimatedDecor,
  drawBoss,
  drawBossAttack,
} from "./world-renderer.js";
import { profiles, readQuality } from "./quality.js";
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.quality = profiles[readQuality()];
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.resize();
    canvas.addEventListener("contextlost", (e) => {
      e.preventDefault();
      this.contextLost = true;
    });
    canvas.addEventListener("contextrestored", () => {
      this.contextLost = false;
      this.resize();
    });
    window.addEventListener("resize", () => this.resize());
  }
  setQuality(id) {
    if (!profiles[id]) return false;
    this.quality = profiles[id];
    this.resize();
    return true;
  }
  resize() {
    this.width = innerWidth;
    this.height = innerHeight;
    this.dpr = Math.min(devicePixelRatio || 1, this.quality.dpr);
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.scale = Math.min(this.width / W, this.height / H);
    this.ox = (this.width - W * this.scale) / 2;
    this.oy = (this.height - H * this.scale) / 2;
    this.roomLayer = null;
    this.floor = null;
    this.vignette = null;
  }
  worldPoint(p) {
    return { x: (p.x - this.ox) / this.scale, y: (p.y - this.oy) / this.scale };
  }
  rect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }
  glow(x, y, r, color) {
    if (r <= 0 || !this.quality.glow) return;
    const c = this.ctx,
      gradient = c.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "transparent");
    const alpha = Number.isFinite(c.globalAlpha) ? c.globalAlpha : 1;
    c.globalAlpha = alpha * (this.quality.id === "MEDIUM" ? 0.7 : 1);
    c.fillStyle = gradient;
    c.fillRect(x - r, y - r, r * 2, r * 2);
    c.globalAlpha = alpha;
  }
  makeFloor(biome = 0) {
    const theme = biomes[biome];
    this.floorBiome = biome;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const x = c.getContext("2d");
    x.fillStyle = theme.floor;
    x.fillRect(0, 0, W, H);
    for (let y = 40; y < H - 40; y += 48)
      for (let i = 40; i < W - 40; i += 48) {
        x.fillStyle = (i + y) % 96 === 0 ? theme.tile : theme.floor;
        x.fillRect(i + 1, y + 1, 46, 46);
        x.fillStyle = "#1a2a35";
        x.fillRect(i + 3, y + 3, 2, 2);
        if (Math.random() < 0.12) {
          x.fillStyle = "#172733";
          x.fillRect(i + 9, y + 33, 24, 1);
        }
      }
    x.strokeStyle = "#213442";
    x.lineWidth = 3;
    x.strokeRect(64, 64, W - 128, H - 128);
    x.strokeStyle = "#173b42";
    x.strokeRect(74, 74, W - 148, H - 148);
    for (let i = 100; i < W - 80; i += 85) {
      x.fillStyle = "#27383d";
      x.fillRect(i, 66, 22, 3);
      x.fillRect(i, H - 69, 22, 3);
    }
    x.font = "10px monospace";
    x.fillStyle = "#36505e";
    x.fillText("ASTRAL // SUBSURFACE RESEARCH DIVISION", 95, H - 85);
    x.save();
    x.translate(W - 94, 130);
    x.rotate(Math.PI / 2);
    x.fillText("CAUTION — AUTONOMOUS SECURITY ACTIVE", 0, 0);
    x.restore();
    this.floor = c;
  }
  robot(e, player, t) {
    if (!player && e.type >= 3) {
      this.specialRobot(e, t);
      return;
    }
    const c = this.ctx;
    const color = player
      ? weapons[e.weapon]?.color || "#7bfce2"
      : enemyTypes[e.type].color;
    c.save();
    c.translate(e.x, e.y);
    if (e.wind > 0 && !player) {
      c.globalAlpha = 0.4 + Math.sin(t * 20) * 0.2;
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(0, 0, 30 + e.wind * 20, 0, Math.PI * 2);
      c.stroke();
    }
    this.glow(
      0,
      3,
      player ? 65 : 45,
      player ? "#26b9ac24" : e.type === 1 ? "#8d48ef25" : "#ff68431b",
    );
    c.fillStyle = "#0007";
    c.beginPath();
    c.ellipse(0, 14, e.r + 7, 10, 0, 0, Math.PI * 2);
    if (this.quality.shadows) c.fill();
    if (player && e.inv > 0 && Math.floor(t * 22) % 2) c.globalAlpha = 0.55;
    if (player) {
      c.strokeStyle = "#49dbc6";
      c.lineWidth = 1;
      c.beginPath();
      c.arc(0, 0, 23, 0, Math.PI * 2);
      c.stroke();
    }
    c.rotate(e.angle);
    const heavy = !player && e.type === 2,
      s = heavy ? 1.25 : 1;
    c.scale(s, s);
    const walk = Math.sin(t * (player ? 18 : 12)) * 2;
    this.rect(-15, -21, 25, 9, "#172633");
    this.rect(-15, 12, 25, 9, "#172633");
    this.rect(-12, -23 + walk, 18, 5, "#42606b");
    this.rect(-12, 18 - walk, 18, 5, "#42606b");
    for (let i = -10; i < 9; i += 6) {
      this.rect(i, -20, 3, 6, "#0a111a");
      this.rect(i, 14, 3, 6, "#0a111a");
    }
    if (player) {
      // Dark armor and a fixed core keep the silhouette independent of the weapon.
      this.rect(-20, -15, 32, 30, "#071018");
      this.rect(-18, -14, 28, 28, e.flash > 0 ? "#fff" : "#354550");
      this.rect(-15, -11, 24, 22, "#1c2b35");
      this.rect(-14, -10, 2, 20, "#526570");
      for (const y of [-21, 12]) {
        this.rect(-12, y, 25, 9, "#080f17");
        this.rect(-10, y + 1, 21, 7, e.flash > 0 ? "#fff" : "#354550");
        this.rect(-9, y + 1, 18, 2, "#607580");
        this.rect(7, y + 3, 4, 4, "#1a2731");
      }
      this.rect(-12, -8, 15, 16, "#080f17");
      this.rect(-10, -6, 11, 12, "#21645f");
      this.rect(-8, -4, 7, 8, "#49dbc6");
      this.rect(-7, -3, 3, 5, "#bdfff0");
    } else {
      this.rect(-19, -13, 29, 26, "#071018");
      this.rect(-17, -14, 27, 25, e.flash > 0 ? "#fff" : "#496271");
      this.rect(-14, -11, 24, 21, player ? "#a3c5c9" : "#566278");
      this.rect(-13, -8, 17, 17, player ? "#263c47" : "#252e42");
      this.rect(-10, -6, 11, 11, "#101d2c");
      this.rect(-8, -4, 7, 7, color);
      this.rect(-17, -12, 3, 5, color);
      this.rect(-17, 6, 3, 5, color);
    }
    this.rect(4, -10, 10, 20, "#1b303c");
    this.rect(11, -8, 6, 16, color);
    this.rect(17, -5, 16, 10, "#101923");
    this.rect(18, -4, 13, 3, "#75939f");
    this.rect(29, -4, 5, 8, color);
    if (player && e.weapon === "scatter") {
      this.rect(23, -9, 10, 4, color);
      this.rect(23, 5, 10, 4, color);
    }
    if (player && e.weapon === "rail") {
      this.rect(24, -3, 22, 2, color);
      this.rect(24, 2, 22, 2, color);
    }
    if (player && e.weapon === "nova") {
      this.rect(22, -8, 12, 16, "#7a6358");
      this.rect(33, -7, 3, 14, color);
    }
    if (player && e.weapon === "arc") {
      this.rect(23, -9, 14, 3, color);
      this.rect(23, 6, 14, 3, color);
    }
    this.rect(-9, -16, 7, 3, "#b6d0d1");
    if (!player && e.type === 1) {
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(-3, 0, 25, -1.3, 1.3);
      c.stroke();
    }
    c.restore();
    if (!player && e.hp < e.maxHp) {
      this.rect(e.x - 20, e.y - 34, 40, 3, "#263140");
      this.rect(e.x - 20, e.y - 34, (40 * e.hp) / e.maxHp, 3, color);
    }
  }
  specialRobot(e, t) {
    const c = this.ctx,
      col = enemyTypes[e.type].color;
    c.save();
    c.translate(e.x, e.y);
    c.rotate(e.angle);
    if (e.wind > 0) c.globalAlpha = 0.35 + Math.sin(t * 20) * 0.2;
    this.glow(
      0,
      0,
      e.type === 4 ? 60 : 42,
      e.type === 5 ? "#8aff6720" : "#b16cff28",
    );
    c.fillStyle = "#0008";
    c.beginPath();
    c.ellipse(0, 12, e.r + 7, 9, 0, 0, Math.PI * 2);
    if (this.quality.shadows) c.fill();
    if (e.type === 3) {
      for (let i = 3; i > 0; i--) {
        c.globalAlpha = 0.1 * i;
        this.rect(-20 - i * 8, -10, 12, 20, col);
      }
      c.globalAlpha = e.wind > 0 ? 0.45 : 1;
      c.fillStyle = e.flash > 0 ? "#fff" : "#302b50";
      c.beginPath();
      c.moveTo(24, 0);
      c.lineTo(-7, -17);
      c.lineTo(-21, -10);
      c.lineTo(-13, 0);
      c.lineTo(-21, 10);
      c.lineTo(-7, 17);
      c.closePath();
      c.fill();
      this.rect(-8, -8, 15, 16, "#69608b");
      this.rect(3, -5, 12, 10, col);
      this.rect(-15, -17, 12, 4, col);
      this.rect(-15, 13, 12, 4, col);
      this.rect(-7, -3, 6, 6, "#edf0ff");
    } else if (e.type === 4) {
      this.rect(-26, -29, 33, 13, "#293d4d");
      this.rect(-26, 16, 33, 13, "#293d4d");
      for (let i = -22; i < 7; i += 7) {
        this.rect(i, -28, 3, 11, "#58707c");
        this.rect(i, 18, 3, 10, "#58707c");
      }
      this.rect(-23, -22, 39, 44, e.flash > 0 ? "#fff" : "#8b805f");
      this.rect(-20, -18, 31, 36, "#344251");
      this.rect(-13, -12, 17, 24, "#121e2c");
      this.rect(-8, -7, 9, 14, col);
      this.rect(10, -17, 17, 34, "#6a7070");
      this.rect(24, -14, 10, 28, "#233743");
      for (let i = -10; i <= 10; i += 10) this.rect(29, i - 2, 9, 4, col);
      c.strokeStyle = col;
      c.lineWidth = 5;
      c.beginPath();
      c.arc(0, 0, 36, -Math.PI / 3, Math.PI / 3);
      c.stroke();
      c.strokeStyle = "#ffea9c33";
      c.lineWidth = 12;
      c.stroke();
    } else {
      const flutter =
        Math.sin(t * (e.attack ? 40 : 22) + e.id) * (e.attack ? 6 : 3);
      c.strokeStyle = "#6b9a79";
      c.lineWidth = 3;
      for (const y of [-1, 1]) {
        c.beginPath();
        c.moveTo(-5, y * 6);
        c.lineTo(-13, y * (11 + flutter));
        c.lineTo(-17, y * 7);
        c.stroke();
      }
      this.rect(-10, -8, 18, 16, e.flash > 0 ? "#fff" : "#344d4d");
      this.rect(-6, -5, 15, 10, "#6b977d");
      this.rect(5, -4, 8, 8, col);
      this.rect(-9, -4, 5, 8, "#162c33");
      this.rect(10, -2, 5, 4, "#eaffbc");
    }
    c.restore();
    if (e.hp < e.maxHp) {
      this.rect(e.x - 20, e.y - e.r - 12, 40, 3, "#263140");
      this.rect(e.x - 20, e.y - e.r - 12, (40 * e.hp) / e.maxHp, 3, col);
    }
  }
  telegraph(e) {
    const c = this.ctx;
    if (e.wind > 0) {
      c.save();
      c.strokeStyle = enemyTypes[e.type].color;
      c.globalAlpha = 0.6;
      c.setLineDash([4, 5]);
      c.beginPath();
      c.arc(e.x, e.y, e.r + 13, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    if (!e.attack) return;
    const a = e.attack;
    c.save();
    c.translate(e.x, e.y);
    c.rotate(a.angle);
    c.globalAlpha = 0.3 + (1 - a.time / a.max) * 0.5;
    c.strokeStyle = enemyTypes[e.type].color;
    c.lineWidth = 2;
    c.setLineDash([6, 7]);
    c.beginPath();
    c.moveTo(30, 0);
    c.lineTo(a.kind === "pounce" ? 85 : a.kind === "charge" ? 190 : 430, 0);
    c.stroke();
    c.setLineDash([]);
    c.lineWidth = 3;
    c.beginPath();
    c.arc(
      0,
      0,
      e.r + 9,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * (1 - a.time / a.max),
    );
    c.stroke();
    if (a.kind === "volley") {
      c.beginPath();
      c.moveTo(30, 0);
      c.lineTo(310, -140);
      c.moveTo(30, 0);
      c.lineTo(310, 140);
      c.stroke();
    }
    c.restore();
  }
  projectile(b, t) {
    const c = this.ctx,
      col = b.color || "#ff8d80";
    c.save();
    c.strokeStyle = col;
    c.fillStyle = col;
    c.lineWidth = b.r * 1.2;
    c.beginPath();
    c.moveTo(
      b.x - b.vx * (b.weapon === "rail" ? 0.055 : 0.018),
      b.y - b.vy * (b.weapon === "rail" ? 0.055 : 0.018),
    );
    c.lineTo(b.x, b.y);
    c.stroke();
    if (b.weapon === "nova") {
      this.glow(b.x, b.y, 30, "#ff885a44");
      c.lineWidth = 2;
      c.beginPath();
      c.arc(b.x, b.y, 10, t * 5, t * 5 + 4.5);
      c.stroke();
      this.rect(b.x - 4, b.y - 4, 8, 8, "#fff3c3");
    } else if (b.weapon === "arc") {
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(b.x - 12, b.y - 7);
      c.lineTo(b.x + 3, b.y - 2);
      c.lineTo(b.x - 6, b.y + 6);
      c.lineTo(b.x + 10, b.y + 2);
      c.stroke();
    } else this.rect(b.x - 2, b.y - 2, 4, 4, "#fff");
    c.restore();
  }
  effect(f, t) {
    const c = this.ctx,
      k = 1 - f.life / f.max;
    c.save();
    c.globalAlpha = 1 - k;
    c.strokeStyle = f.color;
    c.fillStyle = f.color;
    if (["bossDeath", "phase"].includes(f.kind)) {
      c.lineWidth = f.kind === "bossDeath" ? 6 : 3;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.arc(f.x, f.y, f.r * (k * 0.8 + 0.1 + i * 0.1), 0, Math.PI * 2);
        c.stroke();
      }
      this.glow(f.x, f.y, Math.max(10, f.r * (1 - k)), f.color + "33");
    }
    if (f.kind === "arc") {
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(f.x, f.y);
      for (let i = 1; i < 7; i++) {
        const s = i / 7,
          off = Math.sin(i * 9 + (f.seed || 0)) * 12;
        c.lineTo(f.x + (f.tx - f.x) * s + off, f.y + (f.ty - f.y) * s - off);
      }
      c.lineTo(f.tx, f.ty);
      c.stroke();
    }
    if (f.kind === "explosion") {
      const r = f.r * (0.3 + k * 0.7);
      c.lineWidth = 3 * (1 - k) + 1;
      c.beginPath();
      c.arc(f.x, f.y, r, 0, Math.PI * 2);
      c.stroke();
      this.glow(f.x, f.y, r, "#ff9d5b23");
      c.lineWidth = 1;
      c.beginPath();
      c.arc(f.x, f.y, r * 0.7, 0, Math.PI * 2);
      c.stroke();
    }
    if (f.kind === "death") {
      c.translate(f.x, f.y);
      c.rotate(f.angle + k);
      c.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        c.save();
        c.rotate((i * Math.PI) / 2);
        c.strokeRect(f.r * k + 5, -7, 10, 14);
        c.restore();
      }
      c.beginPath();
      c.arc(0, 0, f.r + k * 28, 0, Math.PI * 2);
      c.stroke();
    }
    if (f.kind === "muzzle") {
      c.translate(f.x, f.y);
      c.rotate(f.angle);
      c.beginPath();
      c.moveTo(-4, -8);
      c.lineTo(f.r, 0);
      c.lineTo(-4, 8);
      c.lineTo(5, 0);
      c.closePath();
      c.fill();
      this.glow(0, 0, f.r * 1.6, f.color + "44");
    }
    c.restore();
  }
  staticRoom(g) {
    if (
      this.roomLayer &&
      this.layerWalls === g.room.walls &&
      this.layerRoom === g.roomIndex &&
      this.layerBiome === g.biomeIndex
    )
      return;
    if (!this.floor || this.floorBiome !== (g.biomeIndex || 0))
      this.makeFloor(g.biomeIndex || 0);
    const layer = document.createElement("canvas"),
      resolution = this.dpr * this.scale;
    layer.width = Math.ceil(W * resolution);
    layer.height = Math.ceil(H * resolution);
    const previous = this.ctx;
    this.ctx = layer.getContext("2d", { alpha: false });
    this.ctx.setTransform(resolution, 0, 0, resolution, 0, 0);
    this.ctx.drawImage(this.floor, 0, 0);
    drawDecor(this, g, true);
    this.glow(220, 150, 300, "#153b512e");
    this.glow(1100, 650, 300, "#50346a20");
    for (const w of g.room.walls) {
      this.rect(w.x + 7, w.y + 12, w.w, w.h, "#0007");
      this.rect(w.x, w.y, w.w, w.h, "#070e17");
      this.rect(w.x + 3, w.y + 3, w.w - 6, w.h - 6, "#22313e");
      this.rect(
        w.x + 6,
        w.y + 5,
        w.w - 12,
        w.h - 14,
        biomes[g.biomeIndex || 0].wall,
      );
      this.rect(w.x + 8, w.y + w.h - 10, w.w - 16, 4, "#314656");
      if (w.w > 70 && w.h > 55) {
        for (let i = 12; i < w.w - 12; i += 20) {
          this.rect(w.x + i, w.y + 15, 8, w.h - 42, "#0c1723");
          this.rect(w.x + i, w.y + 16, 2, w.h - 44, "#344653");
        }
        this.rect(w.x + 10, w.y + w.h - 22, w.w - 20, 3, "#ba814c");
        this.rect(w.x + 10, w.y + 7, 20, 3, "#71eed4");
        this.glow(w.x + 20, w.y, 45, "#52ffcc17");
      }
    }

    this.rect(W / 2 - 50, 18, 100, 13, "#132d37");
    this.glow(W / 2, 40, 90, "#57f4d922");
    const c = this.ctx;
    c.strokeStyle = "#27414c";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(640, 400, 73, 0, Math.PI * 2);
    c.stroke();
    c.font = "10px monospace";
    c.fillStyle = "#3d6570";
    c.textAlign = "center";
    c.fillText(
      "E C H O  /  S E C T O R  " + String(g.roomIndex || 1).padStart(2, "0"),
      640,
      503,
    );
    this.ctx = previous;
    this.roomLayer = layer;
    this.layerWalls = g.room.walls;
    this.layerRoom = g.roomIndex;
    this.layerBiome = g.biomeIndex;
  }
  draw(g) {
    if (this.contextLost) return;
    const c = this.ctx,
      t = g.time;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.rect(0, 0, this.width, this.height, "#040911");
    c.save();
    c.translate(
      this.ox +
        (Math.random() - 0.5) * Math.min(8, g.shake) * this.quality.shake,
      this.oy +
        (Math.random() - 0.5) * Math.min(8, g.shake) * this.quality.shake,
    );
    c.scale(this.scale, this.scale);
    if (g.state === "bossIntro") {
      const zoom = 1 + 0.12 * Math.sin((g.introTime / g.introMax) * Math.PI);
      c.translate(640, 400);
      c.scale(zoom, zoom);
      c.translate(-640, -400);
    }
    this.staticRoom(g);
    c.drawImage(this.roomLayer, 0, 0, W, H);
    drawAnimatedDecor(this, g);
    const doorPulse = 0.5 + Math.sin(t * 2) * 0.25;
    this.rect(W / 2 - 44, 21, 88, 3, `rgba(103,247,219,${doorPulse})`);
    c.save();
    c.strokeStyle = "#27414c";
    c.lineWidth = 2;
    c.setLineDash([8, 20]);
    c.beginPath();
    c.arc(640, 400, 86, t * 0.06, t * 0.06 + Math.PI * 2);
    c.stroke();
    c.restore();
    drawBossAttack(this, g.boss);
    for (const e of g.enemies) if (!e.bossId) this.telegraph(e);
    for (const e of g.enemies) {
      if (e.bossId) drawBoss(this, e, t);
      else this.robot(e, false, t);
    }

    for (const b of g.bullets)
      if (b.x >= -30 && b.x <= W + 30 && b.y >= -30 && b.y <= H + 30)
        this.projectile(b, t);
    for (const fx of g.effects) this.effect(fx, t);
    for (const p of g.particles) {
      c.globalAlpha = Math.max(0, p.life / p.max);
      if (p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H)
        this.rect(p.x, p.y, p.size, p.size, p.color);
    }
    c.globalAlpha = 1;
    if (g.state !== "dead") this.robot(g.player, true, t);
    c.textAlign = "center";
    for (const n of g.numbers) {
      c.globalAlpha = Math.min(1, n.life * 3);
      c.font = n.crit ? "bold 19px monospace" : "12px monospace";
      c.strokeStyle = "#08111b";
      c.lineWidth = 3;
      c.strokeText((n.crit ? "CRIT " : "") + n.text, n.x, n.y);
      c.fillStyle = n.crit ? "#ffeaa2" : n.color;
      c.fillText((n.crit ? "CRIT " : "") + n.text, n.x, n.y);
    }
    c.globalAlpha = 1;

    if (g.state === "playing") {
      const a = this.worldPoint(g.pointer);
      c.strokeStyle = "#9ffff0";
      c.lineWidth = 1;
      c.beginPath();
      c.arc(a.x, a.y, 9, 0, Math.PI * 2);
      c.stroke();
      for (const [x, y] of [
        [0, -14],
        [0, 10],
        [-14, 0],
        [10, 0],
      ])
        this.rect(
          a.x + x,
          a.y + y,
          x === 0 ? 1 : 4,
          x === 0 ? 4 : 1,
          "#9ffff0",
        );
    }
    c.restore();
    if (!this.vignette) {
      this.vignette = document.createElement("canvas");
      this.vignette.width = this.width;
      this.vignette.height = this.height;
      const vc = this.vignette.getContext("2d");
      const v = vc.createRadialGradient(
        this.width / 2,
        this.height / 2,
        this.height * 0.2,
        this.width / 2,
        this.height / 2,
        this.width * 0.65,
      );
      v.addColorStop(0, "transparent");
      v.addColorStop(1, "#01050bd9");
      vc.fillStyle = v;
      vc.fillRect(0, 0, this.width, this.height);
    }
    c.globalAlpha = this.quality.screenEffects;
    c.drawImage(this.vignette, 0, 0, this.width, this.height);
    c.globalAlpha = 1;
    if (g.state === "playing" && g.player.hp / g.player.maxHp < 0.35) {
      const low = c.createRadialGradient(
        this.width / 2,
        this.height / 2,
        this.height * 0.3,
        this.width / 2,
        this.height / 2,
        this.width * 0.65,
      );
      low.addColorStop(0, "transparent");
      low.addColorStop(1, `rgba(190,35,55,${0.13 + Math.sin(t * 3) * 0.04})`);
      c.fillStyle = low;
      c.fillRect(0, 0, this.width, this.height);
    }
    if (g.noticeTime > 0 && g.state === "playing") {
      c.textAlign = "center";
      c.font = "12px monospace";
      c.fillStyle = "#b1d9d6";
      c.fillText(g.notice, this.width / 2, this.height - 60);
    }
    if (g.flash) {
      c.fillStyle = `rgba(255,60,60,${g.flash * 0.65 * this.quality.screenEffects})`;
      c.fillRect(0, 0, this.width, this.height);
    }
    if (g.state === "bossIntro") {
      this.rect(0, 0, this.width, 50, "#03060b");
      this.rect(0, this.height - 70, this.width, 70, "#03060b");
      c.textAlign = "center";
      c.font = "bold 34px monospace";
      c.fillStyle = g.boss.definition.color;
      c.fillText(g.boss.definition.name, this.width / 2, this.height * 0.77);
      c.font = "12px monospace";
      c.fillText(
        g.boss.definition.title,
        this.width / 2,
        this.height * 0.77 + 28,
      );
    }
    if (
      g.state === "transition" ||
      g.state === "biomeTransition" ||
      g.transition > 0
    ) {
      const alpha =
        g.state === "transition"
          ? Math.min(1, 1 - g.transitionTime / 0.4)
          : g.state === "biomeTransition"
            ? 0.92
            : Math.min(0.9, g.transition * 2);
      c.fillStyle = `rgba(3,6,13,${alpha})`;
      c.fillRect(0, 0, this.width, this.height);
      if (g.state === "biomeTransition") {
        c.textAlign = "center";
        c.font = "24px monospace";
        c.fillStyle = biomes[g.pendingBiome].accent;
        c.fillText(
          biomes[g.pendingBiome].name,
          this.width / 2,
          this.height / 2,
        );
      }
    }
    if (g.state === "victory") {
      const pulse = 0.4 + Math.sin(t) * 0.1;
      this.glow(
        this.width * 0.8,
        this.height * 0.5,
        this.height * 0.5,
        `rgba(120,255,220,${pulse * 0.2})`,
      );
      c.strokeStyle = "#7bfce344";
      c.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        c.beginPath();
        c.arc(
          this.width * 0.8,
          this.height * 0.5,
          50 + i * 35 + Math.sin(t) * 10,
          0,
          Math.PI * 2,
        );
        c.stroke();
      }
    }
    if (g.state === "menu") {
      c.fillStyle = "#78f9df08";
      for (let i = 0; i < 35; i++) {
        const x = (i * 173 + t * (8 + (i % 5))) % this.width,
          y = (i * 87 + Math.sin(t + i) * 20) % this.height;
        c.fillRect(x, y, 2, 2);
      }
    }
  }
}
