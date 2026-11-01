import test from "node:test";
import assert from "node:assert/strict";
import { classifyAdapter, probeWebGL2 } from "../src/gpu-diagnostics.js";
test("GPU classification never promotes an adapter string to hardware proof", () => {
  for (const name of ["ANGLE SwiftShader", "llvmpipe", "software rasterizer"])
    assert.match(classifyAdapter(name), /Yazılımsal/);
  for (const name of ["NVIDIA RTX 3050 Ti", "Intel UHD", ""])
    assert.equal(classifyAdapter(name), "Bilinmiyor");
});
test("GPU probe tolerates missing, blocked and privacy-restricted contexts", () => {
  assert.equal(
    probeWebGL2(() => ({ getContext: () => null })).available,
    false,
  );
  assert.equal(
    probeWebGL2(() => {
      throw Error("blocked");
    }).adapter,
    "Bilinmiyor",
  );
  let released = false;
  const gl = {
    VERSION: 1,
    getParameter: () => "WebGL 2",
    getExtension: (name) =>
      name === "WEBGL_lose_context"
        ? {
            loseContext() {
              released = true;
            },
          }
        : null,
  };
  assert.equal(
    probeWebGL2(() => ({ getContext: () => gl })).adapter,
    "Bilinmiyor",
  );
  assert.equal(released, true);
});
