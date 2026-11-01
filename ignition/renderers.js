export class CanvasBatch {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.assets = assets;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.name = "Canvas 2D sprite batch";
  }
  draw(items, camera) {
    const c = this.ctx;
    c.setTransform(
      this.canvas.width / 1280,
      0,
      0,
      this.canvas.height / 800,
      0,
      0,
    );
    c.fillStyle = "#040911";
    c.fillRect(0, 0, 1280, 800);
    c.translate(640, 400);
    c.rotate(camera.angle);
    c.scale(camera.zoom, camera.zoom);
    c.translate(-camera.x, -camera.y);
    for (const p of items) {
      const s = this.assets.regions[p.sprite];
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.angle);
      c.globalAlpha = p.alpha;
      c.drawImage(
        this.assets[s.texture],
        s.x,
        s.y,
        s.w,
        s.h,
        -p.w / 2,
        -p.h / 2,
        p.w,
        p.h,
      );
      c.restore();
    }
    return true;
  }
  dispose() {}
}
const vertex = `#version 300 es
in vec2 position; in vec2 uv; in float opacity; uniform vec4 camera; uniform float zoom;
out vec2 texcoord; out float alpha;
void main(){vec2 p=(position-camera.xy)*zoom; p=vec2(camera.z*p.x-camera.w*p.y,camera.w*p.x+camera.z*p.y)+vec2(640.,400.);
gl_Position=vec4(p/vec2(640.,-400.)+vec2(-1.,1.),0.,1.);texcoord=uv;alpha=opacity;}`;
const fragment = `#version 300 es
precision mediump float; uniform sampler2D image; in vec2 texcoord; in float alpha; out vec4 color;
void main(){color=texture(image,texcoord)*alpha;}`;
export class WebGLBatch {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.assets = assets;
    this.name = "WebGL2 batched atlas";
    this.capacity = 4096;
    this.vertices = new Float32Array(this.capacity * 6 * 5);
    this.lost = false;
    this.drawCalls = 0;
    this.gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      premultipliedAlpha: true,
    });
    if (!this.gl) throw Error("WebGL2 kullanılamıyor");
    this.onLost = (e) => {
      e.preventDefault();
      this.lost = true;
    };
    this.onRestored = () => {
      try {
        this.initialize();
        this.lost = false;
        this.restoreError = null;
      } catch (e) {
        this.restoreError = String(e);
      }
    };
    canvas.addEventListener("webglcontextlost", this.onLost);
    canvas.addEventListener("webglcontextrestored", this.onRestored);
    try {
      this.initialize();
    } catch (e) {
      this.dispose();
      throw e;
    }
  }
  initialize() {
    const g = this.gl;
    const compile = (type, source) => {
      const s = g.createShader(type);
      g.shaderSource(s, source);
      g.compileShader(s);
      if (!g.getShaderParameter(s, g.COMPILE_STATUS)) {
        const message = g.getShaderInfoLog(s);
        g.deleteShader(s);
        throw Error(message);
      }
      return s;
    };
    const vs = compile(g.VERTEX_SHADER, vertex),
      fs = compile(g.FRAGMENT_SHADER, fragment),
      program = g.createProgram();
    g.attachShader(program, vs);
    g.attachShader(program, fs);
    g.linkProgram(program);
    g.deleteShader(vs);
    g.deleteShader(fs);
    if (!g.getProgramParameter(program, g.LINK_STATUS)) {
      g.deleteProgram(program);
      throw Error("WebGL shader link başarısız");
    }
    this.program = program;
    g.useProgram(program);
    this.vao = g.createVertexArray();
    g.bindVertexArray(this.vao);
    this.buffer = g.createBuffer();
    g.bindBuffer(g.ARRAY_BUFFER, this.buffer);
    g.bufferData(g.ARRAY_BUFFER, this.vertices.byteLength, g.DYNAMIC_DRAW);
    for (const [name, size, offset] of [
      ["position", 2, 0],
      ["uv", 2, 8],
      ["opacity", 1, 16],
    ]) {
      const location = g.getAttribLocation(program, name);
      g.enableVertexAttribArray(location);
      g.vertexAttribPointer(location, size, g.FLOAT, false, 20, offset);
    }
    this.cameraLocation = g.getUniformLocation(program, "camera");
    this.zoomLocation = g.getUniformLocation(program, "zoom");
    g.uniform1i(g.getUniformLocation(program, "image"), 0);
    g.activeTexture(g.TEXTURE0);
    g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    this.textures = {};
    for (const key of ["background", "atlas"]) {
      const t = g.createTexture();
      this.textures[key] = t;
      g.bindTexture(g.TEXTURE_2D, t);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
      g.texImage2D(
        g.TEXTURE_2D,
        0,
        g.RGBA,
        g.RGBA,
        g.UNSIGNED_BYTE,
        this.assets[key],
      );
    }
    g.enable(g.BLEND);
    g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
    g.disable(g.DEPTH_TEST);
  }
  draw(items, camera) {
    const g = this.gl;
    if (this.lost || g.isContextLost()) return false;
    g.viewport(0, 0, this.canvas.width, this.canvas.height);
    g.clearColor(4 / 255, 9 / 255, 17 / 255, 1);
    g.clear(g.COLOR_BUFFER_BIT);
    g.useProgram(this.program);
    g.bindVertexArray(this.vao);
    g.bindBuffer(g.ARRAY_BUFFER, this.buffer);
    g.uniform4f(
      this.cameraLocation,
      camera.x,
      camera.y,
      Math.cos(camera.angle),
      Math.sin(camera.angle),
    );
    g.uniform1f(this.zoomLocation, camera.zoom);
    this.drawCalls = 0;
    let count = 0,
      current = null;
    const flush = () => {
      if (!count) return;
      g.bindTexture(g.TEXTURE_2D, this.textures[current]);
      g.bufferSubData(g.ARRAY_BUFFER, 0, this.vertices.subarray(0, count * 30));
      g.drawArrays(g.TRIANGLES, 0, count * 6);
      this.drawCalls++;
      count = 0;
    };
    for (const p of items) {
      const s = this.assets.regions[p.sprite];
      if (s.texture !== current || count === this.capacity) {
        flush();
        current = s.texture;
      }
      const source = this.assets[s.texture],
        cx = Math.cos(p.angle),
        sy = Math.sin(p.angle),
        left = -p.w / 2,
        top = -p.h / 2;
      let k = count * 30;
      for (const [u, v] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [0, 1],
        [1, 0],
        [1, 1],
      ]) {
        const x = left + u * p.w,
          y = top + v * p.h;
        this.vertices[k++] = p.x + x * cx - y * sy;
        this.vertices[k++] = p.y + x * sy + y * cx;
        this.vertices[k++] = (s.x + u * s.w) / source.width;
        this.vertices[k++] = (s.y + v * s.h) / source.height;
        this.vertices[k++] = p.alpha;
      }
      count++;
    }
    flush();
    return true;
  }
  dispose() {
    const g = this.gl;
    this.canvas.removeEventListener("webglcontextlost", this.onLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onRestored);
    if (g && !g.isContextLost()) {
      for (const t of Object.values(this.textures || {})) g.deleteTexture(t);
      g.deleteBuffer(this.buffer);
      g.deleteVertexArray(this.vao);
      g.deleteProgram(this.program);
    }
  }
}
