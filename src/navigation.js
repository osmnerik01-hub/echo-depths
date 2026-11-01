import { distance, segmentRect, circleRect } from "./math.js";

// One immutable occupancy grid per body radius per room; paths are throttled by AI.
export class Navigation {
  constructor(walls, width = 1280, height = 800, cell = 32) {
    this.walls = walls;
    this.cell = cell;
    this.cols = Math.ceil(width / cell);
    this.rows = Math.ceil(height / cell);
    this.grids = new Map();
    this.searches = 0;
    this.expanded = new Map();
    this.points = Array.from({ length: this.cols * this.rows }, (_, i) => ({
      x: ((i % this.cols) + 0.5) * cell,
      y: (Math.floor(i / this.cols) + 0.5) * cell,
    }));
    this.scores = new Float32Array(this.points.length);
    this.parent = new Int32Array(this.points.length);
    this.closed = new Uint8Array(this.points.length);
  }
  clear(a, b, r = 0) {
    let bounds = this.expanded.get(r);
    if (!bounds) {
      bounds = this.walls.map((w) => ({
        x: w.x - r,
        y: w.y - r,
        w: w.w + 2 * r,
        h: w.h + 2 * r,
      }));
      this.expanded.set(r, bounds);
    }
    for (let i = 0; i < bounds.length; i++)
      if (segmentRect(a, b, bounds[i])) return false;
    return true;
  }
  grid(radius) {
    if (!this.grids.has(radius)) {
      const grid = new Uint8Array(this.cols * this.rows);
      for (let y = 0; y < this.rows; y++)
        for (let x = 0; x < this.cols; x++) {
          const p = {
            x: (x + 0.5) * this.cell,
            y: (y + 0.5) * this.cell,
            r: radius + 2,
          };
          grid[y * this.cols + x] = this.walls.some((w) => circleRect(p, w))
            ? 1
            : 0;
        }
      this.grids.set(radius, grid);
    }
    return this.grids.get(radius);
  }
  point(i) {
    return this.points[i];
  }
  nearest(p, r, requireApproach = true) {
    const grid = this.grid(r);
    let best = -1,
      dist = Infinity;
    // Also require a valid approach segment: do not snap through thin obstacles.
    for (let i = 0; i < grid.length; i++)
      if (!grid[i]) {
        const q = this.point(i),
          d = distance(p, q);
        if (d < dist && (!requireApproach || this.clear(p, q, r))) {
          best = i;
          dist = d;
        }
      }
    return best;
  }
  find(start, goal, radius = 17) {
    if (this.clear(start, goal, radius)) return [{ x: goal.x, y: goal.y }];
    this.searches++;
    const grid = this.grid(radius),
      s = this.nearest(start, radius),
      end = this.nearest(
        goal,
        radius,
        !this.walls.some((w) => circleRect({ ...goal, r: radius }, w)),
      );
    if (s < 0 || end < 0) return [];
    const scores = this.scores.fill(Infinity),
      parent = this.parent.fill(-1);
    const closed = this.closed.fill(0),
      open = [s];
    scores[s] = 0;
    const h = (i) =>
      Math.hypot(
        (i % this.cols) - (end % this.cols),
        Math.floor(i / this.cols) - Math.floor(end / this.cols),
      );
    while (open.length) {
      let at = 0;
      for (let k = 1; k < open.length; k++)
        if (scores[open[k]] + h(open[k]) < scores[open[at]] + h(open[at]))
          at = k;
      const cur = open.splice(at, 1)[0];
      if (cur === end) {
        const path = [];
        let i = end;
        while (i !== s) {
          path.push(this.point(i));
          i = parent[i];
        }
        path.push(this.point(s));
        path.reverse();
        // Keep only corners that can be traversed with the full enemy radius.
        const result = [];
        let from = start;
        for (let n = 0; n < path.length; ) {
          let far = n;
          while (
            far + 1 < path.length &&
            this.clear(from, path[far + 1], radius)
          )
            far++;
          result.push(path[far]);
          from = path[far];
          n = far + 1;
        }
        if (this.clear(from, goal, radius))
          result.push({ x: goal.x, y: goal.y });
        return result;
      }
      closed[cur] = 1;
      const x = cur % this.cols,
        y = Math.floor(cur / this.cols);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx,
            ny = y + dy,
            n = ny * this.cols + nx;
          if (
            nx < 0 ||
            ny < 0 ||
            nx >= this.cols ||
            ny >= this.rows ||
            grid[n] ||
            closed[n]
          )
            continue;
          if (
            dx &&
            dy &&
            (grid[y * this.cols + nx] || grid[ny * this.cols + x])
          )
            continue;
          if (!this.clear(this.point(cur), this.point(n), radius)) continue;
          const score = scores[cur] + (dx && dy ? Math.SQRT2 : 1);
          if (score < scores[n]) {
            scores[n] = score;
            parent[n] = cur;
            if (!open.includes(n)) open.push(n);
          }
        }
    }
    return []; // Unreachable: AI retries with a bounded cooldown, never blocks a wave.
  }
}
