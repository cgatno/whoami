// The hero's shaders: the fragment shader that draws the map, and the small
// passes that prepare its textures.
import { SHAPE, TEXELS_PER_CELL } from "./topo";

const float = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

export const VERT = /* glsl */ `#version 300 es
void main() {
	// One oversized triangle covering the viewport.
	vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
	gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// The whole view is one watershed, drawn as a topographic map: contour lines
// everywhere, and everything below the tide level filled in flat bands. The
// terrain drains to the sea along a branching valley network, so rising
// water spreads up the trunks and then the tributaries.
export const FRAG = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;
out vec4 outColor;

uniform vec2 uRes;
uniform float uTime;
uniform float uLevel;      // tide height, 0..1
uniform float uRate;       // -1..1, positive while rising
uniform float uFieldAspect;
uniform vec3 cGround, cRill, cWater, cDeep, cPop;

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
uniform sampler2D uHeight;   // R = the ground, G = a smoothed copy of it
uniform vec2 uHeightSize;
uniform float uNext;   // level of the next high or low, 0..1

// The page's text, rasterized into a mask that fits it closely: R = the
// name and tagline, G = small text.
uniform sampler2D uText;
uniform vec4 uTextRect;   // x, y, width, height in device px, origin top-left
// A smooth blur of that mask over a slightly wider rectangle.
uniform sampler2D uBlur;
uniform vec2 uBlurSize;
uniform vec4 uBlurRect;
uniform float uTextOn;
// 0 at the moment the canvas takes over the text from the page, easing to 1.
// The text starts in the page's own colors and the map is still busy around
// it, so the handoff is not a jump.
uniform float uTextIn;
uniform vec3 cInk, cDim;           // the page's colors for the name and tagline / small text
uniform vec3 cInkLand, cInkWater;  // ink over dry land / over water

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
	vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
	vec2 bp = (px - uBlurRect.xy) / uBlurRect.zw;
	bool inText = uTextOn > 0.5 && bp == clamp(bp, 0.0, 1.0);
	float calm = inText ? uTextIn * smoothstep(0.01, 0.10, bicubic(uBlur, uBlurSize, bp).r) : 0.0;
	float lively = 1.0 - calm;

	// Aliveness, all of it slow and none of it near the text: the whole map
	// undulates very slightly...
	f += lively * 0.0026 * vec2(sin(uTime * 0.19 + f.y * 9.0), cos(uTime * 0.155 + f.x * 8.0));
	vec2 uv = vec2(f.x / uFieldAspect, f.y);
	vec2 heights = bicubic(uHeight, uHeightSize, uv).rg;
	// Near text, use the smoothed copy of the ground, so the waterline crosses
	// the letters as one clean curve instead of a string of small notches.
	float h = mix(heights.r, heights.g, calm);

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
	// None near text.
	float line = max(0.45 * minor, 0.9 * major) * lively;

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
	float hiZone = smoothstep(toL(0.9), toL(1.0), h) * (1.0 - smoothstep(toL(1.0), toL(1.0) + 0.012, h));
	float loZone = (1.0 - smoothstep(toL(0.0), toL(0.1), h)) * smoothstep(toL(0.0) - 0.012, toL(0.0), h);
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
	// None near text: a magenta band across a word is one more color for
	// the letters to sit on.
	float tint = stepped * mix(0.22, 0.46, toward) * lively;
	col = mix(col, cPop, tint);
	under = mix(under, cPop, tint);

	// Text. The name and tagline take one ink over water and another over dry
	// land, so letters split exactly along the waterline. Each theme's pair
	// is checked against every flat color it can sit on (worst case 4.65:1
	// dark, 5.97:1 light). The ink is chosen by region. A per-pixel contrast
	// test doesn't work in dark mode, where land and water are both dark: it
	// would only flip on the keyline.
	if (inText) {
		vec2 tp = (px - uTextRect.xy) / uTextRect.zw;
		vec4 m = tp == clamp(tp, 0.0, 1.0) ? texture(uText, tp) : vec4(0.0);
		col = mix(col, mix(cInk, mix(cInkLand, cInkWater, water), uTextIn), m.r);
		col = mix(col, mix(cDim, bestInk(under, vec3(0.0), vec3(1.0)), uTextIn), m.g);
	}

	outColor = vec4(col, 1.0);
}`;

