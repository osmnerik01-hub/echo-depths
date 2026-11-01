import { biomes } from "./biomes.js";
export function drawDecor(r, g) {
  const c = r.ctx,
    t = g.time,
    b = biomes[g.biomeIndex || 0];
  c.save();
  if (b.id === "labs") {
    for (const [x, y] of [
      [100, 110],
      [1040, 630],
    ]) {
      r.rect(x, y, 135, 35, "#243743");
      r.rect(x + 4, y + 3, 127, 26, "#111e2b");
      r.rect(x + 12, y - 42, 72, 38, "#173947");
      r.rect(x + 17, y - 37, 62, 26, "#214b59");
      c.strokeStyle = "#7ef7df88";
      c.lineWidth = 1;
      c.beginPath();
      for (let i = 0; i < 8; i++) {
        const px = x + 20 + i * 8,
          py = y - 22 + Math.sin(t * 2 + i) * 7;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke();
      for (let i = 0; i < 5; i++)
        r.rect(x + 90 + i * 5, y + 9, 2, 7, i % 2 ? "#6dedd1" : "#3a6c7d");
      r.glow(x + 45, y - 20, 90, "#55ffd514");
    }
    for (let i = 0; i < 4; i++) {
      const x = 220 + i * 280,
        y = i % 2 ? 700 : 100;
      r.rect(x, y, 35, 8, "#35515c");
      if (Math.sin(t * 6 + i * 4) > 0.92) {
        c.strokeStyle = "#afffea";
        c.beginPath();
        c.moveTo(x + 15, y);
        c.lineTo(x + 22, y - 10);
        c.lineTo(x + 17, y - 15);
        c.stroke();
      }
    }
  } else if (b.id === "foundry") {
    for (const y of [90, 690]) {
      r.rect(120, y, 1040, 20, "#09090e");
      r.rect(125, y + 4, 1030, 11, "#b64222");
      for (let i = 0; i < 18; i++)
        r.rect(130 + i * 57 + Math.sin(t + i) * 4, y + 7, 30, 3, "#ffb759");
      r.glow(640, y, 200, "#ff652b19");
    }
    for (const x of [95, 1095]) {
      r.rect(x, 240, 80, 210, "#302a29");
      r.rect(x + 5, 245, 70, 200, "#171b20");
      const offset = Math.sin(t * 1.4) * 22;
      r.rect(x + 23, 265 + offset, 34, 110, "#5d5953");
      r.rect(x + 15, 370 + offset, 50, 25, "#b28150");
      for (let i = 0; i < 4; i++) {
        c.globalAlpha = 0.05 * (4 - i);
        r.glow(
          x + 40 + Math.sin(t + i) * 10,
          225 - ((t * 20 + i * 15) % 100),
          20 + i * 5,
          "#c5c8c955",
        );
      }
      c.globalAlpha = 1;
    }
  } else {
    c.strokeStyle = "#cb6cfb66";
    c.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const x = 100 + i * 180,
        y = i % 2 ? 690 : 110;
      c.beginPath();
      c.moveTo(x - 40, y);
      c.lineTo(x - 15, y - 10);
      c.lineTo(x + 5, y + 20);
      c.lineTo(x + 35, y + 5);
      c.stroke();
      r.glow(x, y, 65, "#e453fa17");
    }
    for (const [x, y] of [
      [120, 260],
      [1140, 510],
    ]) {
      c.save();
      c.translate(x, y);
      c.rotate(t * 0.13);
      c.strokeStyle = "#cc81fda0";
      c.lineWidth = 2;
      c.strokeRect(-25, -25, 50, 50);
      c.rotate(Math.PI / 4);
      c.strokeRect(-18, -18, 36, 36);
      c.restore();
    }
  }
  for (const h of g.hazards || []) {
    const warning = h.state === "warning",
      active = h.state === "active";
    r.rect(h.x, h.y, h.w, h.h, "#0b1019");
    c.fillStyle = active
      ? b.accent + "66"
      : warning
        ? b.accent + "25"
        : "#29303e";
    c.fillRect(h.x + 3, h.y + 3, h.w - 6, h.h - 6);
    c.strokeStyle = warning ? "#fff1ab" : b.accent;
    c.lineWidth = active ? 3 : 1;
    c.setLineDash(warning ? [5, 5] : []);
    c.strokeRect(h.x, h.y, h.w, h.h);
    c.setLineDash([]);
    for (let i = 8; i < h.w - 8; i += 14)
      r.rect(h.x + i, h.y + 7, 4, h.h - 14, active ? b.accent : "#36434c");
    if (warning || active) {
      c.font = "10px monospace";
      c.textAlign = "center";
      c.fillStyle = warning ? "#ffe4ac" : b.accent;
      c.fillText(warning ? "⚠ AKTİVASYON" : "TEHLİKE", h.x + h.w / 2, h.y - 9);
    }
  }
  c.restore();
}

