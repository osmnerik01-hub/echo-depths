// Map, encounter and reward RNG streams never consume visual randomness.
export function hashSeed(value) {
  let h = 2166136261;
  for (const c of String(value)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function seeded(value) {
  let s = typeof value === "number" ? value >>> 0 : hashSeed(value);
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function freshSeed() {
  if (globalThis.crypto?.getRandomValues) {
    const n = new Uint32Array(1);
    crypto.getRandomValues(n);
    return n[0].toString(36).toUpperCase();
  }
  return Date.now().toString(36).toUpperCase();
}
export const roomLabels = {
  start: "GİRİŞ",
  combat: "ÇATIŞMA",
  elite: "ELİT",
  treasure: "HAZİNE",
  repair: "TAMİR",
  shop: "MAĞAZA",
  boss: "BOSS",
};
export const roomIcons = {
  start: "◈",
  combat: "◇",
  elite: "⚔",
  treasure: "✧",
  repair: "✚",
  shop: "¤",
  boss: "⬡",
};
export function generateDungeon(seed, biome = 0) {
  const random = seeded(`${seed}:graph:${biome}`),
    nodes = [],
    layers = [];
  const add = (layer, lane, type) => {
    const node = {
      id: `b${biome}-${layer}-${lane}`,
      layer,
      lane,
      type,
      next: [],
      previous: [],
      layout: Math.floor(random() * 4),
      seed: `${seed}:${biome}:${layer}:${lane}`,
      visited: false,
      cleared: false,
      discovered: layer === 0 || type === "boss",
      rewarded: false,
    };
    nodes.push(node);
    return node;
  };
  layers.push([add(0, 1, "start")]);
  for (let layer = 1; layer <= 4; layer++) {
    const count = layer === 2 ? 3 : 2,
      arr = [];
    for (let lane = 0; lane < count; lane++) {
      let type =
        layer === 1
          ? "combat"
          : layer === 2
            ? lane === 0
              ? "treasure"
              : lane === 1
                ? "repair"
                : "elite"
            : layer === 3
              ? lane === 0
                ? "shop"
                : random() < 0.5
                  ? "elite"
                  : "combat"
              : lane === 0
                ? "combat"
                : random() < 0.5
                  ? "repair"
                  : "elite";
      arr.push(add(layer, count === 2 ? lane * 2 : lane, type));
    }
    layers.push(arr);
  }
  layers.push([add(5, 1, "boss")]);
  function connect(a, b) {
    if (!a.next.includes(b.id)) {
      a.next.push(b.id);
      b.previous.push(a.id);
    }
  }
  // Complete adjacent layers guarantee every node participates in a start→boss path.
  // Optional edges vary the routes without ever creating an isolated mandatory room.
  for (let layer = 0; layer < layers.length - 1; layer++) {
    const a = layers[layer],
      b = layers[layer + 1];
    for (let i = 0; i < a.length; i++)
      connect(a[i], b[Math.min(i, b.length - 1)]);
    for (let i = 0; i < b.length; i++)
      if (!b[i].previous.length)
        connect(a[Math.floor(random() * a.length)], b[i]);
    for (const from of a)
      for (const to of b)
        if (random() < 0.45 || a.length === 1 || b.length === 1)
          connect(from, to);
  }
  const start = layers[0][0],
    boss = layers.at(-1)[0];
  // Repair and treasure must be alternative reachable choices after the first encounter.
  for (const from of layers[1]) {
    connect(from, layers[2][0]);
    connect(from, layers[2][1]);
  }
  return {
    seed: String(seed),
    biome,
    nodes,
    start: start.id,
    boss: boss.id,
    current: start.id,
  };
}
export const nodeById = (d, id) => d.nodes.find((n) => n.id === id);
export function discover(d, node) {
  node.visited = true;
  node.discovered = true;
  for (const id of [...node.next, ...node.previous])
    nodeById(d, id).discovered = true;
}
export function canTravel(d, id) {
  const current = nodeById(d, d.current);
  return !!current?.cleared && current.next.includes(id);
}
export function mapView(d) {
  return d.nodes.map((n) => ({
    id: n.id,
    layer: n.layer,
    lane: n.lane,
    type: n.discovered || n.type === "boss" ? n.type : "unknown",
    visited: n.visited,
    cleared: n.cleared,
    current: n.id === d.current,
    available: canTravel(d, n.id),
    visible: n.discovered || n.type === "boss",
    next: n.discovered ? n.next : [],
  }));
}
