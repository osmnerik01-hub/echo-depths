export const soundPresets = {
  pulse: [620, 120, 0.065, "square", 0.025],
  scatter: [130, 28, 0.16, "sawtooth", 0.055],
  rail: [1350, 55, 0.3, "sawtooth", 0.045],
  arc: [1900, 330, 0.13, "triangle", 0.045],
  nova: [170, 35, 0.28, "sine", 0.085],
  explode: [90, 22, 0.35, "sawtooth", 0.05],
  enemy: [380, 160, 0.12, "triangle", 0.04],
  crit: [850, 1600, 0.09, "sine", 0.035],
  hit: [160, 45, 0.08, "triangle", 0.025],
  dash: [180, 900, 0.18, "sine", 0.05],
  death: [130, 20, 0.5, "sawtooth", 0.08],
  upgrade: [400, 1100, 0.3, "sine", 0.07],
  purchase: [500, 850, 0.18, "triangle", 0.05],
  warning: [300, 600, 0.2, "sine", 0.04],
  bossIntro: [65, 180, 0.8, "sawtooth", 0.05],
  sentinel: [950, 130, 0.4, "sawtooth", 0.04],
  tyrant: [90, 28, 0.6, "square", 0.035],
  hollow: [1500, 280, 0.6, "triangle", 0.04],
  phase: [140, 850, 0.65, "sine", 0.05],
  bossDeath: [230, 22, 1.3, "sawtooth", 0.06],
  victory: [440, 1320, 1.3, "sine", 0.06],
};
export class AudioSystem {
  constructor() {
    this.muted = false;
    this.last = new Map();
    this.voices = 0;
  }
  unlock() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    this.ctx ??= new Context();
    this.ctx.resume().catch(() => {});
  }
  play(kind) {
    if (!this.ctx || this.muted || this.voices >= 18) return;
    const c = this.ctx,
      preset = soundPresets[kind];
    if (!preset) return;
    if (c.currentTime - (this.last.get(kind) ?? -1) < 0.025) return;
    this.last.set(kind, c.currentTime);
    const o = c.createOscillator(),
      g = c.createGain(),
      [f, to, d, type, vol] = preset;
    o.type = type;
    o.frequency.setValueAtTime(f, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(to, c.currentTime + d);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d);
    o.connect(g);
    g.connect(c.destination);
    this.voices++;
    o.onended = () => {
      this.voices--;
      o.disconnect();
      g.disconnect();
    };
    o.start();
    o.stop(c.currentTime + d);
  }
  updateAmbient(biome, active) {
    if (!this.ctx) return;
    const c = this.ctx;
    const key = biome + ":" + active + ":" + this.muted;
    if (this.ambientKey === key) return;
    this.ambientKey = key;
    if (!this.ambient) {
      const gain = c.createGain();
      gain.gain.value = 0;
      gain.connect(c.destination);
      this.ambient = {
        gain,
        oscillators: [0, 1].map(() => {
          const o = c.createOscillator();
          o.type = "sine";
          o.connect(gain);
          o.start();
          return o;
        }),
      };
    }
    const freqs = [
      [55, 82.4],
      [42, 63],
      [46.2, 69.8],
    ][biome] || [55, 82.4];
    this.ambient.oscillators.forEach((o, i) =>
      o.frequency.setTargetAtTime(freqs[i], c.currentTime, 0.5),
    );
    this.ambient.gain.gain.setTargetAtTime(
      active && !this.muted ? 0.009 : 0,
      c.currentTime,
      0.25,
    );
  }
}
