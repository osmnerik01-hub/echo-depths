// Reuses particle objects and the active array; critical telegraphs are separate effects.
export class ParticlePool {
  constructor(capacity = 650) {
    this.capacity = capacity;
    this.free = [];
    this.created = 0;
    this.reused = 0;
  }
  acquire() {
    if (this.free.length) {
      this.reused++;
      return this.free.pop();
    }
    if (this.created >= this.capacity) return null;
    this.created++;
    return { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0.7, color: "", size: 1 };
  }
  release(p) {
    p.life = 0;
    this.free.push(p);
  }
  clear(active) {
    for (const p of active) this.release(p);
    active.length = 0;
  }
  update(active, dt) {
    let write = 0;
    const drag = Math.exp(-dt * 4);
    for (let i = 0; i < active.length; i++) {
      const p = active[i];
      p.life -= dt;
      if (p.life <= 0 || p.x < -80 || p.x > 1360 || p.y < -80 || p.y > 880) {
        this.release(p);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= drag;
      p.vy *= drag;
      active[write++] = p;
    }
    active.length = write;
  }
  stats() {
    return {
      capacity: this.capacity,
      created: this.created,
      free: this.free.length,
      reused: this.reused,
    };
  }
}
