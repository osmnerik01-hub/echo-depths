import { game } from "../tests/helpers.js";
import { act } from "../src/testing/bot.js";
export function playthrough(seed = "ABYSS-07", maxSeconds = 1500) {
  const g = game();
  g.start(seed);
  let lastNode = "",
    log = [];
  for (let step = 0; step < maxSeconds * 120 && !g.finalized; step++) {
    act(g);
    g.update(1 / 120);
    if (g.currentNode.id !== lastNode) {
      lastNode = g.currentNode.id;
      log.push({
        node: lastNode,
        type: g.currentNode.type,
        hp: Math.ceil(g.player.hp),
        scrap: g.scrap,
      });
    }
  }
  return {
    state: g.state,
    seed: g.seed,
    rooms: g.stats.roomsCleared,
    bosses: g.stats.bosses,
    kills: g.kills,
    damage: Math.round(g.stats.damage),
    hp: Math.round(g.player.hp),
    seconds: Math.round(g.elapsed),
    weapons: [...g.stats.weaponsUsed],
    log,
  };
}
if (process.argv[1]?.endsWith("playthrough.mjs")) {
  const result = playthrough(process.argv[2]);
  console.log(JSON.stringify(result, null, 2));
  if (result.state !== "victory") process.exitCode = 1;
}
