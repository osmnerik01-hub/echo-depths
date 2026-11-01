import test from "node:test";
import assert from "node:assert/strict";
import { playthrough } from "../scripts/playthrough.mjs";
for (const seed of ["ABYSS-07", "ECHO-DEPTHS"])
  test(`normal oynanış denetleyicisi tam koşuyu bitirir: ${seed}`, () => {
    const r = playthrough(seed);
    assert.equal(r.state, "victory", JSON.stringify(r));
    assert.equal(r.bosses, 3);
    assert.equal(r.rooms, 18);
    assert.ok(r.kills > 50);
    assert.ok(r.damage > 6000);
    assert.ok(r.weapons.includes("pulse"));
    assert.ok(r.hp > 0);
  });
