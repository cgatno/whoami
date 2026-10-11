// Five takes on "a branching network that the tide floods and drains".
// Each is a single full-screen fragment shader, and they share one set of
// uniforms.

export const VERT = /* glsl */ `#version 300 es
void main() {
	// One oversized triangle covering the viewport.
	vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
	gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const COMMON = /* glsl */ `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uRes;
uniform float uTime;
uniform float uLevel;      // tide height, 0..1
uniform float uRate;       // -1..1, positive while rising
uniform float uDark;       // 1 in the dark theme
uniform sampler2D uField;
uniform float uFieldAspect;
uniform float uSeaTop;     // 1 puts the sea at the top of the screen
uniform vec3 cGround, cFlat, cRill, cWater, cDeep, cFoam, cPop;

float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash21(i), hash21(i + vec2(1, 0)), u.x),
	           mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), u.x), u.y);
}
// Gradient noise: zero-centered and free of the grid artifacts value noise
// shows when stretched. Its zero-contours are long, smooth, wandering lines.
float gnoise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
	float a0 = hash21(i) * 6.2831853, a1 = hash21(i + vec2(1, 0)) * 6.2831853;
	float a2 = hash21(i + vec2(0, 1)) * 6.2831853, a3 = hash21(i + vec2(1, 1)) * 6.2831853;
	float n0 = dot(vec2(cos(a0), sin(a0)), f);
	float n1 = dot(vec2(cos(a1), sin(a1)), f - vec2(1, 0));
	float n2 = dot(vec2(cos(a2), sin(a2)), f - vec2(0, 1));
	float n3 = dot(vec2(cos(a3), sin(a3)), f - vec2(1, 1));
	return mix(mix(n0, n1, u.x), mix(n2, n3, u.x), u.y);
}
float fbm(vec2 p) {
	float a = 0.5, s = 0.0;
	for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
	return s;
}

// Screen -> field coordinates. The field "covers" the viewport and stays
// anchored to the bottom edge, where the sea is. uv.y is 0 inland, 1 at sea.
vec2 fieldUV() {
	vec2 s = gl_FragCoord.xy / uRes;
	s.y = mix(s.y, 1.0 - s.y, uSeaTop);
	float ca = uRes.x / uRes.y;
	vec2 uv;
	if (ca > uFieldAspect) { uv = vec2(s.x, 1.0 - s.y * (uFieldAspect / ca)); }
	else { uv = vec2(0.5 + (s.x - 0.5) * (ca / uFieldAspect), 1.0 - s.y); }
	return uv;
}

// Bend the whole field so channels meander instead of running straight:
// one broad sweep plus tighter loops.
vec2 meander(vec2 uv) {
	vec2 p = uv * vec2(uFieldAspect, 1.0);
	vec2 big = vec2(fbm(p * 1.7 + 3.1), fbm(p * 1.7 + 11.9)) - 0.5;
	vec2 small = vec2(fbm(p * 7.0 + 23.0), fbm(p * 7.0 + 41.0)) - 0.5;
	return uv + big * vec2(0.10, 0.07) + small * 0.028;
}

// A rare bright pulse traveling along one stem, upstream on a rising tide
// and back toward the sea on a falling one.
float pulse(float u, float stem, float t, float dir) {
	float s = stem * 1000.0;
	float cyc = t * 0.03 + hash11(s * 0.917 + 3.1);
	float pos = fract(cyc);
	if (dir < 0.0) pos = 1.0 - pos;
	float on = step(hash11(s * 0.131 + floor(cyc) * 7.3), 0.2);
	float x = u - pos;
	return on * exp(-x * x / (2.0 * 0.011 * 0.011));
}

