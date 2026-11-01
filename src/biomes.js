import { circleRect, distance } from "./math.js";
export const biomes = [
  {
    id: "labs",
    name: "THE FORGOTTEN LABS",
    subtitle: "Unutulmuş araştırma kanadı",
    floor: "#0b1520",
    tile: "#101e2b",
    accent: "#6cf9df",
    secondary: "#277d9c",
    wall: "#162332",
    ambient: "labs",
    boss: "sentinel",
    decor: "laboratory",
  },
  {
    id: "foundry",
    name: "THE RUSTED FOUNDRY",
    subtitle: "Pasın ve ateşin kalbi",
    floor: "#1a1211",
    tile: "#271c19",
    accent: "#ffac66",
    secondary: "#bd4139",
    wall: "#382c2a",
    ambient: "foundry",
    boss: "tyrant",
    decor: "industrial",
  },
  {
    id: "void",
    name: "THE VOID CORE",
    subtitle: "Sinyalin bittiği yer",
    floor: "#100c1d",
    tile: "#1c142d",
    accent: "#e6a0ff",
    secondary: "#d74f9c",
    wall: "#2c2040",
    ambient: "void",
    boss: "hollow",
    decor: "fracture",
  },
];
export function roomHazards(biome, type) {
  if (["start", "repair", "shop", "treasure", "boss"].includes(type)) return [];
  if (biome === 1)
    return [
      { kind: "vent", x: 580, y: 170, w: 120, h: 70, period: 6, offset: 0 },
      { kind: "vent", x: 580, y: 575, w: 120, h: 60, period: 6, offset: 3 },
    ];
  if (biome === 2)
    return [
      { kind: "rift", x: 170, y: 350, w: 100, h: 100, period: 7, offset: 1 },
      { kind: "rift", x: 1010, y: 350, w: 100, h: 100, period: 7, offset: 4 },
    ];
  return [];
}
export function hazardState(h, time) {
  const phase = (time + h.offset) % h.period;
  return phase < 1.25 ? "warning" : phase < 2.5 ? "active" : "idle";
}
export function updateEnvironment(g, dt) {
  g.roomTime += dt;
  for (const h of g.hazards) {
    h.state = hazardState(h, g.roomTime);
    if (h.state === "active" && circleRect(g.player, h))
      g.hurt(g.biomeIndex === 1 ? 14 : 17);
  }
  if (g.player.tempBoost > 0)
    g.player.tempBoost = Math.max(0, g.player.tempBoost - dt);
}
