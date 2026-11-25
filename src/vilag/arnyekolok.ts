// GLSL ES 3.00 sources of the world. No buffers for the particles: every one is computed from gl_VertexID (a fixed integer hash, never Math.random), so the picture is the same on every run.
// Colours arrive as linear uniforms read from the CSS tokens; nothing here is a colour literal.
// What carries meaning is only the data: the thread's height is the true series, the floor's rungs are the run's own hours, the markers sit on the true extremes, the end picture is the true block means.
// What is atmosphere: strand spread, swirl, haze, comets, bloom, vignette, grain, depth of field, light shafts, dust, the mirror on the floor and the glow behind the focus.
// Principle: the data stays sharp (the thread, the markers, the picture blocks), only the dressing is blurred or glowing.
// A look (nezet.ts) is a handful of numbers (u_h, u_k, u_l, u_n, u_o and the composite's u_q); this file knows no look, only what a number does. The strands are drawn either as points or, in the
// LINES variant, as hairline comets (head and tail of the same particle), each with its own gain, so a look can cross-fade from one to the other.

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
uniform vec4 u_g;          // density compensation (1 at the reference count), the strands' gain in this draw (a look cross-fades points and comets), the picture's centre height, the entrance (0..1: the atmosphere coming in)
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
  int md = int(u_e.y + 0.5);   // 0 strand particles, 2 dust, 3 thread tube, 4 marker core, 5 marker halo, 6 thread polyline
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
    v_col = mix(u_pen, u_hot, 0.3) * u_l.w * (0.4 + h1(id * 3u + 106u)) * exp(-dd2 * 0.035) * nearFade * smoothstep(0.0, 0.03, uu) * smoothstep(1.0, 0.97, uu) * (1.0 - smoothstep(0.35, 0.85, u_b.z)) * (14.0 / szd) * (14.0 / szd) * 4.0 * u_g.w;
    v_sq = 0.0; v_bl = 1.0;
    return;
  }
  if (md == 3) {   // the thread's soft halo, a tube of discs around the true centre line (the thread itself is the polyline, md 6)
    float us = float(id) / u_e.z;
    vec3 ps = vec3(cx(us), (clamp((vAt(us) - u_a.z) / max(u_a.w - u_a.z, 1e-3), 0.0, 1.0) - 0.5) * u_b.y, -us * u_b.x);
    float mir = 1.0;
    if (u_n.x > 0.5) { float hh = ps.y - u_n.y; ps.y = u_n.y - hh; mir = u_n.z * exp(-max(hh, 0.0) * 0.45) * (1.0 - smoothstep(0.3, 0.7, u_b.z)); }
    vec4 cs = u_vp * vec4(ps, 1.0);
    float ds = length(ps - u_eye);
    gl_Position = cs;
    float w0 = clamp(0.03 * u_b.w / max(ds, 0.5), 1.5, 9.0);
    float cnt = 2400.0 / u_e.z;   // the tube is drawn with many points so it stays a line close up; the gain keeps its brightness
    float w1 = clamp(w0 * 4.5, 7.0, 30.0);
    float gn = u_n.w * (w0 / w1) * (w0 / w1) * 6.0 * cnt * u_g.w;
    gl_PointSize = w1;
    v_col = mix(u_pen, u_hot, 0.6) * gn * mir * exp(-ds * 0.03) * smoothstep(0.0, 0.02, us) * smoothstep(1.0, 0.98, us) * smoothstep(0.7, 2.6, ds) * (1.0 - smoothstep(0.0, 0.5, u_b.z));
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
    v_col = mix(u_pen, u_hot, 0.6) * u_k.z * 0.55 * mir * exp(-ds * 0.03) * smoothstep(0.0, 0.02, us) * smoothstep(1.0, 0.98, us) * smoothstep(0.7, 2.6, ds) * (1.0 - smoothstep(0.0, 0.5, u_b.z));
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
    float gn = md == 4 ? 2.6 : 1.1;   // the core is a bright dot; the outer sprite is a reticle ring (v_sq = 2), a measuring mark around the true extreme
    v_col = mix(u_pen, u_hot, 0.8) * gn * u_o.z * smoothstep(0.7, 2.6, ds) * (1.0 - smoothstep(0.0, 0.5, u_b.z));
    v_sq = md == 4 ? 0.0 : 2.0; v_bl = 0.0;
    return;
  }
  float hA = h1(id * 3u + 1u), hB = h1(id * 3u + 2u), hC = h1(id * 3u + 3u);
  uint k = id % 32u;
  float kA = h1(k * 7u + 11u), kB = h1(k * 7u + 13u), kC = h1(k * 7u + 17u);
  float nPic = u_c.x * u_c.y * u_c.z;
  bool inPic = float(id) < nPic;
  float m = 0.0; vec3 pic = vec3(0.0);
  if (inPic) {   // the picture is painted from the top row down (a screen), with a little hash in it so that a row does not arrive as one line
    float rowN = float((id / uint(u_c.z)) / uint(u_c.x)) / u_c.y;
    float dly = 0.34 * rowN + 0.21 * h1(id * 5u + 11u);
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
    tgt = vec3(((float(col) + 0.5 + j.x) / u_c.x - 0.5) * u_e.x, (0.5 - (float(row) + 0.5 + j.y) / u_c.y) * hp + u_g.z, u_c.w);
    pic = srgb2lin(texelFetch(u_pic, ivec2(int(col), int(row)), 0).rgb);
  }
  vec3 pos = mix(p, tgt, m);
  pos += (vec3(h1(id * 5u + 13u), h1(id * 5u + 15u), h1(id * 5u + 17u)) - 0.5) * sin(3.14159265 * m) * 3.0;   // the arc the particles take in
  float mirK = 1.0;
  if (u_n.x > 0.5) {   // the glossy floor: the strands again, upside down and dim; the picture's own reflection fades with height and is not dissolved with the strands
    float hh = pos.y - u_n.y; pos.y = u_n.y - hh;
    mirK = u_n.z * exp(-max(hh, 0.0) * (inPic ? 0.34 : 0.45)) * (inPic ? 1.0 : 1.0 - smoothstep(0.3, 0.7, u_b.z));
  }

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
  vec3 colD = mix(u_pen, u_hot, pow(vn, u_l.x)) * (u_k.x + pow(vn, u_k.y)) * u_h.y * fog * fade * en * (inPic ? 1.0 : u_g.x * u_g.y) * mix(1.0, u_l.z, tl) * u_g.w;
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
  if (v_sq > 1.5) {   // a reticle: a thin ring and a faint disc inside it
    float r = sqrt(r2);
    float ring = smoothstep(0.82, 0.88, r) * (1.0 - smoothstep(0.92, 0.98, r));
    o = vec4(v_col * (ring + 0.18 * pow(max(1.0 - r2, 0.0), 2.0)), 1.0);
    return;
  }
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

