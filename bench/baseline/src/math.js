export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function circleRect(c, r) {
  const x = clamp(c.x, r.x, r.x + r.w),
    y = clamp(c.y, r.y, r.y + r.h);
  return Math.hypot(c.x - x, c.y - y) < c.r;
}
export function moveBody(b, dx, dy, walls) {
  const steps = Math.max(
    1,
    Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / Math.max(4, b.r * 0.5)),
  );
  for (let i = 0; i < steps; i++) {
    if (dx) {
      b.x += dx / steps;
      for (const w of walls)
        if (circleRect(b, w)) b.x = dx > 0 ? w.x - b.r : w.x + w.w + b.r;
    }
    if (dy) {
      b.y += dy / steps;
      for (const w of walls)
        if (circleRect(b, w)) b.y = dy > 0 ? w.y - b.r : w.y + w.h + b.r;
    }
  }
}
export function segmentCircle(a, b, c, r) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = clamp(
      ((c.x - a.x) * dx + (c.y - a.y) * dy) / (dx * dx + dy * dy || 1),
      0,
      1,
    );
  return Math.hypot(a.x + dx * t - c.x, a.y + dy * t - c.y) <= r;
}
export function segmentRect(a, b, r) {
  let lo = 0,
    hi = 1;
  for (const [p, d, min, max] of [
    [a.x, b.x - a.x, r.x, r.x + r.w],
    [a.y, b.y - a.y, r.y, r.y + r.h],
  ]) {
    if (!d) {
      if (p < min || p > max) return false;
    } else {
      let t1 = (min - p) / d,
        t2 = (max - p) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      lo = Math.max(lo, t1);
      hi = Math.min(hi, t2);
      if (lo > hi) return false;
    }
  }
  return true;
}
export function rectHitTime(a, b, r) {
  let lo = 0,
    hi = 1;
  for (const [p, d, min, max] of [
    [a.x, b.x - a.x, r.x, r.x + r.w],
    [a.y, b.y - a.y, r.y, r.y + r.h],
  ]) {
    if (!d) {
      if (p < min || p > max) return Infinity;
    } else {
      let t1 = (min - p) / d,
        t2 = (max - p) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      lo = Math.max(lo, t1);
      hi = Math.min(hi, t2);
      if (lo > hi) return Infinity;
    }
  }
  return lo;
}
export function circleHitTime(a, b, c, r) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    ox = a.x - c.x,
    oy = a.y - c.y,
    A = dx * dx + dy * dy,
    C = ox * ox + oy * oy - r * r;
  if (C <= 0) return 0;
  if (!A) return Infinity;
  const B = 2 * (ox * dx + oy * dy),
    disc = B * B - 4 * A * C;
  if (disc < 0) return Infinity;
  const t = (-B - Math.sqrt(disc)) / (2 * A);
  return t >= 0 && t <= 1 ? t : Infinity;
}
