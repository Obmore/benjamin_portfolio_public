// GLSL ES 3.00 sources of the M0b world. No buffers: every particle is computed from gl_VertexID (a fixed integer hash, never Math.random),
// so the picture is the same on every run. Colours arrive as linear uniforms read from the CSS tokens; nothing here is a colour literal.
// What carries meaning is only the data: the ribbon's height is the true series, the end picture is the true block means.
// What is atmosphere: strand spread, swirl, haze, bloom, vignette, grain, and (M0b.3) depth of field, light shafts, lens streak and dust.
// Principle of M0b.3: the data stays sharp (the thread, the picture blocks), only the dressing is blurred or glowing.
// M0b.4: layers (floor grid with hour rungs, drop lines, mirror, thread tube, markers at the true extremes, backdrop glow) and looks.
// A look (preset) is a handful of numbers (u_h, u_k, u_l and the composite's u_q); the old look is the default values. A look may draw the strands as hairline comets (LINES).

const KOZOS = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uint pcg(uint v){ uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float h1(uint v){ return float(pcg(v)) * (1.0 / 4294967295.0); }
vec3 srgb2lin(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 lin2srgb(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
`

export const PART_VS = `${KOZOS}
uniform sampler2D u_ser;   // R32F, N x 1: the true series, index 0 = oldest minute
uniform sampler2D u_pic;   // RGBA8 sRGB: block colours of the real capture, cols x rows
uniform mat4 u_vp;
uniform vec3 u_eye, u_right, u_up;
uniform vec4 u_a;          // time s, N-1, vmin, vmax
uniform vec4 u_b;          // ribbon length, height amplitude, picture morph 0..1, K = canvas height px / (2 tan(fov/2))
uniform vec4 u_c;          // picture cols, rows, particles per cell, picture z
uniform vec4 u_d;          // pointer ndc x, y, strength 0..1, aspect
uniform vec4 u_e;          // picture width (world), mode (0 particles, 1 the thread, 2 dust), thread point count, max sprite px
uniform vec4 u_f;          // depth of field: focus distance, aperture (world), max bokeh px, on (0/1)
uniform vec4 u_g;          // density compensation (1 at the reference count), 0, 0, 0
uniform vec4 u_h;          // look: strand spread scale, data exposure, sprite size scale, haze spread
uniform vec4 u_k;          // look: brightness floor, brightness power, thread gain, picture exposure
uniform vec4 u_l;          // look: hot-mix power, comet length (ribbon fraction), comet tail dim, dust gain
uniform vec4 u_n;          // layers: mirror on (0/1), floor height, mirror gain, thread halo gain
uniform vec4 u_o;          // layers: ribbon position of the series maximum and minimum (0 = newest), marker gain, 0
uniform vec3 u_pen, u_hot;
out vec3 v_col; out float v_sq; out float v_bl;

float vAt(float u){        // u = 0 is the newest minute, 1 the oldest
  float f = (1.0 - u) * u_a.y; int i0 = int(floor(f)); float fr = f - float(i0); int i1 = min(i0 + 1, int(u_a.y));
  return mix(texelFetch(u_ser, ivec2(i0, 0), 0).r, texelFetch(u_ser, ivec2(i1, 0), 0).r, fr);
}
float cx(float u){ return 2.2 * sin(u * 9.0) + 0.9 * sin(u * 23.0 + 1.3); }

void main(){
#ifdef LINES
  uint id = uint(gl_VertexID) >> 1; float tl = float(gl_VertexID & 1);   // a comet: head (0) and tail (1) of one strand particle
#else
  uint id = uint(gl_VertexID); float tl = 0.0;
#endif
  int md = int(u_e.y + 0.5);   // 0 strand particles, 1 thread core, 2 dust, 3 thread halo, 4 marker core, 5 marker halo
  if (md == 2) {   // dust: faint out-of-focus specks around the flight path (atmosphere, carries no value)
    float uu = fract(h1(id * 3u + 101u) - u_a.x * 0.004);
    vec3 base = vec3(cx(uu), (clamp((vAt(uu) - u_a.z) / max(u_a.w - u_a.z, 1e-3), 0.0, 1.0) - 0.5) * u_b.y, -uu * u_b.x);
    float rr = 1.4 + 7.5 * h1(id * 3u + 102u);
    float aa = 6.2831853 * h1(id * 3u + 103u) + u_a.x * 0.03 * (0.5 + h1(id * 3u + 104u));
    vec3 pd = base + vec3(rr * cos(aa), rr * sin(aa) * 0.7, 0.0);
    float dd2 = length(pd - u_eye);
    gl_Position = u_vp * vec4(pd, 1.0);
    float coc = u_f.y * u_b.w * abs(1.0 / max(dd2, 0.5) - 1.0 / max(u_f.x, 0.5));
    float szd = clamp(max(coc, 5.0) * (0.55 + 0.9 * h1(id * 3u + 105u)), 4.0, u_f.z);
    gl_PointSize = szd;
    float nearFade = smoothstep(2.0, 7.0, dd2);
    v_col = mix(u_pen, u_hot, 0.3) * u_l.w * (0.4 + h1(id * 3u + 106u)) * exp(-dd2 * 0.035) * nearFade * smoothstep(0.0, 0.03, uu) * smoothstep(1.0, 0.97, uu) * (1.0 - smoothstep(0.35, 0.85, u_b.z)) * (14.0 / szd) * (14.0 / szd) * 4.0;
    v_sq = 0.0; v_bl = 1.0;
    return;
  }
  if (md == 1 || md == 3) {   // the trace itself: a thin bright thread along the true centre line (what the particles flow along); md 3 is its soft halo (a tube)
    float us = float(id) / u_e.z;
    vec3 ps = vec3(cx(us), (clamp((vAt(us) - u_a.z) / max(u_a.w - u_a.z, 1e-3), 0.0, 1.0) - 0.5) * u_b.y, -us * u_b.x);
    float mir = 1.0;
    if (u_n.x > 0.5) { float hh = ps.y - u_n.y; ps.y = u_n.y - hh; mir = u_n.z * exp(-max(hh, 0.0) * 0.45) * (1.0 - smoothstep(0.3, 0.7, u_b.z)); }
    vec4 cs = u_vp * vec4(ps, 1.0);
    float ds = length(ps - u_eye);
    gl_Position = cs;
    float w0 = clamp(0.03 * u_b.w / max(ds, 0.5), 1.5, u_n.w > 0.0 ? 9.0 : 5.0);
    float cnt = 2400.0 / u_e.z;   // the thread is drawn with more points so it stays a line close up; the gain keeps its brightness
    float gn = u_k.z * cnt;
    if (md == 3) { float w1 = clamp(w0 * 4.5, 7.0, 30.0); gn = u_n.w * (w0 / w1) * (w0 / w1) * 6.0 * cnt; w0 = w1; }
    gl_PointSize = w0;
    v_col = mix(u_pen, u_hot, 0.6) * gn * mir * exp(-ds * 0.02) * smoothstep(0.0, 0.02, us) * smoothstep(1.0, 0.98, us) * smoothstep(0.7, 2.6, ds) * (1.0 - smoothstep(0.0, 0.5, u_b.z));
    v_sq = 0.0; v_bl = 0.0;   // soft discs: a flat bokeh disc would make the tube a string of beads
    return;
  }
  if (md == 6) {   // the thread as a polyline through the true samples (a line strip: vertex i IS minute i); u_e.z = a sideways offset in px, so three strips make a line a little over 2 px wide
    uint sid = uint(gl_VertexID);
    float us = 1.0 - float(sid) / u_a.y;
    float val = texelFetch(u_ser, ivec2(int(sid), 0), 0).r;
    vec3 ps = vec3(cx(us), (clamp((val - u_a.z) / max(u_a.w - u_a.z, 1e-3), 0.0, 1.0) - 0.5) * u_b.y, -us * u_b.x);
    float mir = 1.0;
    if (u_n.x > 0.5) { float hh = ps.y - u_n.y; ps.y = u_n.y - hh; mir = u_n.z * exp(-max(hh, 0.0) * 0.45) * (1.0 - smoothstep(0.3, 0.7, u_b.z)); }
    float ds = length(ps - u_eye);
    vec4 cs = u_vp * vec4(ps, 1.0);
    float hpx = u_b.w * 0.9326;   // canvas height in px (K = H / (2 tan 25 deg))
    cs.x += u_e.z * 2.0 / (hpx * u_d.w) * cs.w;
    gl_Position = cs;
    v_col = mix(u_pen, u_hot, 0.6) * u_k.z * 0.55 * mir * exp(-ds * 0.02) * smoothstep(0.0, 0.02, us) * smoothstep(1.0, 0.98, us) * smoothstep(0.7, 2.6, ds) * (1.0 - smoothstep(0.0, 0.5, u_b.z));
    v_sq = 0.0; v_bl = 0.0;
    return;
  }
  if (md >= 4 && md <= 5) {   // markers on the true extremes: id 0 the maximum, id 1 the minimum (a bright core and a soft halo)
    float um = id == 0u ? u_o.x : u_o.y;
    vec3 pm = vec3(cx(um), (id == 0u ? 0.5 : -0.5) * u_b.y, -um * u_b.x);
    float ds = length(pm - u_eye);
    gl_Position = u_vp * vec4(pm, 1.0);
    float w0 = clamp(0.12 * u_b.w / max(ds, 0.5), 6.0, 16.0);
    float w1 = clamp(0.7 * u_b.w / max(ds, 0.5), 22.0, 70.0);
    gl_PointSize = md == 4 ? w0 : w1;
    float gn = md == 4 ? 2.6 : 0.16 * (w0 / w1) * (w0 / w1) * 40.0;
    v_col = mix(u_pen, u_hot, 0.8) * gn * u_o.z * smoothstep(0.7, 2.6, ds) * (1.0 - smoothstep(0.0, 0.5, u_b.z));
    v_sq = 0.0; v_bl = 0.0;
    return;
  }
  float hA = h1(id * 3u + 1u), hB = h1(id * 3u + 2u), hC = h1(id * 3u + 3u);
  uint k = id % 32u;
  float kA = h1(k * 7u + 11u), kB = h1(k * 7u + 13u), kC = h1(k * 7u + 17u);
  float nPic = u_c.x * u_c.y * u_c.z;
  bool inPic = float(id) < nPic;
  float m = 0.0; vec3 pic = vec3(0.0);
  if (inPic) {
    float dly = 0.55 * h1(id * 5u + 11u);
    m = clamp((u_b.z - dly) / 0.45, 0.0, 1.0); m = m * m * (3.0 - 2.0 * m);
  }
  // time flows toward the viewer: a particle's place on the ribbon moves from old (u = 1) to new (u = 0) and wraps
  float uh = fract(hA - u_a.x * 0.012);
  float u = min(uh + tl * u_l.y * (1.0 - m), 1.0);   // the tail of a comet lies a little further back in time
  float v = vAt(u);
  float vn = clamp((v - u_a.z) / max(u_a.w - u_a.z, 1e-3), 0.0, 1.0);
  float th = 6.2831853 * kA + u * (3.0 + 4.0 * kB) + u_a.x * 0.15 * (0.4 + kC);
  float rho = (0.16 + 0.7 * kB * kB + 0.10 * hB) * u_h.x;
  if (hC > 0.9) rho *= u_h.w;                                // haze
  vec3 p = vec3(cx(u) + rho * cos(th), (vn - 0.5) * u_b.y + rho * sin(th) * 0.8, -u * u_b.x);   // the centre line's height IS the data
  p += (vec3(h1(id * 5u + 1u), h1(id * 5u + 2u), h1(id * 5u + 3u)) - 0.5) * 0.06;

  vec3 tgt = p;
  if (inPic) {
    uint cell = id / uint(u_c.z); uint col = cell % uint(u_c.x); uint row = cell / uint(u_c.x);
    vec2 j = vec2(h1(id * 5u + 7u), h1(id * 5u + 9u)) - 0.5;
    float hp = u_e.x * u_c.y / u_c.x;
    j *= 1.0 - 0.94 * m * m;   // the cloud settles into clean cells
    tgt = vec3(((float(col) + 0.5 + j.x) / u_c.x - 0.5) * u_e.x, (0.5 - (float(row) + 0.5 + j.y) / u_c.y) * hp, u_c.w);
    pic = srgb2lin(texelFetch(u_pic, ivec2(int(col), int(row)), 0).rgb);
  }
  vec3 pos = mix(p, tgt, m);
  pos += (vec3(h1(id * 5u + 13u), h1(id * 5u + 15u), h1(id * 5u + 17u)) - 0.5) * sin(3.14159265 * m) * 3.0;   // the arc the particles take in
  float mirK = 1.0;
  if (u_n.x > 0.5) { float hh = pos.y - u_n.y; pos.y = u_n.y - hh; mirK = u_n.z * exp(-max(hh, 0.0) * 0.45) * (1.0 - smoothstep(0.3, 0.7, u_b.z)); }   // the glossy floor: the strands again, upside down and dim

  // the pointer pushes the cloud apart in the view plane (a response to input, never idle motion)
  vec4 cl = u_vp * vec4(pos, 1.0);
  vec2 nd = cl.xy / cl.w;
  vec2 dd = (nd - u_d.xy) * vec2(u_d.w, 1.0);
  float f = exp(-dot(dd, dd) * 9.0) * u_d.z * (1.0 - 0.75 * m);
  vec2 dir = dd / (length(dd) + 1e-3);
  float dist = length(pos - u_eye);
  pos += (u_right * dir.x + u_up * dir.y) * f * 0.09 * dist;
  cl = u_vp * vec4(pos, 1.0);
  dist = length(pos - u_eye);

  float dData = 0.045 * (0.6 + 1.2 * hC * hC) * u_h.z;
  float dPic = u_e.x / u_c.x * 0.92;
  gl_Position = cl;
  float sz = mix(dData, dPic, m) * u_b.w / max(dist, 0.5);
  float coc = (1.0 - m) * u_f.w * u_f.y * u_b.w * abs(1.0 / max(dist, 0.5) - 1.0 / max(u_f.x, 0.5));   // the picture's blocks never blur
  float sz1 = clamp(sz, 1.0, u_e.w);
  float sz2 = clamp(sqrt(sz * sz + coc * coc), 1.0, max(u_e.w, u_f.z * u_f.w));
  gl_PointSize = sz2;
  float en = pow(sz1 / sz2, 2.0);   // energy: a bigger blur disc is dimmer (not fully conserved, so bokeh stays visible)

  float fade = smoothstep(0.0, 0.03, uh) * smoothstep(1.0, 0.97, uh) * smoothstep(1.4, 6.0, dist);
  float fog = exp(-dist * 0.03);
  vec3 colD = mix(u_pen, u_hot, pow(vn, u_l.x)) * (u_k.x + pow(vn, u_k.y)) * u_h.y * fog * fade * en * (inPic ? 1.0 : u_g.x) * mix(1.0, u_l.z, tl);
  vec3 colP = pic / u_c.z * u_k.w;
  float away = inPic ? 0.0 : smoothstep(0.0, 0.6, u_b.z);   // the strands that are not part of the picture dissolve
  v_col = mix(colD, colP, m) * (1.0 - away) * mirK;
  v_sq = m; v_bl = clamp(coc / 16.0, 0.0, 1.0);
}`

export const PART_FS = `${KOZOS}
in vec3 v_col; in float v_sq; in float v_bl; out vec4 o;
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(q, q);
  float disc = pow(max(1.0 - r2, 0.0), 2.0);
  float bok = (1.0 - smoothstep(0.82, 1.0, sqrt(r2))) * (0.6 + 0.4 * smoothstep(0.35, 0.92, sqrt(r2)));   // out of focus: a flat disc with a brighter rim
  float sq = 1.0 - smoothstep(0.94, 1.0, max(abs(q.x), abs(q.y)));
  o = vec4(v_col * mix(mix(disc, bok, v_bl), sq, v_sq), 1.0);
}`

export const PART_VS_L = PART_VS.replace('#version 300 es', '#version 300 es\n#define LINES')
export const LINE_FS = `#version 300 es
precision highp float;
in vec3 v_col; in float v_sq; in float v_bl; out vec4 o;
void main(){ o = vec4(v_col, 1.0); }`

// The floor: rails, minute rungs (every 10 min), hour rungs, and drop lines from the thread to the floor. Static geometry built from the series (vilag.js).
export const GRID_VS = `#version 300 es
precision highp float;
in vec3 a_p; in vec2 a_k;   // position; (kind 0 rail, 1 minute rung, 2 hour rung, 3 drop line; t: across the floor -1..1, or along a drop line 0 floor .. 1 thread)
uniform mat4 u_vp; uniform vec3 u_eye; uniform vec3 u_col; uniform vec4 u_s;   // colour (a neutral token); floor gain, drop gain, picture morph
out vec3 v_c;
void main(){
  gl_Position = u_vp * vec4(a_p, 1.0);
  float d = length(a_p - u_eye);
  float kd = a_k.x, g;
  if (kd < 0.5) g = 0.16; else if (kd < 1.5) g = 0.10; else if (kd < 2.5) g = 0.42; else g = 0.10 + 0.55 * a_k.y * a_k.y;
  g *= kd > 2.5 ? u_s.y : u_s.x * (1.0 - smoothstep(0.55, 1.0, abs(a_k.y)));
  v_c = u_col * g * exp(-d * 0.035) * smoothstep(1.0, 4.0, d) * (1.0 - smoothstep(0.3, 0.75, u_s.z));
}`
export const GRID_FS = `#version 300 es
precision highp float;
in vec3 v_c; out vec4 o;
void main(){ o = vec4(v_c, 1.0); }`

export const FULL_VS = `#version 300 es
out vec2 v_uv;
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); v_uv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`

export const BRIGHT_FS = `${KOZOS}
in vec2 v_uv; uniform sampler2D u_src; uniform float u_thr; out vec4 o;
void main(){ vec3 c = texture(u_src, v_uv).rgb; float l = max(c.r, max(c.g, c.b)); o = vec4(c * smoothstep(u_thr, u_thr + 0.45, l), 1.0); }`

export const BLUR_FS = `${KOZOS}
in vec2 v_uv; uniform sampler2D u_src; uniform vec2 u_dir; out vec4 o;
void main(){
  vec3 s = texture(u_src, v_uv).rgb * 0.227027;
  s += (texture(u_src, v_uv + u_dir * 1.3846154).rgb + texture(u_src, v_uv - u_dir * 1.3846154).rgb) * 0.3162162;
  s += (texture(u_src, v_uv + u_dir * 3.2307692).rgb + texture(u_src, v_uv - u_dir * 3.2307692).rgb) * 0.0702703;
  o = vec4(s, 1.0);
}`

export const COMP_FS = `${KOZOS}
in vec2 v_uv; uniform sampler2D u_scene, u_b0, u_b1, u_b2, u_st, u_sh; uniform vec4 u_p; uniform vec4 u_q; uniform vec4 u_gl; uniform vec3 u_gc; uniform vec2 u_res; uniform vec3 u_bg; out vec4 o;
// u_gl: backdrop glow strength, centre uv, radius; u_gc: its colour (a token)
// u_p: bloom strength, grain amount, colour fringe, frame seed (0 while reduced motion keeps the world still); u_q: lens streak strength, light shaft strength, vignette strength, exposure
vec3 shoulder(vec3 x){ vec3 t = max(x - 0.7, 0.0); return min(x, vec3(0.7)) + 0.3 * (1.0 - exp(-t / 0.3)); }
void main(){
  vec2 d = v_uv - 0.5;
  float ca = u_p.z * dot(d, d);
  vec3 col = vec3(texture(u_scene, v_uv + d * ca).r, texture(u_scene, v_uv).g, texture(u_scene, v_uv - d * ca).b);
  vec3 bl = texture(u_b0, v_uv).rgb * 0.45 + texture(u_b1, v_uv).rgb * 0.6 + texture(u_b2, v_uv).rgb * 0.8;
  col += bl * u_p.x;
  col += texture(u_st, v_uv).rgb * u_q.x + texture(u_sh, v_uv).rgb * u_q.y;
  vec2 gd = (v_uv - u_gl.yz) * vec2(u_res.x / u_res.y, 1.0);
  col += u_gc * u_gl.x * exp(-dot(gd, gd) / (u_gl.w * u_gl.w));   // a faint glow behind the focus: the scene has air
  col = shoulder(col * u_q.w);
  float asp = u_res.x / u_res.y;
  float vig = smoothstep(0.25, 1.1, length(d * vec2(asp, 1.0)));
  col = mix(col, u_bg * 0.6, vig * u_q.z);
  vec3 s = lin2srgb(col);
  float n = h1(uint(gl_FragCoord.x) * 1973u + uint(gl_FragCoord.y) * 9277u + uint(u_p.w) * 26699u) - 0.5;
  o = vec4(s + n * u_p.y, 1.0);
}`

// Lens streak: a wide horizontal blur of the brightest parts (anamorphic look). Runs at quarter resolution.
export const STREAK_FS = `${KOZOS}
in vec2 v_uv; uniform sampler2D u_src; uniform vec2 u_dir; out vec4 o;
void main(){
  vec3 s = vec3(0.0); float ws = 0.0;
  for (int i = -24; i <= 24; i++) { float x = float(i); float w = exp(-abs(x) * 0.14); s += texture(u_src, v_uv + u_dir * x * 2.5).rgb * w; ws += w; }
  o = vec4(s / ws * 5.0, 1.0);
}`

// Light shafts: radial streaks from a light point (u_l.xy in uv, u_l.z strength) through the quarter-resolution glow.
export const SHAFT_FS = `${KOZOS}
in vec2 v_uv; uniform sampler2D u_src; uniform vec3 u_l; out vec4 o;
void main(){
  vec2 stp = (u_l.xy - v_uv) * (0.85 / 28.0);
  float j = h1(uint(gl_FragCoord.x) * 1973u + uint(gl_FragCoord.y) * 9277u + 17u);   // fixed integer hash: breaks banding, never random
  vec2 p = v_uv + stp * j; vec3 acc = vec3(0.0); float w = 1.0;
  for (int i = 0; i < 28; i++) { p += stp; acc += texture(u_src, p).rgb * w; w *= 0.945; }
  o = vec4(acc / 28.0 * u_l.z, 1.0);
}`