// Builds the input for the text blur at reduced resolution. The readout goes
// in as a flat bar.
export const FRAG_BLUR_SOURCE = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;
out vec4 outColor;

uniform sampler2D uText;
uniform float uScale;      // device px per output pixel
uniform vec2 uOffset;      // the mask's top-left, in device px from this target's
uniform vec4 uBar;         // x0, y0, x1, y1 in device px from this target's top-left
uniform float uBarValue;

void main() {
	vec2 p = gl_FragCoord.xy * uScale;
	vec2 size = vec2(textureSize(uText, 0));
	// Four bilinear taps average the block of mask texels under this pixel.
	vec4 m = vec4(0.0);
	for (int i = 0; i < 4; i++) {
		vec2 q = p - uOffset + vec2(i % 2 == 0 ? -0.25 : 0.25, i < 2 ? -0.25 : 0.25) * uScale;
		if (q == clamp(q, vec2(0.0), size)) m += 0.25 * texture(uText, q / size);
	}
	float bar = p.x >= uBar.x && p.y >= uBar.y && p.x < uBar.z && p.y < uBar.w ? uBarValue : 0.0;
	outColor = vec4(max(m.r, bar));
}`;

// One direction of a Gaussian blur. Run it twice, across and then down.
export const FRAG_BLUR = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;
out vec4 outColor;

uniform sampler2D uSrc;
uniform vec2 uStep;     // one texel along the blur direction, in uv
uniform float uSigma;   // in texels

void main() {
	vec2 uv = gl_FragCoord.xy / vec2(textureSize(uSrc, 0));
	vec4 sum = texture(uSrc, uv);
	float total = 1.0;
	float k = -0.5 / (uSigma * uSigma);
	int reach = int(ceil(uSigma * 3.0));
	// Each tap sits between two texels and lets bilinear filtering weigh them.
	for (int i = 1; i <= reach; i += 2) {
		float a = float(i), b = a + 1.0;
		float wa = exp(k * a * a), wb = exp(k * b * b);
		float w = wa + wb;
		vec2 o = uStep * (a * wa + b * wb) / w;
		sum += w * (texture(uSrc, uv + o) + texture(uSrc, uv - o));
		total += 2.0 * w;
	}
	outColor = sum / total;
}`;

// ---- terrain bake
// Three passes do on the GPU what generateHeight() in topo.ts does in
// JavaScript: noise, then the valleys, then the finishing touches. A blur
// follows.

// The same value noise as network.ts, so both versions agree.
const TERRAIN_COMMON = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

const float S = ${float(TEXELS_PER_CELL)};
const float BANK_WIDTH = ${float(SHAPE.BANK_WIDTH)};
const float BANK_SLOPE = ${float(SHAPE.BANK_SLOPE)};
const float CEILING = ${float(SHAPE.CEILING)};
const float MAX_HEIGHT = ${float(SHAPE.MAX_HEIGHT)};
// Valley heights are written as depth, scaled by this. It only has to be
// above the ceiling.
const float DEPTH_RANGE = 128.0;
`;

// Hillside steepness (R) and broad relief (G) for every texel.
export const FRAG_TERRAIN_NOISE = TERRAIN_COMMON + /* glsl */ `
out vec4 outColor;
uniform uint uSeed;