// The formation scenes (chapters 3 to 5: kepzes.ts): particles that arrive and settle into TARGETS, short segments or points read from a float texture (cel.ts: four RGBA32F texels a target), and static
// hairlines (the floor, guides, frames, the thread). Every particle is again computed from gl_VertexID and the integer hash: no buffers, no randomness. The data is in the targets and the lines; the
// shader only moves, sizes and dims. Points and hairline comets are drawn with their own gains (the look cross-fades them), exactly as in the first scene.
export const KEPZES_VS = `${KOZOS}
uniform sampler2D u_cel;   // RGBA32F, 1024 texels a row, four texels a target (cel.ts)
uniform mat4 u_vp;
uniform vec3 u_eye, u_right, u_up;
uniform vec4 u_a;          // time s, the formation clock, targets, settle time (clock units)
uniform vec4 u_b;          // the way the particles travel when they arrive (unit vector), how far upstream they start
uniform vec4 u_c;          // K = canvas height px / (2 tan(fov/2)), max sprite px, radius of the unformed cloud, a comet's length (world units)
uniform vec4 u_d;          // pointer ndc x, y, strength 0..1, aspect
uniform vec4 u_f;          // depth of field: focus distance, aperture (world), max bokeh px, on (0/1)
uniform vec4 u_g;          // density compensation, the look's comet gain, the scene's exposure, the entrance (0..1)
uniform vec4 u_h;          // look: strand spread scale, sprite size scale, comet tail dim, 0
uniform vec4 u_n;          // layers: mirror on (0/1), floor height, mirror gain, ring pass (0 particles, 1 the reticle rings)
uniform vec4 u_grp[8];     // the groups the scene moves and dims as wholes: dx dy dz alpha
uniform vec3 u_pen, u_hot;
out vec3 v_col; out float v_sq; out float v_bl;

vec4 cel(int c, int f){ int i = c * 4 + f; return texelFetch(u_cel, ivec2(i & 1023, i >> 10), 0); }
// how far target-time has settled a particle: the target begins at its delay, each particle a little after it
float formM(float kes, float hA){
  float dur = max(u_a.w, 1e-3);
  float x = clamp((u_a.y - (kes + 0.5 * dur * hA)) / (0.5 * dur), 0.0, 1.0);
  return x * x * (3.0 - 2.0 * x);
}
vec3 hide(){ v_col = vec3(0.0); v_sq = 0.0; v_bl = 0.0; gl_PointSize = 1.0; gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return vec3(0.0); }

void main(){
  int nT = int(u_a.z + 0.5);
  if (u_n.w > 0.5) {   // the reticle rings: one vertex per target, a ring only where the target says so (a measuring mark: "now", a lit sheet)
    int c = gl_VertexID;
    vec4 t3 = cel(c, 3);
    if (c >= nT || t3.y < 0.5) { hide(); return; }
    vec4 t0 = cel(c, 0), t1 = cel(c, 1), t2 = cel(c, 2);
    vec4 G = u_grp[int(t3.x + 0.5)];
    vec3 pm = t0.xyz + t1.xyz * 0.5 + G.xyz;
    float mk = 1.0;
    if (u_n.x > 0.5) { float hh = pm.y - u_n.y; pm.y = u_n.y - hh; mk = u_n.z * exp(-max(hh, 0.0) * 0.45); }
    float ds = length(pm - u_eye);
    gl_Position = u_vp * vec4(pm, 1.0);
    gl_PointSize = clamp(0.4 * u_c.x * t2.y / max(ds, 0.5), 14.0, 46.0);
    float m = formM(t1.w, 0.5);
    v_col = mix(u_pen, u_hot, t2.x) * t0.w * 1.1 * m * G.w * mk * smoothstep(0.7, 2.6, ds) * u_g.w;
    v_sq = 2.0; v_bl = 0.0;
    return;
  }
#ifdef LINES
  uint id = uint(gl_VertexID) >> 1; float tl = float(gl_VertexID & 1);   // a comet: head (0) and tail (1) of one particle
#else
  uint id = uint(gl_VertexID); float tl = 0.0;
#endif
  int c = int(id % uint(nT));
  vec4 t0 = cel(c, 0), t1 = cel(c, 1), t2 = cel(c, 2), t3 = cel(c, 3);
  if (t3.y > 0.5) { hide(); return; }   // a ring target has no particles
  float hA = h1(id * 7u + 1u), hB = h1(id * 7u + 2u), hC = h1(id * 7u + 3u), hD = h1(id * 7u + 4u);
  vec4 G = u_grp[int(t3.x + 0.5)];
  float m = formM(t1.w, hA);
  // where along its segment the particle sits: a flowing target streams its particles along the segment (a wrap, faded at the ends)
  float s = fract(hB + u_a.x * t2.z);
  float seg = t2.z > 0.0 ? smoothstep(0.0, 0.05, s) * smoothstep(1.0, 0.95, s) : 1.0;
  if (t2.z <= 0.0) s = hB;
  float tailS = (t2.z > 0.0 ? u_c.w * tl / max(length(t1.xyz), 0.05) : 0.0);
  // a strand around the segment: a ball of the target's radius, the radius itself skewed toward the line
  vec3 rnd = vec3(h1(id * 7u + 5u), h1(id * 7u + 6u), h1(id * 7u + 7u)) - 0.5;
  float rr = t2.w * u_h.x * (0.2 + 1.6 * hC * hC);
  vec3 off = rnd / max(length(rnd), 1e-3) * rr;
  vec3 tgt = t0.xyz + t1.xyz * (s - tailS) + off + G.xyz;
  // upstream: far along the arrival direction, scattered, then the path in (an arc, so a cloud does not arrive as a line)
  vec3 scat = (vec3(h1(id * 7u + 8u), h1(id * 7u + 9u), h1(id * 7u + 10u)) - 0.5) * 2.0 * u_c.z;
  vec3 src = tgt - u_b.xyz * u_b.w * (0.55 + 0.9 * hD) + scat;
  vec3 arc = (vec3(h1(id * 7u + 11u), h1(id * 7u + 12u), h1(id * 7u + 13u)) - 0.5) * 2.4;
  float mt = max(m - tl * (u_c.w / max(u_b.w, 1.0)) * 1.6 * (1.0 - m), 0.0);   // the tail of a comet lies back along the way in, and is gone once the particle has settled
  vec3 pos = mix(src, tgt, mt) + arc * sin(3.14159265 * mt);
  float mk = 1.0;
  if (u_n.x > 0.5) { float hh = pos.y - u_n.y; pos.y = u_n.y - hh; mk = u_n.z * exp(-max(hh, 0.0) * 0.45); }

  // the pointer pushes the cloud apart in the view plane (a response to input, never idle motion)
  vec4 cl = u_vp * vec4(pos, 1.0);
  vec2 nd = cl.xy / cl.w;
  vec2 dd = (nd - u_d.xy) * vec2(u_d.w, 1.0);
  float f = exp(-dot(dd, dd) * 9.0) * u_d.z * (1.0 - 0.7 * m);
  vec2 dir = dd / (length(dd) + 1e-3);
  float dist = length(pos - u_eye);
  pos += (u_right * dir.x + u_up * dir.y) * f * 0.09 * dist;
  cl = u_vp * vec4(pos, 1.0);
  dist = length(pos - u_eye);
  gl_Position = cl;

  float dData = 0.045 * (0.6 + 1.2 * hC * hC) * u_h.y * t2.y;
  float sz = dData * u_c.x / max(dist, 0.5);
  float coc = u_f.w * u_f.y * u_c.x * abs(1.0 / max(dist, 0.5) - 1.0 / max(u_f.x, 0.5));
  float sz1 = clamp(sz, 1.0, u_c.y);
  float sz2 = clamp(sqrt(sz * sz + coc * coc), 1.0, max(u_c.y, u_f.z * u_f.w));
  gl_PointSize = sz2;
  float en = pow(sz1 / sz2, 2.0);
  float fade = smoothstep(0.0, 0.14, m) * seg * smoothstep(1.4, 6.0, dist) * exp(-dist * 0.03);
  // what a look with comets (u_g.y > 0) does: the particles that are still arriving are comets, the ones that have settled are points (a picture is read, not streaked); with no comets all are points
  float st = smoothstep(0.8, 1.0, m);
#ifdef LINES
  float pg = u_g.y * (1.0 - st);
#else
  float pg = (1.0 - u_g.y) + u_g.y * st;
#endif
  v_col = mix(u_pen, u_hot, t2.x) * t0.w * u_g.x * pg * u_g.z * u_g.w * fade * en * G.w * mk * mix(1.0, u_h.z, tl);
  v_sq = 0.0; v_bl = clamp(coc / 16.0, 0.0, 1.0);
}`
export const KEPZES_VS_L = KEPZES_VS.replace('#version 300 es', '#version 300 es\n#define LINES')