// Sparse specks on wet sand: the "thousands of signs of tiny life".
float specks(vec2 p, float t) {
	vec2 g = floor(p), f = fract(p) - 0.5;
	float h = hash21(g);
	vec2 o = vec2(hash21(g + 3.7), hash21(g + 9.1)) - 0.5;
	float tw = 0.5 + 0.5 * sin(t * (0.3 + h) + h * 40.0);
	return step(0.93, h) * smoothstep(0.16, 0.0, length(f - o * 0.6)) * tw;
}
`;

// ---------------------------------------------------------------------------
// A: Flats. A top-down estuary: mudflat, carved rills, and water that fills
// the channels first, then sheets across the flat.
export const FRAG_FLATS = COMMON + /* glsl */ `
void main() {
	vec2 uv = meander(fieldUV());
	float yIn = 1.0 - uv.y;
	vec4 f = texture(uField, uv);
	float d = f.r, uc = f.g, w = f.b, stem = f.a;
	float inChan = step(0.0001, w);
	vec2 p = uv * vec2(uFieldAspect, 1.0);
	float n = fbm(p * 5.0);

	// Ground height: the flat rises inland; channels are carved into it.
	float e = yIn + 0.16 * (n - 0.5);
	float x = d / max(w, 0.001);
	float bed = uc * 0.86 - 0.09 - 0.02 * w;
	float h = mix(e, min(e, bed + 0.5 * x * x), inChan);

	// Water level, with a slow swash so the edge breathes.
	float L = mix(0.04, 0.72, uLevel) + 0.005 * sin(uTime * 0.45 + n * 6.283);
	float depth = L - h;
	float water = smoothstep(0.0, 0.006, depth);

	float fade = smoothstep(0.42, 0.92, yIn);  // inland dissolves into the page
	vec3 flat_ = mix(cFlat, cGround, fade);
	flat_ *= 1.0 + 0.035 * sin(p.x * 95.0 + n * 16.0) * (1.0 - fade);   // combed ripples
	float wet = smoothstep(0.11, 0.0, -depth);
	flat_ = mix(flat_, cRill, 0.32 * wet * (1.0 - fade));
	// Damp sand spreads well beyond the channel itself, with no hard edge.
	float damp = inChan * exp(-max(d - w, 0.0) / 1.4) * (1.0 - fade);
	flat_ = mix(flat_, cRill, 0.22 * damp);
	float rill = (1.0 - smoothstep(0.55, 1.25, x)) * inChan * (1.0 - 0.8 * fade);
	flat_ = mix(flat_, cRill, 0.6 * rill);
	flat_ = mix(flat_, cPop, 0.55 * specks(p * 240.0, uTime) * wet * (1.0 - water) * (1.0 - fade));

	float glint = fbm(p * 26.0 + vec2(uTime * 0.03, -uTime * 0.02));
	// Vivid only in the shallows: open water goes deep and dark, so the
	// color traces the waterline and the channels.
	vec3 wcol = mix(cWater, cDeep, smoothstep(0.0, 0.09, depth));
	wcol += (glint - 0.5) * 0.07 * cFoam;

	float edge = smoothstep(0.0, 0.004, depth) * (1.0 - smoothstep(0.004, 0.024, depth));
	float foam = edge * smoothstep(0.3, 0.72, vnoise(p * 150.0 + uTime * 0.12));

	vec3 col = mix(flat_, wcol, water);
	col = mix(col, cFoam, foam * 0.85);

	float core = (1.0 - smoothstep(0.25, 1.0, x)) * inChan;
	float pl = pulse(uc, stem, uTime, uRate >= 0.0 ? 1.0 : -1.0) * core * (1.0 - 0.7 * fade);
	col = mix(col, cPop, clamp(pl, 0.0, 1.0));

	outColor = vec4(col, 1.0);
}`;

// ---------------------------------------------------------------------------
// B: Filaments. The same network with no land or water: fine lines that
// light up as far as the tide reaches. Reads as roots, neurons or a delta.
export const FRAG_FILAMENTS = COMMON + /* glsl */ `
void main() {
	vec2 uv = meander(fieldUV());
	float yIn = 1.0 - uv.y;
	vec4 f = texture(uField, uv);
	float d = f.r, uc = f.g, w = f.b, stem = f.a;
	float inChan = step(0.0001, w);

	float s = max(d - w * 0.5, 0.0);                       // distance outside the core
	float core = inChan * exp(-s * s / (2.0 * 0.2 * 0.2));
	float glow = inChan * exp(-s * s / (2.0 * 1.7 * 1.7));
	float weight = clamp(0.3 + w * 0.55, 0.0, 1.0);        // trunks read stronger
	float fade = 1.0 - 0.75 * smoothstep(0.55, 1.0, yIn);

	float front = mix(0.05, 0.9, uLevel);                  // how far the tide reaches
	float lit = 1.0 - smoothstep(front - 0.035, front + 0.005, uc);
	float dir = uRate >= 0.0 ? 1.0 : -1.0;
	float flow = 0.72 + 0.28 * sin(uc * 150.0 - dir * uTime * 0.7 + stem * 40.0);

	vec3 live = mix(cDeep, cWater, flow);
	vec3 col = cGround;
	col = mix(col, cRill, core * 0.5 * weight * fade);                 // dormant network
	col = mix(col, live, lit * core * weight * fade);
	col += uDark * live * glow * lit * 0.2 * weight * fade;            // glow, dark ground only

	float tip = lit * smoothstep(front - 0.04, front, uc);             // bright leading edge
	col = mix(col, cFoam, tip * core * 0.8 * fade);

	float pl = pulse(uc, stem, uTime, dir);
	col = mix(col, cPop, clamp(pl * core * 1.3 + uDark * pl * glow * 0.45, 0.0, 1.0) * fade);

	outColor = vec4(col, 1.0);
}`;

// ---------------------------------------------------------------------------
// C: Terrain. No baked network. The ground is a plateau with V-shaped
// channels cut along the zero-contours of smooth noise, at three scales:
// trunks, branches and rills. Each finer scale is shallower, so it floods
// later, the way a real tidal network does.
export const FRAG_TERRAIN = COMMON + /* glsl */ `
void main() {
	vec2 s = gl_FragCoord.xy / uRes;
	s.y = mix(s.y, 1.0 - s.y, uSeaTop);
	vec2 p = vec2(s.x * uRes.x / uRes.y, s.y);
	float yIn = s.y;
	float dir = uRate >= 0.0 ? 1.0 : -1.0;

	// A warp that drifts very slowly, so the web is never quite the same.
	vec2 drift = vec2(uTime * 0.006, -uTime * 0.004);
	vec2 warp = vec2(fbm(p * 1.6 + vec2(0.0, 1.7) + drift), fbm(p * 1.6 + vec2(5.2, 1.3) - drift)) - 0.5;
	vec2 r = p + 0.55 * warp;

	// Distance-like value to each channel centerline. Sampling is stretched
	// toward the sea so the lines run like channels and don't close into
	// cells.
	float c1 = abs(gnoise(r * vec2(2.3, 0.95) + 11.0));
	float c2 = abs(gnoise(r * vec2(5.6, 2.6) + 37.0));
	float c3 = abs(gnoise(r * vec2(13.0, 6.5) + 71.0));
	const float PLATEAU = 0.23;
	// A finer channel is cut as deep as its parent where the two meet and
	// shallower further away, so water enters it from the junction and
	// spreads outward: branches fill from their trunks, rills from branches.
	float h1 = c1 * 1.5;
	float h2 = c2 * 2.5 + 0.085 * smoothstep(0.0, 0.30, c1);
	float h3 = c3 * 4.2 + 0.070 * smoothstep(0.0, 0.22, min(c1, c2)) + 0.5 * (h2 - c2 * 2.5);
	float carve = min(min(h1, h2), h3);
	float ground = min(PLATEAU, carve);
	float e = ground + yIn * 0.30 + 0.03 * (fbm(p * 6.0) - 0.5);

	// A slow wave traveling along the channels: water sloshing to and fro.
	float swash = 0.008 * sin(uTime * 0.4 - dir * yIn * 11.0 + warp.x * 9.0);
	float L = mix(0.03, 0.29, uLevel) + swash;
	float depth = L - e;
	float water = smoothstep(0.0, 0.004, depth);

	float fade = smoothstep(0.7, 1.0, yIn);
	vec3 flat_ = mix(cFlat, cGround, fade);
	float wet = smoothstep(0.07, 0.0, -depth);
	flat_ = mix(flat_, cRill, 0.32 * wet * (1.0 - fade));
	// Dry channels stay faintly visible: the web the tide has not reached.
	float dry = smoothstep(0.0, 0.10, PLATEAU - carve) * (1.0 - fade);
	flat_ = mix(flat_, cRill, 0.5 * dry);
	flat_ = mix(flat_, cPop, 0.75 * specks(p * 190.0, uTime) * wet * (1.0 - water) * (1.0 - fade));

	// Vivid only in the shallows, so color traces the banks and the edge.
	float shallow = 1.0 - smoothstep(0.01, 0.085, depth);
	vec3 wcol = mix(cDeep, cWater, shallow);
	float glint = fbm(p * 24.0 + vec2(uTime * 0.03, -dir * uTime * 0.05));
	wcol += (glint - 0.5) * 0.08 * cFoam;

	// Magenta drifting along the flooded channels, with the flow.
	// Only where the water is thin, so it shows in rills and along banks
	// and never as a block in open water.
	float streak = vnoise(vec2(r.x * 90.0, r.y * 5.5 - dir * uTime * 0.14));
	float thin = 1.0 - smoothstep(0.012, 0.035, depth);
	float pop = smoothstep(0.80, 0.90, streak) * water * thin;
	wcol = mix(wcol, cPop, pop);

	float edge = smoothstep(0.0, 0.003, depth) * (1.0 - smoothstep(0.003, 0.014, depth));
	float foam = edge * smoothstep(0.35, 0.75, vnoise(p * 150.0 + uTime * 0.12));

	vec3 col = mix(flat_, wcol, water);
	col = mix(col, cFoam, foam * 0.5);
	outColor = vec4(col, 1.0);
}`;

// ---------------------------------------------------------------------------
// D: Chart. The same branching ground as Terrain, drawn flat like a
// nautical chart or a screen print: stepped bands of flat color, crisp
// edges, thin contour lines, and no glow or simulated lighting. The only
// magenta is a single line marking where the next high or low will reach.
export const FRAG_CHART = COMMON + /* glsl */ `
uniform float uNext;   // level of the next high or low, 0..1

