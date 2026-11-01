export class FixedClock {
  constructor(step = 1 / 120, maxDelta = 0.05) {
    this.step = step;
    this.maxDelta = maxDelta;
    this.last = null;
    this.accumulator = 0;
  }
  reset(now = null) {
    this.last = now;
    this.accumulator = 0;
  }
  advance(now, update) {
    if (this.last === null) {
      this.last = now;
      return { dt: 0, raw: 0, steps: 0 };
    }
    const raw = Math.max(0, now - this.last);
    this.last = now;
    const dt = Math.min(raw / 1000, this.maxDelta);
    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator + 1e-10 >= this.step) {
      update(this.step);
      this.accumulator -= this.step;
      steps++;
    }
    return { dt, raw, steps };
  }
}
export class FrameMeter {
  constructor(capacity = 240) {
    this.samples = new Float32Array(capacity);
    this.index = 0;
    this.count = 0;
    this.total = 0;
  }
  add(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return;
    if (this.count === this.samples.length)
      this.total -= this.samples[this.index];
    else this.count++;
    this.samples[this.index] = ms;
    this.total += this.samples[this.index];
    this.index = (this.index + 1) % this.samples.length;
  }
  get mean() {
    return this.count ? this.total / this.count : 0;
  }
  get fps() {
    return this.mean ? 1000 / this.mean : 0;
  }
}