// The static hairlines of a formation scene (cel.ts `VonalEpito`): position, then layer (0 floor, 1 guides, 2 frames, 3 the thread), colour class (0 neutral structure, 1 data pen, 2 hot pen; +4 for each group the
// line belongs to, so a sheet's frame moves with the sheet) and the vertex's own gain. The four layer strengths come in as one uniform: the look's gain times how far the scene has formed.
export const VONAL_VS = `#version 300 es
precision highp float;
in vec3 a_p; in vec3 a_k;
uniform mat4 u_vp; uniform vec3 u_eye; uniform vec4 u_l; uniform vec4 u_n; uniform vec4 u_grp[8];
uniform vec3 u_ink, u_pen, u_hot;
out vec3 v_c;
void main(){
  int L = int(a_k.x + 0.5);
  int kc = int(a_k.y + 0.5);
  int cl = kc - (kc / 4) * 4;
  vec4 G = u_grp[kc / 4];
  vec3 p = a_p + G.xyz;
  float mir = 1.0;
  if (u_n.x > 0.5) {   // the glossy floor: every line but the floor's own again, upside down and dim
    float hh = max(p.y - u_n.y, 0.0); p.y = u_n.y - hh; mir = L == 0 ? 0.0 : u_n.z * exp(-hh * 0.45);
  }
  gl_Position = u_vp * vec4(p, 1.0);
  float d = length(p - u_eye);
  float lg = L == 0 ? u_l.x : (L == 1 ? u_l.y : (L == 2 ? u_l.z : u_l.w));
  vec3 col = cl == 0 ? u_ink : (cl == 1 ? u_pen : u_hot);
  v_c = col * a_k.z * lg * mir * G.w * exp(-d * 0.03) * smoothstep(1.0, 4.0, d);
}`

