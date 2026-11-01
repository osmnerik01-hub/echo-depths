export const weapons = {
  pulse: {
    id: "pulse",
    name: "Pulse Pistol",
    damage: 24,
    delay: 0.22,
    speed: 810,
    life: 1.1,
    pellets: 1,
    spread: 0,
    r: 4,
    color: "#7fffe5",
    shake: 1.5,
    sound: "pulse",
    description: "Dengeli • hassas / tek hedef",
  },
  scatter: {
    id: "scatter",
    name: "Scatter Cannon",
    damage: 13,
    delay: 0.7,
    speed: 660,
    life: 0.48,
    pellets: 7,
    spread: 0.64,
    r: 3,
    color: "#ffc679",
    shake: 4,
    sound: "scatter",
    description: "7 saçma • yakın menzil / geniş yayılım",
  },
  rail: {
    id: "rail",
    name: "Rail Lance",
    damage: 100,
    delay: 1.1,
    speed: 1650,
    life: 0.85,
    pellets: 1,
    spread: 0,
    r: 5,
    pierce: 4,
    color: "#f0b0ff",
    shake: 6,
    sound: "rail",
    description: "4 deliş • yüksek hasar / yavaş ateş",
  },
  arc: {
    id: "arc",
    name: "Arc Blaster",
    damage: 29,
    delay: 0.5,
    speed: 700,
    life: 0.8,
    pellets: 1,
    spread: 0,
    r: 5,
    chain: 2,
    color: "#90bcff",
    shake: 2,
    sound: "arc",
    description: "2 elektrik sıçraması / kısa menzil",
  },
  nova: {
    id: "nova",
    name: "Nova Launcher",
    damage: 62,
    delay: 1.15,
    speed: 340,
    life: 1.7,
    pellets: 1,
    spread: 0,
    r: 8,
    blast: 105,
    color: "#ff9868",
    shake: 5,
    sound: "nova",
    description: "Alan patlaması / yavaş mermi",
  },
};
export function weaponStats(p, id = p.weapon) {
  const w = weapons[id];
  return {
    ...w,
    damage: w.damage * (p.damage / 24),
    delay: Math.max(0.055, w.delay * (p.fireDelay / 0.17)),
    speed: w.speed * (p.projectileSpeed || 1),
    life: w.life * (p.range || 1),
    pierce: (w.pierce || 0) + (p.pierce || 0),
    chain: (w.chain || 0) + (p.chain || 0),
    blast: (w.blast || 0) * (p.blastRadius || 1),
  };
}
export function makeVolley(p, angle, random = Math.random) {
  const w = weaponStats(p),
    result = [];
  for (let i = 0; i < w.pellets; i++) {
    const a =
      angle +
      (w.pellets > 1 ? (i / (w.pellets - 1) - 0.5) * w.spread : 0) +
      (random() - 0.5) * (p.inaccuracy || 0);
    const crit = random() < (p.critChance || 0);
    result.push({
      x: p.x + Math.cos(a) * 10,
      y: p.y + Math.sin(a) * 10,
      vx: Math.cos(a) * w.speed,
      vy: Math.sin(a) * w.speed,
      r: w.r,
      life: w.life,
      enemy: false,
      damage:
        w.damage *
        (p.tempBoost > 0 ? 1.25 : 1) *
        (crit ? p.critMult : 1) *
        (p.dashBoost > 0 ? 1 + (p.dashPower || 0) : 1),
      crit,
      weapon: w.id,
      color: w.color,
      pierce: w.pierce,
      chain: w.chain,
      blast: w.blast,
      hit: new Set(),
      bounces: p.bounces || 0,
      burn: p.burn || 0,
      slow: p.slow || 0,
    });
  }
  return result;
}
export function unlockWeapon(p, id) {
  if (!weapons[id] || p.inventory.includes(id)) return false;
  p.inventory.push(id);
  p.weapon = id;
  return true;
}
export function switchWeapon(p, direction = 1) {
  const i = p.inventory.indexOf(p.weapon);
  p.weapon =
    p.inventory[(i + direction + p.inventory.length) % p.inventory.length];
  return p.weapon;
}