float lattice(ivec2 p) {
	uint n = uint(p.x) * 374761393u + uint(p.y) * 668265263u + uSeed * 1442695041u;
	n = (n ^ (n >> 13)) * 1274126177u;
	return float(n ^ (n >> 16)) / 4294967295.0;
}
float noise(vec2 p) {
	vec2 i = floor(p), f = p - i;
	vec2 u = f * f * (3.0 - 2.0 * f);
	ivec2 c = ivec2(i);
	float a = lattice(c), b = lattice(c + ivec2(1, 0)), d = lattice(c + ivec2(0, 1)), e = lattice(c + ivec2(1, 1));
	return a + (b - a) * u.x + (d - a) * u.y + (a - b - d + e) * u.x * u.y;
}
float fbm(vec2 p) {
	return 0.5 * noise(p) + 0.25 * noise(p * 2.1 + vec2(9.0, 4.0)) + 0.125 * noise(p * 4.3 + vec2(2.0, 7.0));
}

void main() {
	vec2 cell = (gl_FragCoord.xy - 0.5) / S;
	float hillside = 0.55 + 0.9 * fbm(cell * 0.03 + vec2(40.0, 12.0));
	float relief = 8.0 * (fbm(cell * 0.018 + vec2(7.0, 31.0)) - 0.44);
	outColor = vec4(hillside, relief, 0.0, 1.0);
}`;

// One instanced quad per valley segment, covering everything the valley's
// slopes can reach.
export const VERT_VALLEYS = TERRAIN_COMMON + /* glsl */ `
layout(location = 0) in vec4 aEnds;    // ax, ay, bx, by in texels
layout(location = 1) in vec4 aFloor;   // height at a and b, half-width at a and b
layout(location = 2) in float aReach;  // texels
uniform vec2 uSize;
out vec4 vEnds;
out vec4 vFloor;

void main() {
	vec2 lo = max(floor(min(aEnds.xy, aEnds.zw) - aReach), vec2(0.0));
	vec2 hi = min(ceil(max(aEnds.xy, aEnds.zw) + aReach), uSize - 1.0) + 1.0;
	vec2 p = mix(lo, hi, vec2(gl_VertexID & 1, gl_VertexID >> 1));
	gl_Position = vec4(p / uSize * 2.0 - 1.0, 0.0, 1.0);
	vEnds = aEnds;
	vFloor = aFloor;
}`;

// Each fragment works out how high the ground would be if this valley were
// the only one, and writes that as its depth. The depth test keeps the lowest
// value per texel, which is the lower envelope. Using depth for this needs no
// float blending and gives 24 bits of precision.
export const FRAG_VALLEYS = TERRAIN_COMMON + /* glsl */ `
in vec4 vEnds;
in vec4 vFloor;
uniform sampler2D uNoise;

void main() {
	vec2 q = gl_FragCoord.xy - vEnds.xy;
	vec2 along = vEnds.zw - vEnds.xy;
	float t = clamp(dot(q, along) / max(dot(along, along), 1e-6), 0.0, 1.0);
	// Distance beyond the edge of the flat floor, in cells.
	float d = length(q - t * along) / S - mix(vFloor.z, vFloor.w, t);
	float v = mix(vFloor.x, vFloor.y, t);
	if (d > 0.0) {
		float hillside = texelFetch(uNoise, ivec2(gl_FragCoord.xy), 0).r;
		v += d < BANK_WIDTH ? BANK_SLOPE * d : BANK_SLOPE * BANK_WIDTH + hillside * (d - BANK_WIDTH);
	}
	gl_FragDepth = clamp(v / DEPTH_RANGE, 0.0, 1.0);
}`;

// Reads the depths back as heights, caps them at the ceiling, adds the broad
// relief and normalizes.
export const FRAG_TERRAIN_FINISH = TERRAIN_COMMON + /* glsl */ `
out vec4 outColor;
uniform sampler2D uDepth;
uniform sampler2D uNoise;

void main() {
	ivec2 texel = ivec2(gl_FragCoord.xy);
	float z = min(texelFetch(uDepth, texel, 0).r * DEPTH_RANGE, CEILING);
	z += texelFetch(uNoise, texel, 0).g;
	outColor = vec4(z / MAX_HEIGHT);
}`;
