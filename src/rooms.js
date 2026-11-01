export const W = 1280,
  H = 800;
export function createRoom(index, random = Math.random) {
  const layouts = [
    [
      [330, 230, 130, 90],
      [820, 480, 130, 90],
    ],
    [
      [300, 260, 100, 280],
      [880, 260, 100, 280],
    ],
    [
      [420, 200, 100, 100],
      [760, 200, 100, 100],
      [550, 520, 180, 80],
    ],
    [
      [280, 220, 180, 80],
      [820, 220, 180, 80],
      [280, 520, 180, 80],
      [820, 520, 180, 80],
    ],
  ];
  const k = Math.floor(random() * layouts.length);
  return {
    layout: k,
    walls: [
      { x: 0, y: 0, w: W, h: 44 },
      { x: 0, y: H - 44, w: W, h: 44 },
      { x: 0, y: 0, w: 44, h: H },
      { x: W - 44, y: 0, w: 44, h: H },
      ...layouts[k].map(([x, y, w, h]) => ({ x, y, w, h })),
    ],
    spawnCount: Math.min(22, 5 + index * 2),
  };
}
export { upgrades } from "./upgrades.js";
