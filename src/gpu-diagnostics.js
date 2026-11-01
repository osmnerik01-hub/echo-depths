// Web APIs cannot prove that the active Canvas 2D is hardware accelerated.
export function classifyAdapter(renderer = "") {
  if (
    /swiftshader|llvmpipe|softpipe|software rasterizer|microsoft basic render/i.test(
      renderer,
    )
  )
    return "Yazılımsal adaptör tespit edildi";
  return "Bilinmiyor";
}
export function probeWebGL2(
  createCanvas = () => document.createElement("canvas"),
) {
  let gl;
  try {
    gl = createCanvas().getContext("webgl2", {
      failIfMajorPerformanceCaveat: false,
    });
    if (!gl)
      return {
        available: false,
        adapter: "Bilinmiyor",
        acceleration: "Bilinmiyor",
      };
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const adapter = ext
      ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
      : "Bilinmiyor";
    return {
      available: true,
      adapter,
      acceleration: classifyAdapter(adapter),
      backend: gl.getParameter(gl.VERSION),
    };
  } catch {
    return {
      available: false,
      adapter: "Bilinmiyor",
      acceleration: "Bilinmiyor",
    };
  } finally {
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
export class GPUDiagnostics {
  constructor(canvas) {
    this.canvas = canvas;
    this.panel = document.createElement("output");
    this.panel.id = "gpu-diagnostics";
    this.panel.hidden = true;
    this.panel.setAttribute("aria-live", "polite");
    document.body.append(this.panel);
    window.addEventListener("keydown", (e) => {
      if (
        e.code !== "F4" ||
        e.repeat ||
        e.target?.closest?.('input,textarea,[contenteditable="true"]')
      )
        return;
      e.preventDefault();
      this.panel.hidden = !this.panel.hidden;
      if (!this.panel.hidden && !this.info) this.info = probeWebGL2();
    });
  }
  update(renderer, game, meter) {
    if (this.panel.hidden) return;
    const i = this.info;
    this.panel.textContent = `GPU TEŞHİSİ · F4
Aktif renderer: Canvas 2D${renderer.contextLost ? " (bağlam kayıp)" : ""}
WebGL2: ${i.available ? "Kullanılabilir" : "Kullanılamıyor"}
WebGL adaptörü: ${i.adapter}
WebGL altyapısı: ${i.backend || "Bilinmiyor"}
WebGL donanım doğrulaması: ${i.acceleration}
Canvas 2D donanım doğrulaması: Bilinmiyor
${meter.fps.toFixed(1)} FPS · ${meter.mean.toFixed(2)} ms
Çözünürlük: ${this.canvas.width} × ${this.canvas.height}
DPR: ${renderer.dpr} · Profil: ${game.quality.id}
Kesin durum için chrome://gpu veya edge://gpu raporunu inceleyin.`;
  }
}
