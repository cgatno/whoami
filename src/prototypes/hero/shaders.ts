// The hero's shaders: one full-screen fragment shader that draws the map, and
// the vertex shader that feeds it.

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
float fbm(vec2 p) {
	float a = 0.5, s = 0.0;
	for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
	return s;
}

uniform sampler2D uHeight;
uniform vec2 uHeightSize;
uniform float uNext;   // level of the next high or low, 0..1

// The page's text, rasterized into a mask that fits it closely: R = the
// name, B = the tagline, G = small text.
uniform sampler2D uText;
uniform vec4 uTextRect;   // x, y, width, height in device px, origin top-left
// Smooth blurs of that mask over a wider rectangle: R = all text, tight;
// G = all text, wide; B = tagline and small text only, tight.
uniform sampler2D uBlur;
uniform vec2 uBlurSize;
uniform vec4 uBlurRect;
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
	vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
	vec2 bp = (px - uBlurRect.xy) / uBlurRect.zw;
	bool inText = uTextOn > 0.5 && bp == clamp(bp, 0.0, 1.0);
	float calm = 0.0;
	vec4 blur = vec4(0.0);
	if (inText) {
		blur = bicubic(uBlur, uBlurSize, bp);
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
		bool whole = uTextMode < 1.5;                   // island mode lifts the name too
		// A broad shape that reaches further over ground that is already high
		// and pulls back where a valley runs in, so its shore follows the
		// map's own inlets instead of tracing the text block.
		// The floor keeps a margin of land around the words in the deepest valleys.
		float reach = max(0.55, 1.0 + 2.6 * (h - toL(0.5)) + 1.1 * (fbm(f * 7.0) - 0.5));
		float shore = whole ? smoothstep(0.015, 0.10, blur.g * reach) : 0.0;
		// ...and a core that is always full around every glyph, however thin,
		// so even small text is never left over water. Hybrid keeps only the
		// core: broad islands there would cut through the name.
		float core = smoothstep(0.012, 0.06, whole ? blur.r : blur.b);
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
		vec2 tp = (px - uTextRect.xy) / uTextRect.zw;
		vec4 m = tp == clamp(tp, 0.0, 1.0) ? texture(uText, tp) : vec4(0.0);
		vec3 split = mix(cInkLand, cInkWater, water);
		bool nameOnIsland = uTextMode > 0.5 && uTextMode < 1.5;
		bool restOnIsland = uTextMode > 0.5;
		col = mix(col, nameOnIsland ? cInk : split, m.r);
		col = mix(col, restOnIsland ? cInk : split, m.b);
		col = mix(col, restOnIsland ? cInk : bestInk(under, vec3(0.0), vec3(1.0)), m.g);
	}

	outColor = vec4(col, 1.0);
}`;

// Builds the input for the text blurs at reduced resolution: R and G = all
// text, B = tagline and small text only. The readout goes in as a flat bar.
export const FRAG_BLUR_SOURCE = /* glsl */ `#version 300 es
precision highp float;
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
	float rest = max(m.b, bar);
	float whole = max(m.r, rest);
	outColor = vec4(whole, whole, rest, 1.0);
}`;

// One direction of a Gaussian blur. Run it twice, across and then down.
export const FRAG_BLUR = /* glsl */ `#version 300 es
precision highp float;
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