float toL(float level) { return mix(0.10, 0.52, level); }

void main() {
	vec2 s = gl_FragCoord.xy / uRes;
	s.y = mix(s.y, 1.0 - s.y, uSeaTop);
	vec2 p = vec2(s.x * uRes.x / uRes.y, s.y);
	float yIn = s.y;

	vec2 drift = vec2(uTime * 0.004, -uTime * 0.003);
	vec2 warp = vec2(fbm(p * 1.4 + vec2(0.0, 1.7) + drift), fbm(p * 1.4 + vec2(5.2, 1.3) - drift)) - 0.5;
	vec2 r = p + 0.6 * warp;

	// Broad, soft landforms (as in the first Terrain) with trunks and
	// branches cut into them. No fine rills: the shapes stay clean.
	float broad = fbm(r * 1.3 + 3.0);
	float c1 = abs(gnoise(r * vec2(2.1, 0.9) + 11.0));
	float c2 = abs(gnoise(r * vec2(5.0, 2.3) + 37.0));
	// Each channel is a flat-bottomed trench with steep banks and a slightly
	// dished floor, not a V-shaped notch. A V narrows to a needle wherever
	// the water runs out; a trench keeps its width and ends in a rounded
	// head, which is how real tidal channels look.
	const float PLATEAU = 0.12;
	float taper = mix(1.0, 0.5, smoothstep(0.0, 0.9, yIn));       // narrower inland
	float t1 = smoothstep(0.038 * taper, 0.056 * taper, c1);       // steep bank: 0 floor, 1 flat
	float t2 = smoothstep(0.017 * taper, 0.027 * taper, c2);
	float dish1 = 0.010 * smoothstep(0.0, 0.05 * taper, c1);       // floor rises slightly to the banks
	float dish2 = 0.006 * smoothstep(0.0, 0.024 * taper, c2);
	// A branch floor sits level with its trunk at the junction and higher
	// further away, so branches still fill outward from where they join.
	float floor2 = 0.05 * smoothstep(0.0, 0.3, c1) + dish2;
	float carve = min(mix(dish1, PLATEAU, t1), mix(floor2, PLATEAU, t2));
	float e = yIn * 0.34 + 0.22 * broad + carve;

	float L = toL(uLevel) + 0.004 * sin(uTime * 0.4 + warp.x * 9.0);
	float depth = L - e;
	float aa = fwidth(e);

	// Land is the page itself, with tone-on-tone contour lines.
	const float STEP = 0.045;
	float toLine = abs(fract(e / STEP - 0.5) - 0.5) * STEP;
	float contour = 1.0 - smoothstep(0.6 * aa, 1.4 * aa, toLine);
	float inland = 1.0 - smoothstep(0.55, 1.0, yIn);
	vec3 land = mix(cGround, cRill, 0.38 * contour * inland);

	// Water in flat bands by depth. The bright tone is only a thin band at
	// the edge; everything behind it steps down through calmer tones, so
	// large areas of water stay quiet.
	vec3 mid = mix(cWater, cDeep, 0.62);
	vec3 wcol = cWater;
	wcol = mix(wcol, mid, step(0.016, depth));
	wcol = mix(wcol, mix(mid, cDeep, 0.55), step(0.075, depth));
	wcol = mix(wcol, cDeep, step(0.15, depth));

	float water = smoothstep(-aa, aa, depth);
	vec3 col = mix(land, wcol, water);

	// One thin line where the next high or low tide will reach.
	float toNext = abs(e - toL(uNext));
	float mark = (1.0 - smoothstep(1.2 * aa, 2.4 * aa, toNext)) * inland;
	col = mix(col, cPop, mark);

	outColor = vec4(col, 1.0);
}`;

// ---------------------------------------------------------------------------
// E: Topo. The whole view is one watershed, drawn as a topographic map:
// contour lines everywhere, and everything below the tide level filled in
// flat bands. The terrain drains to the sea along a branching valley
// network, so rising water spreads up the trunks and then the tributaries.
export const FRAG_TOPO = COMMON + /* glsl */ `
uniform sampler2D uHeight;
uniform vec2 uHeightSize;
uniform float uNext;   // level of the next high or low, 0..1

