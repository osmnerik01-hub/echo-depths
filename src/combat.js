import { distance, rectHitTime, circleHitTime } from "./math.js";
import { enemyTypes } from "./enemies.js";
import { grantScrap } from "./economy.js";

export class Combat {
  constructor(game) {
    this.g = game;
    this.boundsSource = null;
    this.boundsByRadius = new Map();
    this.hitRecords = [];
    this.hits = [];
  }
  reset() {
    this.boundsSource = null;
    this.boundsByRadius.clear();
    this.hits.length = 0;
    for (const record of this.hitRecords) {
      record.e = null;
      record.t = 0;
    }
  }
  damage(e, amount, source = {}) {
    if (
      this.g.finalized ||
      e.hp <= 0 ||
      e.wind > 0 ||
      (e.bossId && e.phaseTime > 0)
    )
      return 0;
    const g = this.g,
      p = g.player;
    if (!source.status) {
      if (e.type === 4 && source.from) {
        const a = Math.atan2(source.from.y - e.y, source.from.x - e.x);
        if (Math.cos(a - e.angle) > 0.5) {
          amount *= 0.25;
          g.burst(e.x, e.y, "#fff0b8", 4);
        }
      }
      if (e.hp / e.maxHp < 0.25) amount *= 1 + p.execution;
    }
    const actualDamage = Math.min(e.hp, Math.max(0, amount));
    e.hp -= amount;
    g.stats.damage += actualDamage;
    e.flash = source.status ? e.flash : 0.1;
    if (!source.status) {
      g.hitStop = Math.max(g.hitStop, source.crit ? 0.035 : 0.014);
      g.numbers.push({
        x: e.x,
        y: e.y - e.r - 8,
        text: Math.round(amount),
        crit: !!source.crit,
        color: source.color || "#d3fff3",
        life: 0.65,
        max: 0.65,
      });
      if (g.numbers.length > 70) g.numbers.shift();
      g.burst(e.x, e.y, source.color || "#ffb979", source.crit ? 10 : 4);
      g.audio.play(source.crit ? "crit" : "hit");
    }
    if (e.hp <= 0) {
      if (e.bossId) {
        g.onBossKilled(e);
        return actualDamage;
      }
      g.kills++;
      grantScrap(g, 3 + (e.type || 0));
      g.score += enemyTypes[e.type]?.score || 100;
      p.hp = Math.min(p.maxHp, p.hp + p.leech);
      g.shake = Math.max(g.shake, 3);
      g.burst(e.x, e.y, enemyTypes[e.type]?.color || "#ff9769", 18);
      g.effects.push({
        kind: "death",
        x: e.x,
        y: e.y,
        r: e.r,
        color: enemyTypes[e.type]?.color || "#ff9769",
        angle: e.angle,
        life: 0.45,
        max: 0.45,
      });
    }
    return actualDamage;
  }
  chain(origin, damage, count, visited = new Set(), crit = false) {
    const g = this.g,
      p = g.player;
    let from = origin;
    visited.add(origin);
    for (let i = 0; i < count; i++) {
      const e = g.enemies
        .filter(
          (e) =>
            e.hp > 0 &&
            e.wind <= 0 &&
            !visited.has(e) &&
            distance(from, e) <= p.chainRange &&
            g.navigation.clear(from, e),
        )
        .sort((a, b) => distance(from, a) - distance(from, b))[0];
      if (!e) break;
      visited.add(e);
      g.effects.push({
        kind: "arc",
        x: from.x,
        y: from.y,
        tx: e.x,
        ty: e.y,
        color: "#a2c7ff",
        life: 0.18,
        max: 0.18,
        seed: i,
      });
      this.damage(e, damage * p.chainPower, { from, crit, color: "#a2c7ff" });
      from = e;
    }
  }
  explode(pos, damage, radius, echo = false, crit = false, source = {}) {
    const g = this.g;
    g.effects.push({
      kind: "explosion",
      x: pos.x,
      y: pos.y,
      r: radius,
      color: echo ? "#d2a2ff" : "#ffb16c",
      life: 0.38,
      max: 0.38,
    });
    g.burst(pos.x, pos.y, "#ffb16c", echo ? 14 : 24);
    g.shake = Math.max(g.shake, echo ? 4 : 7);
    g.audio.play("explode");
    let chained = false;
    for (const e of g.enemies)
      if (
        e.hp > 0 &&
        e.wind <= 0 &&
        distance(pos, e) <= radius + e.r &&
        g.navigation.clear(pos, e)
      ) {
        this.damage(
          e,
          damage * (1 - 0.45 * Math.min(1, distance(pos, e) / radius)),
          { from: pos, crit, color: "#ffc17d" },
        );
        if (source.burn) {
          e.burnTime = 2;
          e.burnDamage = Math.max(e.burnDamage || 0, source.burn);
        }
        if (source.slow) {
          e.slowTime = 1.5;
          e.slow = Math.max(e.slow || 0, source.slow);
        }
        if (source.chain && !chained) {
          this.chain(e, damage, source.chain, new Set([e]), crit);
          chained = true;
        }
      }
    if (!echo && g.player.echoBlast)
      g.delayed.push({
        x: pos.x,
        y: pos.y,
        damage: damage * 0.45,
        radius,
        time: 0.22,
      });
  }
  hit(b, e, old) {
    const g = this.g;
    if (b.blast) {
      this.explode(b, b.damage, b.blast, false, b.crit, b);
      b.life = 0;
      return true;
    }
    this.damage(e, b.damage, { from: old, crit: b.crit, color: b.color });
    if (b.burn) {
      e.burnTime = 2;
      e.burnDamage = Math.max(e.burnDamage || 0, b.burn);
    }
    if (b.slow) {
      e.slowTime = 1.5;
      e.slow = Math.max(e.slow || 0, b.slow);
    }
    if (b.chain) this.chain(e, b.damage, b.chain, new Set([e]), b.crit);
    b.hit.add(e);
    if (b.pierce > 0) {
      b.pierce--;
      return false;
    }
    b.life = 0;
    return true;
  }
  update(dt) {
    const g = this.g;
    for (const job of g.delayed) job.time -= dt;
    const ready = g.delayed.filter((job) => job.time <= 0);
    g.delayed = g.delayed.filter((job) => job.time > 0);
    for (const job of ready) this.explode(job, job.damage, job.radius, true);
    for (const b of g.bullets) {
      if (b.life <= 0) continue;
      if (!b.enemy) b.hit ??= new Set();
      const integrationTime = g.profile?.start();
      const old = { x: b.x, y: b.y },
        step = Math.min(dt, b.life),
        end = { x: b.x + b.vx * step, y: b.y + b.vy * step };
      b.life -= dt;
      g.profile?.end("bulletIntegration", integrationTime);
      let consumed = false;
      const collisionTime = g.profile?.start();
      let wallTime = Infinity,
        wall = null;
      if (this.boundsSource !== g.room.walls) {
        this.boundsSource = g.room.walls;
        this.boundsByRadius.clear();
      }
      let bounds = this.boundsByRadius.get(b.r);
      if (!bounds) {
        bounds = g.room.walls.map((w) => ({
          wall: w,
          x: w.x - b.r,
          y: w.y - b.r,
          w: w.w + 2 * b.r,
          h: w.h + 2 * b.r,
        }));
        this.boundsByRadius.set(b.r, bounds);
      }
      const minX = Math.min(old.x, end.x),
        maxX = Math.max(old.x, end.x),
        minY = Math.min(old.y, end.y),
        maxY = Math.max(old.y, end.y);
      for (const box of bounds) {
        if (
          maxX < box.x ||
          minX > box.x + box.w ||
          maxY < box.y ||
          minY > box.y + box.h
        )
          continue;
        const t = rectHitTime(old, end, box);
        if (t < wallTime) {
          wallTime = t;
          wall = box.wall;
        }
      }
      let hitCount = 0;
      const total = b.enemy ? 1 : g.enemies.length;
      for (let i = 0; i < total; i++) {
        const e = b.enemy ? g.player : g.enemies[i];
        if (!b.enemy && (e.hp <= 0 || e.wind > 0 || b.hit.has(e))) continue;
        const radius = e.r + b.r;
        if (
          maxX < e.x - radius ||
          minX > e.x + radius ||
          maxY < e.y - radius ||
          minY > e.y + radius
        )
          continue;
        const t = circleHitTime(old, end, e, radius);
        if (!Number.isFinite(t) || t >= wallTime) continue;
        const record =
          this.hitRecords[hitCount] ||
          (this.hitRecords[hitCount] = { e: null, t: 0 });
        record.e = e;
        record.t = t;
        this.hits[hitCount++] = record;
      }
      const hits = this.hits;
      hits.length = hitCount;
      hits.sort((a, b) => a.t - b.t);
      g.profile?.end("collisionChecks", collisionTime);
      for (const { e, t } of hits) {
        if (!b.enemy && e.hp <= 0) continue;
        b.x = old.x + (end.x - old.x) * t;
        b.y = old.y + (end.y - old.y) * t;
        if (b.enemy) {
          g.hurt(b.damage);
          if (g.finalized) return;
          b.life = 0;
          consumed = true;
        } else consumed = this.hit(b, e, old);
        if (consumed) break;
      }
      if (consumed) continue;
      if (wall) {
        b.x = old.x + (end.x - old.x) * Math.max(0, wallTime - 0.001);
        b.y = old.y + (end.y - old.y) * Math.max(0, wallTime - 0.001);
        g.burst(b.x, b.y, b.color || "#ff9d7c", 5);
        if (b.blast) {
          this.explode(b, b.damage, b.blast, false, b.crit, b);
          b.life = 0;
        } else if (b.bounces > 0) {
          b.bounces--;
          const hitX = old.x + (end.x - old.x) * wallTime;
          if (
            Math.abs(hitX - (wall.x - b.r)) < 0.1 ||
            Math.abs(hitX - (wall.x + wall.w + b.r)) < 0.1
          )
            b.vx *= -1;
          else b.vy *= -1;
        } else b.life = 0;
      } else {
        b.x = end.x;
        b.y = end.y;
        if (b.life <= 0 && b.blast)
          this.explode(b, b.damage, b.blast, false, b.crit, b);
      }
    }
    g.bullets = g.bullets.filter((b) => b.life > 0);
    g.enemies = g.enemies.filter((e) => e.hp > 0);
  }
}
