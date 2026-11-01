import test from "node:test";
import assert from "node:assert/strict";
import {
  moveBody,
  segmentCircle,
  segmentRect,
  circleRect,
} from "../src/math.js";
import { createRoom, upgrades } from "../src/rooms.js";
test("hızlı mermi ince duvarı ve hedefi atlamaz", () => {
  assert.ok(
    segmentRect(
      { x: 0, y: 50 },
      { x: 500, y: 50 },
      { x: 100, y: 0, w: 4, h: 100 },
    ),
  );
  assert.ok(
    segmentCircle({ x: 0, y: 50 }, { x: 500, y: 50 }, { x: 200, y: 50 }, 17),
  );
  assert.equal(
    segmentCircle({ x: 0, y: 50 }, { x: 500, y: 50 }, { x: 200, y: 80 }, 17),
    false,
  );
});
test("duvar boyunca kayma ve eksen ayrımı", () => {
  const p = { x: 80, y: 50, r: 10 };
  moveBody(p, 25, 20, [{ x: 100, y: 0, w: 20, h: 200 }]);
  assert.equal(p.x, 90);
  assert.equal(p.y, 70);
});
test("tüm oda düzenlerinin başlangıç noktası güvenli", () => {
  for (let i = 0; i < 4; i++) {
    const room = createRoom(1, () => i / 4 + 0.01);
    assert.equal(
      room.walls.some((w) => circleRect({ x: 640, y: 400, r: 17 }, w)),
      false,
    );
    assert.equal(room.spawnCount, 7);
  }
});
test("yüksek delta sırasında gövde ince duvardan geçemez", () => {
  const p = { x: 80, y: 50, r: 10 };
  moveBody(p, 500, 0, [{ x: 100, y: 0, w: 4, h: 200 }]);
  assert.equal(p.x, 90);
});
