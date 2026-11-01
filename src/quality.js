export const profiles = Object.freeze({
  LOW: Object.freeze({
    id: "LOW",
    dpr: 1,
    particles: 0.35,
    maxParticles: 180,
    glow: false,
    shadows: false,
    screenEffects: 0.35,
    shake: 0.55,
  }),
  MEDIUM: Object.freeze({
    id: "MEDIUM",
    dpr: 1.5,
    particles: 0.65,
    maxParticles: 360,
    glow: true,
    shadows: true,
    screenEffects: 0.7,
    shake: 0.75,
  }),
  HIGH: Object.freeze({
    id: "HIGH",
    dpr: 2,
    particles: 1,
    maxParticles: 650,
    glow: true,
    shadows: true,
    screenEffects: 1,
    shake: 1,
  }),
});
export function readQuality() {
  try {
    const value = globalThis.localStorage?.getItem("echo-depths.quality");
    return profiles[value] ? value : "MEDIUM";
  } catch {
    return "MEDIUM";
  }
}
export function storeQuality(id) {
  if (!profiles[id]) return false;
  try {
    globalThis.localStorage?.setItem("echo-depths.quality", id);
    return true;
  } catch {
    return false;
  }
}