function sector(c, b, angle, spread, length) {
  c.beginPath();
  c.moveTo(b.x, b.y);
  c.arc(b.x, b.y, length, angle - spread / 2, angle + spread / 2);
  c.closePath();
  c.fill();
}
export function drawBossAttack(r, b) {
  if (!b?.attack) return;
  const c = r.ctx,
    a = b.attack,
    color = b.definition.color,
    warning = a.age < a.warning,
    progress = Math.max(0, (a.age - a.warning) / a.duration);
  c.save();
  c.strokeStyle = color;
  c.fillStyle = color + (warning ? "19" : "27");
  c.lineCap = "round";
  if (a.kind === "laser" || a.kind === "beams") {
    const angles = a.kind === "laser" ? [a.angle] : a.angles,
      turn = a.kind === "laser" ? 0.32 : 0.14;
    for (const angle of angles) {
      if (warning) {
        sector(c, b, angle, turn + 0.025, 1500);
        c.setLineDash([9, 8]);
        c.lineWidth = 2;
      } else {
        c.setLineDash([]);
        c.lineWidth = 20;
        c.globalAlpha = 0.8;
      }
      const rotation = warning ? angle : angle + (progress - 0.5) * turn;
      c.beginPath();
      c.moveTo(b.x, b.y);
      c.lineTo(
        b.x + Math.cos(rotation) * 1500,
        b.y + Math.sin(rotation) * 1500,
      );
      c.stroke();
    }
  }
  if (a.kind === "arms") {
    for (let i = 0; i < 2; i++) {
      const angle = a.angle + i * Math.PI;
      if (warning) {
        sector(c, b, angle + (0.72 * a.duration) / 2, 0.72 * a.duration, 250);
      } else {
        c.lineWidth = 30;
        c.strokeStyle = "#c5a18b";
        c.beginPath();
        c.moveTo(b.x, b.y);
        c.lineTo(
          b.x + Math.cos(angle + progress * a.duration * 0.72) * 235,
          b.y + Math.sin(angle + progress * a.duration * 0.72) * 235,
        );
        c.stroke();
      }
    }
  }
  if (a.kind === "radial" && warning) {
    c.lineWidth = 1;
    for (const angle of a.angles) {
      c.beginPath();
      c.moveTo(b.x + Math.cos(angle) * 80, b.y + Math.sin(angle) * 80);
      c.lineTo(b.x + Math.cos(angle) * 145, b.y + Math.sin(angle) * 145);
      c.stroke();
    }
  }
  for (const circle of a.circles) {
    if (a.kind === "slam" && !warning) {
      c.globalAlpha = 0.9;
      c.lineWidth = 32;
      c.beginPath();
      c.arc(
        circle.x,
        circle.y,
        circle.r * Math.min(1, progress),
        0,
        Math.PI * 2,
      );
      c.stroke();
      continue;
    }
    c.globalAlpha = warning ? 0.6 : 0.9;
    c.lineWidth = warning ? 2 : 4;
    c.setLineDash(warning ? [8, 6] : []);
    c.beginPath();
    c.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.setLineDash([]);
    if (warning) {
      c.beginPath();
      c.arc(circle.x, circle.y, circle.r * (a.age / a.warning), 0, Math.PI * 2);
      c.stroke();
      c.font = "12px monospace";
      c.textAlign = "center";
      c.fillStyle = color;
      c.fillText("!", circle.x, circle.y + 4);
      c.fillStyle = color + "19";
      if (a.kind === "bombs") {
        const height = (1 - a.age / a.warning) * 210;
        r.rect(circle.x - 5, circle.y - height - 11, 10, 22, "#d9baa5");
        r.rect(circle.x - 3, circle.y - height - 6, 6, 14, color);
        c.strokeStyle = color + "66";
        c.beginPath();
        c.moveTo(circle.x, circle.y - height - 17);
        c.lineTo(circle.x, circle.y - height - 45);
        c.stroke();
        c.strokeStyle = color;
      }
    }
    if (a.kind === "crush" && !warning) {
      c.lineWidth = 24;
      c.strokeStyle = "#b2967f";
      c.beginPath();
      c.moveTo(b.x, b.y);
      c.lineTo(circle.x, circle.y);
      c.stroke();
      c.strokeStyle = color;
    }
  }
  for (let i = 0; i < a.clones.length; i++) {
    const clone = a.clones[i];
    if (warning) {
      c.globalAlpha = 0.35;
      c.lineWidth = 1;
      c.setLineDash([7, 8]);
      for (const spread of [-0.22, 0, 0.22]) {
        const angle = a.angles[i] + spread;
        c.beginPath();
        c.moveTo(clone.x, clone.y);
        c.lineTo(
          clone.x + Math.cos(angle) * 600,
          clone.y + Math.sin(angle) * 600,
        );
        c.stroke();
      }
      c.setLineDash([]);
    }
    c.globalAlpha = 0.3 + Math.sin(a.age * 12) * 0.1;
    drawBoss(r, { ...b, x: clone.x, y: clone.y, r: 38 }, a.age);
    c.globalAlpha = 1;
  }
  if (warning && ["spiral", "clones"].includes(a.kind)) {
    c.setLineDash([5, 8]);
    c.lineWidth = 2;
    c.beginPath();
    c.arc(b.x, b.y, 95, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
}
export function drawBoss(r, b, t) {
  const c = r.ctx,
    col = b.definition.color;
  c.save();
  c.translate(b.x, b.y);
  const k = b.r / 62;
  c.scale(k, k);
  r.glow(0, 0, 140, col + (b.phase === 3 ? "42" : "25"));
  c.fillStyle = "#0008";
  c.beginPath();
  c.ellipse(0, 50, 82, 25, 0, 0, Math.PI * 2);
  c.fill();
  if (b.bossId === "sentinel") {
    r.rect(-78, -45, 33, 92, "#263b4c");
    r.rect(45, -45, 33, 92, "#263b4c");
    for (let i = -36; i < 42; i += 14) {
      r.rect(-77, i, 30, 5, "#567080");
      r.rect(47, i, 30, 5, "#567080");
    }
    r.rect(-47, -52, 94, 102, b.flash > 0 ? "#f4fffa" : "#6b8791");
    r.rect(-39, -43, 78, 86, "#243b4a");
    r.rect(-28, -35, 56, 57, "#101d2d");
    r.rect(-20, -28, 40, 30, col);
    r.rect(-13, -25, 26, 20, "#dbfff5");
    r.rect(-30, 29, 60, 12, "#11252e");
    for (let i = -20; i <= 20; i += 10) r.rect(i, 30, 4, 10, col);
    r.rect(-93, -17, 26, 34, "#637980");
    r.rect(67, -17, 26, 34, "#637980");
  } else if (b.bossId === "tyrant") {
    for (let i = 0; i < 4; i++) {
      c.save();
      c.rotate(Math.PI / 4 + (i * Math.PI) / 2);
      r.rect(25, -14, 65, 28, "#6b5650");
      r.rect(70, -21, 25, 42, "#a27d5b");
      r.rect(84, -14, 15, 28, col);
      c.restore();
    }
    r.rect(-47, -53, 94, 106, b.flash > 0 ? "#fff0df" : "#51463c");
    r.rect(-38, -42, 76, 82, "#88735b");
    r.rect(-29, -31, 58, 62, "#1a1b22");
    r.rect(-20, -23, 40, 46, "#652c25");
    r.rect(-13, -18, 26, 36, col);
    for (let i = -20; i < 30; i += 10) {
      r.rect(-45, i, 10, 4, col);
      r.rect(35, i, 10, 4, col);
    }
    r.glow(0, 0, 80, "#ff813a33");
  } else {
    c.rotate(Math.sin(t * 0.6) * 0.08);
    c.strokeStyle = col;
    c.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      c.save();
      c.rotate(t * (i % 2 ? -0.3 : 0.2) + i * 0.8);
      c.strokeRect(-48 - i * 8, -48 - i * 8, 96 + i * 16, 96 + i * 16);
      c.restore();
    }
    c.fillStyle = b.flash > 0 ? "#fff" : "#342345";
    c.beginPath();
    c.moveTo(0, -54);
    c.lineTo(45, 0);
    c.lineTo(0, 54);
    c.lineTo(-45, 0);
    c.closePath();
    c.fill();
    r.rect(-28, -16, 56, 32, "#0c0915");
    r.rect(-21, -9, 42, 18, col);
    r.rect(-5, -13, 10, 26, "#ffedff");
    for (let i = 0; i < b.phase; i++) r.rect(-12 + i * 10, 31, 5, 6, "#f7b1ff");
  }
  if (b.phaseTime > 0) {
    c.strokeStyle = col;
    c.lineWidth = 4;
    c.beginPath();
    c.arc(0, 0, 90 + (1.15 - b.phaseTime) * 100, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
}
