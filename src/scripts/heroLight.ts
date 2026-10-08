import { Renderer, Program, Mesh, Triangle, Vec2 } from 'ogl';

// A soft gold light that drifts slowly and leans towards the cursor.
// Rendered with OGL (tiny WebGL library). Pauses when the hero is off screen.

const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uRes;
  varying vec2 vUv;

  void main() {
    float aspect = uRes.x / uRes.y;

    // Light that follows the cursor
    vec2 d1 = vUv - uMouse;
    d1.x *= aspect;
    float g1 = exp(-dot(d1, d1) * 6.0) * 0.42;

    // Slow drifting light behind the portrait
    vec2 c2 = vec2(0.70 + 0.05 * sin(uTime * 0.21), 0.60 + 0.05 * cos(uTime * 0.17));
    vec2 d2 = vUv - c2;
    d2.x *= aspect;
    float g2 = exp(-dot(d2, d2) * 3.2) * 0.30;

    float shimmer = 0.5 + 0.5 * sin(uTime * 0.5 + vUv.x * 5.0 + vUv.y * 3.0);
    vec3 gold = vec3(0.949, 0.761, 0.188);
    vec3 ember = vec3(0.878, 0.525, 0.118);
    vec3 col = gold * g1 + mix(ember, gold, shimmer) * g2;
    float a = clamp(g1 + g2, 0.0, 1.0);
    gl_FragColor = vec4(col, a);
  }
`;

export function initHeroLight(canvas: HTMLCanvasElement) {
  const renderer = new Renderer({ canvas, alpha: true, premultipliedAlpha: false, dpr: Math.min(window.devicePixelRatio, 1.5) });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);

  const program = new Program(gl, {
    vertex,
    fragment,
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new Vec2(0.72, 0.55) },
      uRes: { value: new Vec2(1, 1) },
    },
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  const host = canvas.parentElement as HTMLElement;
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height);
    program.uniforms.uRes.value.set(width, height);
  };
  resize();
  window.addEventListener('resize', resize);

  const target = new Vec2(0.72, 0.55);
  host.addEventListener('pointermove', (e) => {
    const r = host.getBoundingClientRect();
    target.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
  });

  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(host);

  let raf = 0;
  const loop = (t: number) => {
    raf = requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    const m = program.uniforms.uMouse.value as Vec2;
    m.x += (target.x - m.x) * 0.05;
    m.y += (target.y - m.y) * 0.05;
    program.uniforms.uTime.value = t * 0.001;
    renderer.render({ scene: mesh });
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}