// The page's text, rasterized into a mask: R = the name, B = the tagline,
// G = small text.
uniform sampler2D uText;
// Smooth blurs of that mask, covering the same rectangle: R = all text,
// tight; G = all text, wide; B = tagline and small text only, tight.
uniform sampler2D uBlur;
uniform vec2 uBlurSize;
uniform vec4 uTextRect;   // x, y, width, height in device px, origin top-left
uniform float uTextOn;
uniform float uTextMode;  // 0 split, 1 island, 2 hybrid (name splits, the rest is an island)
uniform vec3 cInkLand, cInkWater;  // split ink over dry land / over water
uniform vec3 cInk;                 // the palette's ordinary text ink

float luminance(vec3 c) { return dot(pow(c, vec3(2.2)), vec3(0.2126, 0.7152, 0.0722)); }
float contrast(float a, float b) { return (max(a, b) + 0.05) / (min(a, b) + 0.05); }
// Whichever of two inks contrasts more with this background. Used for small
// text with pure black and white, whose guaranteed floor is 4.58:1.
vec3 bestInk(vec3 bg, vec3 a, vec3 b) {
	float l = luminance(bg);
	return contrast(l, luminance(a)) >= contrast(l, luminance(b)) ? a : b;
}

// Bicubic (B-spline) sampling in four bilinear taps, so contour lines
// stay smooth instead of showing the texel grid.
vec4 cubic(float v) {
	vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
	vec4 s = n * n * n;
	float x = s.x, y = s.y - 4.0 * s.x, z = s.z - 4.0 * s.y + 6.0 * s.x;
	return vec4(x, y, z, 6.0 - x - y - z) / 6.0;
}
vec4 bicubic(sampler2D tex, vec2 size, vec2 uv) {
	vec2 st = uv * size - 0.5;
	vec2 f = fract(st);
	st -= f;
	vec4 xc = cubic(f.x), yc = cubic(f.y);
	vec4 c = st.xxyy + vec2(-0.5, 1.5).xyxy;
	vec4 sw = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
	vec4 o = (c + vec4(xc.yw, yc.yw) / sw) / size.xxyy;
	vec4 a = texture(tex, o.xz), b = texture(tex, o.yz);
	vec4 c2 = texture(tex, o.xw), d = texture(tex, o.yw);
	float sx = sw.x / (sw.x + sw.y), sy = sw.z / (sw.z + sw.w);
	return mix(mix(d, c2, sx), mix(b, a, sx), sy);
}
float heightAt(vec2 uv) { return bicubic(uHeight, uHeightSize, uv).r; }

