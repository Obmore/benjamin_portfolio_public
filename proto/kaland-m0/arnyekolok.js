// GLSL ES 3.00 sources. Colours arrive as linear uniforms (read from the CSS tokens, never typed here); output is sRGB-encoded.
// One cell shader for the fall / years (value field, pen mixed toward the paper by age) and for the screen (block colour, rows rising out of depth).

const KOZOS = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
vec3 lin2srgb(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 srgb2lin(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toOklab(vec3 c){
  float l = 0.4122214708*c.r + 0.5363325363*c.g + 0.0514459929*c.b;
  float m = 0.2119034982*c.r + 0.6806995451*c.g + 0.1073969566*c.b;
  float s = 0.0883024619*c.r + 0.2817188376*c.g + 0.6299787005*c.b;
  l = pow(l, 1.0/3.0); m = pow(m, 1.0/3.0); s = pow(s, 1.0/3.0);
  return vec3(0.2104542553*l + 0.7936177850*m - 0.0040720468*s, 1.9779984951*l - 2.4285922050*m + 0.4505937099*s, 0.0259040371*l + 0.7827717662*m - 0.8086757660*s);
}
vec3 fromOklab(vec3 c){
  float l = c.x + 0.3963377774*c.y + 0.2158037573*c.z;
  float m = c.x - 0.1055613458*c.y - 0.0638541728*c.z;
  float s = c.x - 0.0894841775*c.y - 1.2914855480*c.z;
  l = l*l*l; m = m*m*m; s = s*s*s;
  return vec3(4.0767416621*l - 3.3077115913*m + 0.2309699292*s, -1.2684380046*l + 2.6097574011*m - 0.3413193965*s, -0.0041960863*l - 0.7034186147*m + 1.7076147010*s);
}
`

export const CELLA_VS = `${KOZOS}
in vec2 a_cell;                // (column, row), one per instance
uniform sampler2D u_val;       // field: R32F, cols x rows (or the series, L x 1); screen: RGBA8 sRGB block colours, cols x rows
uniform vec2 u_grid;           // columns, rows
uniform vec2 u_vp;             // principal point, canvas CSS px
uniform vec2 u_size;           // canvas CSS px
uniform float u_d;             // eye distance, px
uniform vec4 u_geo;            // x0, pitch, side, amp
uniform vec4 u_row;            // yLip (screen: y0), dy, dz, series tick index (< 0: the value is read from the 2D texture)
uniform vec4 u_mix;            // max age mix, hot-head amount (row 0), series step (slots per column), series last index
uniform vec4 u_anim;           // screen only: time ms (< 0: off), row stagger ms, travel ms, start z
uniform vec3 u_pen; uniform vec3 u_hot; uniform vec3 u_papir;
uniform float u_screen;        // 1 = screen
out vec3 v_col;
void main(){
  vec2 cell = a_cell;
  vec2 c = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1)) - 0.5;
  bool hide = false;
  float lvl = 0.0; float z = cell.y * u_row.z; vec3 col = u_pen;
  if (u_screen > 0.5) {
    vec4 t = texelFetch(u_val, ivec2(cell), 0);
    col = srgb2lin(t.rgb);
    float rank = (u_grid.y - 1.0) - cell.y;                  // bottom row first
    float p = clamp((u_anim.x - rank * u_anim.y) / u_anim.z, 0.0, 1.0);
    if (u_anim.x >= 0.0 && p <= 0.0) hide = true;
    float e = 1.0 - pow(1.0 - p, 3.0);
    z = u_anim.x >= 0.0 ? u_anim.w * (1.0 - e) : 0.0;
  } else {
    float v;
    if (u_row.w >= 0.0) {
      float i = u_row.w - cell.y - (u_grid.x - 1.0 - cell.x) * u_mix.z;
      if (i < 0.0 || i > u_mix.w) { hide = true; v = 0.0; } else { v = texelFetch(u_val, ivec2(int(i), 0), 0).r; }
    } else {
      v = texelFetch(u_val, ivec2(cell), 0).r;
      if (v < 0.0) hide = true;
    }
    lvl = v;
    float age = u_grid.y > 1.0 ? cell.y / (u_grid.y - 1.0) : 0.0;
    vec3 base = u_pen;
    if (cell.y < 0.5) base = mix(u_pen, u_hot, u_mix.y);       // the row being written is hot, then cools
    // age fades the pen toward the paper; a binary source (the QR code) also dims its light modules (u_anim.y) so the dark ones read as the code
    col = fromOklab(mix(toOklab(base), toOklab(u_papir), clamp(u_mix.x * age + u_anim.y * (1.0 - v), 0.0, 1.0)));
  }
  float x = u_geo.x + cell.x * u_geo.y;
  float y = u_row.x + cell.y * u_row.y - lvl * u_geo.w;
  float s = u_d / (u_d - z);
  vec2 scr = u_vp + (vec2(x, y) - u_vp) * s + c * u_geo.z * s;
  vec2 ndc = vec2(scr.x / u_size.x * 2.0 - 1.0, 1.0 - scr.y / u_size.y * 2.0);
  gl_Position = hide ? vec4(2.0, 2.0, 0.0, 1.0) : vec4(ndc, 0.0, 1.0);
  v_col = col;
}`

export const CELLA_FS = `${KOZOS}
in vec3 v_col; out vec4 o;
void main(){ o = vec4(lin2srgb(v_col), 1.0); }`

// The depth line and the probe outline: triangles built on the CPU in screen px (a few dozen vertices), per-vertex linear colour.
export const POLI_VS = `${KOZOS}
in vec2 a_pos; in vec3 a_col; uniform vec2 u_size; out vec3 v_col;
void main(){ gl_Position = vec4(a_pos.x / u_size.x * 2.0 - 1.0, 1.0 - a_pos.y / u_size.y * 2.0, 0.0, 1.0); v_col = a_col; }`
export const POLI_FS = CELLA_FS