// The floor: rails, minute rungs (every 10 min), hour rungs, drop lines from the thread to the floor, the curtain's hairlines (a sheet of light from the thread down to the floor, a line at every minute),
// and the picture's frame (crop marks, ticks, dimension lines). Static geometry built from the series (racs.ts).
export const GRID_VS = `#version 300 es
precision highp float;
in vec3 a_p; in vec2 a_k;   // position; (kind 0 rail, 1 minute rung, 2 hour rung, 3 drop line, 4 frame, 5 curtain hairline; t: across the floor -1..1, or along a drop line / hairline 0 floor .. 1 thread)
uniform mat4 u_vp; uniform vec3 u_eye; uniform vec3 u_col; uniform vec3 u_pen; uniform vec4 u_s; uniform vec4 u_t;
// u_s: floor gain, drop gain, picture morph, frame gain; u_t: curtain gain, mirror on (0/1), mirror gain, floor height. u_col is a neutral token (structure), u_pen the data pen (the curtain is light from the data).
out vec3 v_c;
void main(){
  vec3 p = a_p;
  float kd = a_k.x, g, fade = 1.0 - smoothstep(0.3, 0.75, u_s.z), mir = 1.0;
  if (kd > 4.5 && u_t.y > 0.5) { float hh = max(p.y - u_t.w, 0.0); p.y = u_t.w - hh; mir = u_t.z * exp(-hh * 0.45); }   // the curtain again, upside down on the glossy floor
  gl_Position = u_vp * vec4(p, 1.0);
  float d = length(p - u_eye);
  float across = 1.0 - smoothstep(0.55, 1.0, abs(a_k.y));
  if (kd < 0.5) { g = 0.16 * u_s.x * across; fade = mix(1.0, 0.5, smoothstep(0.3, 0.75, u_s.z)); }   // the rails stay under the picture, dimmer
  else if (kd < 1.5) { g = 0.10 * u_s.x * across; fade = mix(1.0, 0.5, smoothstep(0.3, 0.75, u_s.z)); }
  else if (kd < 2.5) g = 0.42 * u_s.x * across;
  else if (kd < 3.5) g = (0.10 + 0.55 * a_k.y * a_k.y) * u_s.y;
  else if (kd < 4.5) { g = 0.55 * u_s.w; fade = smoothstep(0.55, 0.9, u_s.z); }   // the frame belongs to the picture: it is drawn only as the picture forms
  else g = u_t.x * 0.5 * pow(a_k.y, 2.2) * smoothstep(0.05, 0.42, abs(p.x - u_eye.x) / d);   // a sheet seen edge-on is one bright line: its hairlines would pile up, so it fades as the view runs along it
  v_c = (kd > 4.5 ? u_pen : u_col) * g * fade * mir * exp(-d * 0.035) * smoothstep(1.0, 4.0, d);
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
in vec2 v_uv; uniform sampler2D u_scene, u_b0, u_b1, u_b2, u_sh; uniform vec4 u_p; uniform vec4 u_q; uniform vec4 u_gl; uniform vec3 u_gc; uniform vec4 u_g2; uniform vec3 u_g2c; uniform vec2 u_res; uniform vec3 u_bg, u_w; out vec4 o;
// u_p: bloom strength, grain amount, colour fringe, frame seed (0 while the world is still); u_q: light shaft strength, vignette strength, exposure, 0;
// u_w: the weights of the three bloom levels (the light tier sets the last to 0); u_gl: backdrop glow strength, centre uv, radius; u_gc: its colour (a token);
// u_g2: the picture's light on the floor: strength, centre uv, half height (a flat ellipse, three times as wide); u_g2c: its colour (the picture's own mean colour, from the data)
vec3 shoulder(vec3 x){ vec3 t = max(x - 0.7, 0.0); return min(x, vec3(0.7)) + 0.3 * (1.0 - exp(-t / 0.3)); }
void main(){
  vec2 d = v_uv - 0.5;
  float ca = u_p.z * dot(d, d);
  vec3 col = vec3(texture(u_scene, v_uv + d * ca).r, texture(u_scene, v_uv).g, texture(u_scene, v_uv - d * ca).b);
  vec3 bl = texture(u_b0, v_uv).rgb * u_w.x + texture(u_b1, v_uv).rgb * u_w.y + texture(u_b2, v_uv).rgb * u_w.z;
  col += bl * u_p.x;
  col += texture(u_sh, v_uv).rgb * u_q.x;
  vec2 gd = (v_uv - u_gl.yz) * vec2(u_res.x / u_res.y, 1.0);
  col += u_gc * u_gl.x * exp(-dot(gd, gd) / (u_gl.w * u_gl.w));   // a faint glow behind the focus: the scene has air
  vec2 sd = (v_uv - u_g2.yz) * vec2(u_res.x / u_res.y, 1.0);
  col += u_g2c * u_g2.x * exp(-(sd.x * sd.x / (u_g2.w * u_g2.w * 10.0) + sd.y * sd.y / (u_g2.w * u_g2.w)));   // the screen's light spilling on the stage floor
  col = shoulder(col * u_q.z);
  float asp = u_res.x / u_res.y;
  float vig = smoothstep(0.25, 1.1, length(d * vec2(asp, 1.0)));
  col = mix(col, u_bg * 0.6, vig * u_q.y);
  vec3 s = lin2srgb(col);
  float n = h1(uint(gl_FragCoord.x) * 1973u + uint(gl_FragCoord.y) * 9277u + uint(u_p.w) * 26699u) - 0.5;
  o = vec4(s + n * u_p.y, 1.0);
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