float toL(float level) { return mix(0.09, 0.40, level); }

void main() {
	// A rotated, zoomed-in window onto the field, so no edge of the view is
	// "the sea" and nothing hangs straight down from the top.
	vec2 s = gl_FragCoord.xy / uRes;
	vec2 c = (s - 0.5) * vec2(uRes.x / uRes.y, 1.0);
	const float ANGLE = -0.62, ZOOM = 0.66;
	mat2 rot = mat2(cos(ANGLE), -sin(ANGLE), sin(ANGLE), cos(ANGLE));
	vec2 f = rot * c * ZOOM + vec2(0.5 * uFieldAspect, 0.50);
	float dir = uRate >= 0.0 ? 1.0 : -1.0;

	// A soft zone around the text where the map calms down so letters stay
	// readable: 0 away from text, 1 right around it.
	vec2 tp = (vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) - uTextRect.xy) / uTextRect.zw;
	bool inText = uTextOn > 0.5 && tp.x >= 0.0 && tp.x <= 1.0 && tp.y >= 0.0 && tp.y <= 1.0;
	float calm = 0.0;
	vec4 blur = vec4(0.0);
	if (inText) {
		blur = bicubic(uBlur, uBlurSize, tp);
		calm = smoothstep(0.01, 0.10, blur.r);
	}
	float lively = 1.0 - calm;

	// Aliveness, all of it slow and none of it near the text: the whole map
	// undulates very slightly...
	f += lively * 0.0026 * vec2(sin(uTime * 0.19 + f.y * 9.0), cos(uTime * 0.155 + f.x * 8.0));
	vec2 uv = vec2(f.x / uFieldAspect, f.y);
	float h = heightAt(uv);
	// Near text, use a smoothed copy of the ground, so the waterline crosses
	// the letters as one clean curve instead of a string of small notches.
	if (calm > 0.0) {
		vec2 r = vec2(0.022 / uFieldAspect, 0.022);
		vec2 d = 1.5 * r;                                  // a second, wider ring
		float smooth_ = 0.125 * (
			heightAt(uv + vec2(r.x, 0.0)) + heightAt(uv - vec2(r.x, 0.0)) +
			heightAt(uv + vec2(0.0, r.y)) + heightAt(uv - vec2(0.0, r.y)) +
			heightAt(uv + d) + heightAt(uv - d) +
			heightAt(uv + vec2(d.x, -d.y)) + heightAt(uv + vec2(-d.x, d.y)));
		h = mix(h, smooth_, calm);
	}
	// "Island": text can be made high ground. The terrain rises around it, so
	// the tide laps around the words and never reaches them; they stay in one
	// ink on dry land.
	float ground = h;
	float island = 0.0;
	if (inText && uTextMode > 0.5) {
		bool all = uTextMode < 1.5;                     // island mode lifts the name too
		// A broad shape that reaches further over ground that is already high
		// and pulls back where a valley runs in, so its shore follows the
		// map's own inlets instead of tracing the text block.
		// The floor keeps a margin of land around the words in the deepest valleys.
		float reach = max(0.55, 1.0 + 2.6 * (h - toL(0.5)) + 1.1 * (fbm(f * 7.0) - 0.5));
		float shore = all ? smoothstep(0.015, 0.10, blur.g * reach) : 0.0;
		// ...and a core that is always full around every glyph, however thin,
		// so even small text is never left over water. Hybrid keeps only the
		// core: broad islands there would cut through the name.
		float core = smoothstep(0.012, 0.06, all ? blur.r : blur.b);
		island = 1.0 - (1.0 - shore) * (1.0 - core);     // smooth union: no crease
	}
	// Lift the existing ground, so the island keeps the map's own hills. The
	// lift exceeds the highest tide, so text is dry whatever is under it.
	h += (toL(1.0) + 0.05) * island;

	// ...the water's edge laps in and out, out of step from place to place...
	float lap = lively * 0.0044 * sin(uTime * 0.57 + vnoise(f * 2.5) * 6.283);
	float L = toL(uLevel) + lap;
	float depth = L - h;
	float aa = fwidth(h);

	// ...and the contour lines drift with the tide: uphill while it rises,
	// back down while it falls. Every fourth line is an index contour.
	const float STEP = 0.02;
	float k = h / STEP - dir * uTime * 0.015;
	float toMinor = abs(fract(k - 0.5) - 0.5) * STEP;
	float toMajor = abs(fract(k / 4.0 - 0.5) - 0.5) * STEP * 4.0;
	float minor = 1.0 - smoothstep(0.5 * aa, 1.3 * aa, toMinor);
	float major = 1.0 - smoothstep(0.9 * aa, 1.9 * aa, toMajor);
	// None near text, nor on an island's slopes, where the lift would pack
	// the lines into a border.
	float line = max(0.45 * minor, 0.9 * major) * lively * (1.0 - smoothstep(0.0, 0.2, island));

	// Dry land is the page, with tone-on-tone contours.
	vec3 land = mix(cGround, cRill, 0.55 * line);

	// Water: flat bands that step down with depth, with one thin bright
	// keyline along the edge. The keyline is a constant width on screen, not
	// a depth band, so it does not swell on gentle slopes.
	vec3 mid = mix(cWater, cDeep, 0.62);
	// (The bands are left alone near text. Collapsing them to one tone made
	// a lighter patch around letters over deep water, which read as a glow.)
	float steps = clamp(floor(depth / (STEP * 2.0)), 0.0, 3.0) / 3.0;
	vec3 wcol = mix(mid, cDeep, steps);
	// No keyline near text: it is the same color as the dark theme's
	// on-land ink, and letters blur into it.
	float edge = (1.0 - smoothstep(2.5 * aa, 3.5 * aa, depth)) * lively;
	wcol = mix(wcol, cDeep, 0.35 * line * (1.0 - edge));              // submerged contours

	float water = smoothstep(-aa, aa, depth);
	// The map as text sees it: without the bright keyline, which would
	// otherwise cut a line through every letter it crosses.
	vec3 under = mix(land, wcol, water);
	vec3 col = mix(land, mix(wcol, cWater, edge), water);

	// Magenta marks the extremes of the tidal range: the high ground only
	// the biggest tides reach, and the low ground only the lowest lows
	// uncover. Each peaks at the extreme itself and fades beyond it. The one
	// the tide is heading toward is the stronger.
	// Measured on the ground as it was before any island lift: lifted slopes
	// pass through the "extreme high" heights without a tide ever reaching them.
	float hiZone = smoothstep(toL(0.9), toL(1.0), ground) * (1.0 - smoothstep(toL(1.0), toL(1.0) + 0.012, ground));
	float loZone = (1.0 - smoothstep(toL(0.0), toL(0.1), ground)) * smoothstep(toL(0.0) - 0.012, toL(0.0), ground);
	// Stepped into three flat tints like the water bands. A soft blur reads
	// as a glow, which breaks the flat look.
	float zone = max(hiZone, loZone) * 3.0;
	float w = fwidth(zone);
	float stepped = (floor(zone) + smoothstep(0.5 - w, 0.5 + w, fract(zone))) / 3.0;
	// Emphasis follows the tide's rate. The rate eases through zero at
	// every turn of the tide, so the two zones are equal at the turn and
	// crossfade either side of it with no jump.
	float rising = 0.5 + 0.5 * uRate;
	float toward = hiZone > loZone ? rising : 1.0 - rising;
	// None on an island or near any text: a magenta band across a word is
	// one more color for the letters to sit on.
	float tint = stepped * mix(0.22, 0.46, toward) * (1.0 - island) * lively;
	col = mix(col, cPop, tint);
	under = mix(under, cPop, tint);

	// Text. Display text takes one ink over water and another over dry
	// land, so letters split exactly along the waterline. Each theme's pair
	// is checked against every flat color it can sit on (worst case 4.65:1
	// dark, 5.97:1 light). The ink is chosen by region. A per-pixel contrast
	// test doesn't work in dark mode, where land and water are both dark: it
	// would only flip on the keyline.
	if (inText) {
		vec4 m = texture(uText, tp);
		vec3 split = mix(cInkLand, cInkWater, water);
		bool nameOnIsland = uTextMode > 0.5 && uTextMode < 1.5;
		bool restOnIsland = uTextMode > 0.5;
		col = mix(col, nameOnIsland ? cInk : split, m.r);
		col = mix(col, restOnIsland ? cInk : split, m.b);
		col = mix(col, restOnIsland ? cInk : bestInk(under, vec3(0.0), vec3(1.0)), m.g);
	}

	outColor = vec4(col, 1.0);
}`;
