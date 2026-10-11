// Prototype harness: one full-viewport WebGL2 canvas and controls for the
// tide and the text treatment.
import { makeColors, type RGB } from "./color";
import {
	FRAG,
	FRAG_BLUR,
	FRAG_BLUR_SOURCE,
	FRAG_TERRAIN_FINISH,
	FRAG_TERRAIN_NOISE,
	FRAG_VALLEYS,
	VERT,
	VERT_VALLEYS,
} from "./shaders";
import { tideAt } from "./tide";
import { buildValleys, generateHeight, SEGMENT_FLOATS, SHAPE } from "./topo";

type Mode = "live" | "scrub" | "lapse";

const canvas = document.querySelector<HTMLCanvasElement>("#hero")!;
const readout = document.querySelector<HTMLElement>("#tide-readout")!;
const stats = document.querySelector<HTMLElement>("#hero-stats")!;
const root = document.documentElement;
const params = new URLSearchParams(location.search);

// The map is one opaque full-screen quad, so the canvas needs no depth,
// stencil or multisampling of its own.
const gl = canvas.getContext("webgl2", {
	antialias: false,
	alpha: false,
	depth: false,
	stencil: false,
	powerPreference: "low-power",
});
if (!gl) {
	stats.textContent = "WebGL2 is not available in this browser.";
	throw new Error("WebGL2 unavailable");
}

// Use Display P3 for the canvas when the screen can show it, so the hero
// colors can go beyond sRGB.
const p3 = "drawingBufferColorSpace" in gl && matchMedia("(color-gamut: p3)").matches;
if (p3) gl.drawingBufferColorSpace = "display-p3";
const { oklch, hex } = makeColors(p3);

// The hero has its own palette (the "canvas palette"), built out from
// palette B's petrol hue with far more chroma, plus the magenta pop.
const palettes: Record<"light" | "dark", Record<string, RGB>> = {
	// Dark: bright water on dark mud, like the Stillaguamish flats.
	dark: {
		cGround: hex("#0b1616"),
		cRill: oklch(0.33, 0.04, 180),
		cWater: oklch(0.82, 0.17, 172),
		cDeep: oklch(0.27, 0.055, 195),
		cPop: oklch(0.7, 0.3, 338),
		// Both are light, so both read on dark. The split shows as a color change.
		cInkLand: oklch(0.82, 0.17, 172),
		cInkWater: hex("#e0edec"),
		cInk: hex("#e0edec"),
	},
	// Light: dark water on pale marsh, like the Nisqually delta.
	light: {
		cGround: hex("#f3fbfb"),
		cRill: oklch(0.7, 0.05, 185),
		cWater: oklch(0.66, 0.14, 178),
		cDeep: oklch(0.36, 0.075, 198),
		cPop: oklch(0.6, 0.28, 340),
		cInkLand: hex("#142726"),
		cInkWater: hex("#f3fbfb"),
		cInk: hex("#142726"),
	},
};

// ---- program
// ?coldshaders adds a test that never passes, with a different number on
// every load, to each fragment shader. The browser's shader cache then
// misses, and the compile times are what a first visit would see.
const uncached = params.has("coldshaders")
	? `void main() {\n\tif (gl_FragCoord.x < -1.0 - ${Math.random()}) discard;`
	: "void main() {";
let compileMs = 0;
function compile(type: number, src: string) {
	const s = gl!.createShader(type)!;
	gl!.shaderSource(s, type === gl!.FRAGMENT_SHADER ? src.replace("void main() {", uncached) : src);
	gl!.compileShader(s);
	if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(s) ?? "shader error");
	return s;
}
function link(frag: string, vert = VERT) {
	const t0 = performance.now();
	const program = gl!.createProgram()!;
	gl!.attachShader(program, compile(gl!.VERTEX_SHADER, vert));
	gl!.attachShader(program, compile(gl!.FRAGMENT_SHADER, frag));
	gl!.linkProgram(program);
	if (!gl!.getProgramParameter(program, gl!.LINK_STATUS)) throw new Error(gl!.getProgramInfoLog(program) ?? "link error");
	const uniforms: Record<string, WebGLUniformLocation | null> = {};
	const count = gl!.getProgramParameter(program, gl!.ACTIVE_UNIFORMS) as number;
	for (let i = 0; i < count; i++) {
		const info = gl!.getActiveUniform(program, i)!;
		uniforms[info.name] = gl!.getUniformLocation(program, info.name);
	}
	compileMs += performance.now() - t0;
	return { program, uniforms };
}
const map = link(FRAG);
const blurSource = link(FRAG_BLUR_SOURCE);
const blur = link(FRAG_BLUR);
// The full-screen passes take their corners from gl_VertexID and need no
// attributes.
const fullScreen = gl.createVertexArray();
gl.bindVertexArray(fullScreen);

// Texture units.
const HEIGHT = 0;
const TEXT = 1;
const BLUR = 2;
const SCRATCH = 3; // whatever a render pass is reading from

// ---- rendering into textures
// Blurs run on the GPU as render passes. They need float targets to stay
// smooth at the low thresholds the map shader reads them at. Without the
// extension they fall back to 8 bits, which shows slight banding.
const floatTargets = !!(gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float"));
const fbo = gl.createFramebuffer();
type Uniforms = Record<string, WebGLUniformLocation | null>;

function createTarget(unit = SCRATCH, wrap: number = gl!.CLAMP_TO_EDGE) {
	const texture = gl!.createTexture();
	gl!.activeTexture(gl!.TEXTURE0 + unit);
	gl!.bindTexture(gl!.TEXTURE_2D, texture);
	gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
	gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
	gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, wrap);
	gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, wrap);
	return texture;
}

function resizeTarget(texture: WebGLTexture, size: number[], unit = SCRATCH) {
	gl!.activeTexture(gl!.TEXTURE0 + unit);
	gl!.bindTexture(gl!.TEXTURE_2D, texture);
	if (floatTargets) gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA16F, size[0], size[1], 0, gl!.RGBA, gl!.HALF_FLOAT, null);
	else gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA8, size[0], size[1], 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null);
}

/** Draws one full-target pass of `shader` into `target`, reading `source` if given. */
function renderPass(
	target: WebGLTexture,
	size: number[],
	shader: ReturnType<typeof link>,
	source: WebGLTexture | null,
	setUniforms: (uniforms: Uniforms) => void,
) {
	gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
	gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, target, 0);
	gl!.viewport(0, 0, size[0], size[1]);
	gl!.useProgram(shader.program);
	if (source) {
		gl!.activeTexture(gl!.TEXTURE0 + SCRATCH);
		gl!.bindTexture(gl!.TEXTURE_2D, source);
	}
	setUniforms(shader.uniforms);
	gl!.drawArrays(gl!.TRIANGLES, 0, 3);
	gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
}

/**
 * Gaussian blur of `source` into the chosen channels of `target`, by way of
 * `scratch`. All three are the same size. `sigma` is in texels.
 */
function gaussian(
	source: WebGLTexture,
	scratch: WebGLTexture,
	target: WebGLTexture,
	size: number[],
	sigma: number,
	channels: [boolean, boolean, boolean, boolean],
) {
	const along = (dx: number, dy: number) => (u: Uniforms) => {
		gl!.uniform1i(u.uSrc, SCRATCH);
		gl!.uniform2f(u.uStep, dx / size[0], dy / size[1]);
		gl!.uniform1f(u.uSigma, sigma);
	};
	renderPass(scratch, size, blur, source, along(1, 0));
	gl!.colorMask(...channels);
	renderPass(target, size, blur, scratch, along(0, 1));
	gl!.colorMask(true, true, true, true);
}

// ---- terrain, baked once at load
// The texture holds the ground twice: R as baked, and G blurred. Near text
// the map shader reads the blurred copy so the waterline stays smooth.
//
// ?bake=gpu or ?bake=cpu picks how the valleys are stamped in. ?bake=compare
// runs both and reports how far apart they are.
const seed = Number(params.get("seed") ?? 11);
const SMOOTH_SIGMA = 13.4; // texels
const bakeMode = params.get("bake") ?? (floatTargets ? "gpu" : "cpu");
const valleys = buildValleys(seed);
const heightSize = [valleys.width, valleys.height];
const heightTexture = createTarget(HEIGHT, gl.MIRRORED_REPEAT);
gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG16F, heightSize[0], heightSize[1]);

/** Stamps the valleys into heightTexture's R and G with render passes. See the terrain shaders. */
function bakeOnGpu(mark: (stage: string) => void = () => {}) {
	const [w, h] = heightSize;
	const noiseShader = link(FRAG_TERRAIN_NOISE);
	const valleyShader = link(FRAG_VALLEYS, VERT_VALLEYS);
	const finishShader = link(FRAG_TERRAIN_FINISH);
	const NOISE = SCRATCH + 1; // a second input unit, for the passes that read two textures
	mark("compile");

	// 1. Noise. 32-bit floats where they can be rendered to.
	const noise = createTarget(NOISE);
	gl!.texStorage2D(gl!.TEXTURE_2D, 1, gl!.getExtension("EXT_color_buffer_float") ? gl!.RG32F : gl!.RGBA16F, w, h);
	gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.NEAREST);
	gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.NEAREST);
	renderPass(noise, heightSize, noiseShader, null, (u) => gl!.uniform1ui(u.uSeed, seed));
	mark("noise");

	// 2. Valleys, as instanced quads into a depth texture.
	const depth = gl!.createTexture();
	gl!.activeTexture(gl!.TEXTURE0 + SCRATCH);
	gl!.bindTexture(gl!.TEXTURE_2D, depth);
	gl!.texStorage2D(gl!.TEXTURE_2D, 1, gl!.DEPTH_COMPONENT24, w, h);
	gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.NEAREST);
	gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.NEAREST);
	const depthFbo = gl!.createFramebuffer();
	gl!.bindFramebuffer(gl!.FRAMEBUFFER, depthFbo);
	gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.DEPTH_ATTACHMENT, gl!.TEXTURE_2D, depth, 0);
	gl!.drawBuffers([gl!.NONE]);
	gl!.readBuffer(gl!.NONE);

	const quads = gl!.createVertexArray();
	const instances = gl!.createBuffer();
	gl!.bindVertexArray(quads);
	gl!.bindBuffer(gl!.ARRAY_BUFFER, instances);
	gl!.bufferData(gl!.ARRAY_BUFFER, valleys.segments, gl!.STATIC_DRAW);
	const stride = SEGMENT_FLOATS * 4;
	for (const [location, size, offset] of [[0, 4, 0], [1, 4, 16], [2, 1, 32]]) {
		gl!.enableVertexAttribArray(location);
		gl!.vertexAttribPointer(location, size, gl!.FLOAT, false, stride, offset);
		gl!.vertexAttribDivisor(location, 1);
	}

	gl!.viewport(0, 0, w, h);
	gl!.enable(gl!.DEPTH_TEST);
	gl!.depthFunc(gl!.LESS);
	gl!.clearDepth(1);
	gl!.clear(gl!.DEPTH_BUFFER_BIT);
	gl!.useProgram(valleyShader.program);
	gl!.uniform2f(valleyShader.uniforms.uSize, w, h);
	gl!.uniform1i(valleyShader.uniforms.uNoise, NOISE);
	gl!.drawArraysInstanced(gl!.TRIANGLE_STRIP, 0, 4, valleys.count);
	gl!.disable(gl!.DEPTH_TEST);
	gl!.bindVertexArray(fullScreen);
	gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
	mark("valleys");

	// 3. Finish, then the light blur that rounds off banks and ridges.
	const raw = createTarget(SCRATCH, gl!.MIRRORED_REPEAT);
	const scratch = createTarget(SCRATCH, gl!.MIRRORED_REPEAT);
	resizeTarget(raw, heightSize);
	resizeTarget(scratch, heightSize);
	renderPass(raw, heightSize, finishShader, depth, (u) => {
		gl!.uniform1i(u.uDepth, SCRATCH);
		gl!.uniform1i(u.uNoise, NOISE);
	});
	gaussian(raw, scratch, heightTexture, heightSize, SHAPE.BLUR_SIGMA, [true, true, false, false]);
	mark("finish");

	for (const texture of [noise, depth, raw, scratch]) gl!.deleteTexture(texture);
	gl!.deleteFramebuffer(depthFbo);
	gl!.deleteVertexArray(quads);
	gl!.deleteBuffer(instances);
	for (const shader of [noiseShader, valleyShader, finishShader]) gl!.deleteProgram(shader.program);
}

/** The JavaScript bake, uploaded into heightTexture's R and G. */
function bakeOnCpu() {
	const { data } = generateHeight(valleys);
	const both = new Float32Array(data.length * 2);
	for (let i = 0; i < data.length; i++) both[i * 2] = both[i * 2 + 1] = data[i];
	gl!.activeTexture(gl!.TEXTURE0 + HEIGHT);
	gl!.texSubImage2D(gl!.TEXTURE_2D, 0, 0, 0, heightSize[0], heightSize[1], gl!.RG, gl!.FLOAT, both);
	return data;
}

/** Reads heightTexture's R channel back. It stalls until the GPU has caught up, so it is only for measuring. */
function readHeight() {
	gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
	gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, heightTexture, 0);
	const pixels = new Float32Array(heightSize[0] * heightSize[1] * 4);
	gl!.readPixels(0, 0, heightSize[0], heightSize[1], gl!.RGBA, gl!.FLOAT, pixels);
	gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
	return pixels.filter((_, i) => i % 4 === 0);
}

const mapShadersMs = compileMs;
let baked = `map shaders ${mapShadersMs.toFixed(0)} ms · ${valleys.count.toLocaleString()} valleys in ${valleys.ms.toFixed(0)} ms`;
{
	const t0 = performance.now();
	if (bakeMode === "cpu") {
		bakeOnCpu();
		baked += ` · cpu bake ${(performance.now() - t0).toFixed(0)} ms`;
	} else {
		const stages: string[] = [];
		let last = t0;
		bakeOnGpu((stage) => {
			stages.push(`${stage} ${(performance.now() - last).toFixed(1)}`);
			last = performance.now();
		});
		baked += ` · gpu bake submitted in ${(performance.now() - t0).toFixed(1)} ms (${stages.join(", ")})`;
		if (bakeMode === "compare") {
			// Reading one texel of the result waits for the GPU to finish it.
			gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, heightTexture, 0);
			gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, new Float32Array(4));
			baked += `, done in ${(performance.now() - t0).toFixed(1)} ms`;
			const gpu = readHeight();
			const t1 = performance.now();
			const cpu = generateHeight(valleys).data;
			// The two blur differently at the very edge of the field (one clamps,
			// one mirrors), so the largest difference is also given without it.
			const EDGE = 8;
			let sum = 0, max = 0, maxInside = 0;
			for (let i = 0; i < cpu.length; i++) {
				const d = Math.abs(cpu[i] - Math.min(1, Math.max(0, gpu[i])));
				sum += d;
				max = Math.max(max, d);
				const x = i % heightSize[0], y = (i / heightSize[0]) | 0;
				if (x >= EDGE && y >= EDGE && x < heightSize[0] - EDGE && y < heightSize[1] - EDGE) maxInside = Math.max(maxInside, d);
			}
			baked += ` · cpu ${(performance.now() - t1).toFixed(0)} ms · mean diff ${(sum / cpu.length).toExponential(2)}, max ${max.toExponential(2)} (${maxInside.toExponential(2)} away from the edges)`;
			console.log(baked);
		}
	}
	// Without float targets G stays a plain copy, and the waterline near
	// text is a little rougher.
	if (floatTargets) {
		const scratch = createTarget(SCRATCH, gl.MIRRORED_REPEAT);
		resizeTarget(scratch, heightSize);
		gaussian(heightTexture, scratch, heightTexture, heightSize, SMOOTH_SIGMA, [false, true, false, false]);
		gl.deleteTexture(scratch);
	}
}

// ---- text drawn in the shader
// The real text stays in the DOM (for screen readers, selection and search)
// and is made transparent while the canvas draws the visible version. Each
// word is rasterized at the exact position the browser laid it out.
//
// Two textures. The mask holds the glyphs and fits them closely. The blur
// covers a wider rectangle and gives the shader the "zone around the text"
// and the island's shape. Only a change in layout rebuilds them. Scrolling
// moves both rectangles, and a new tide readout redraws one strip of the
// mask.
const stage = document.querySelector<HTMLElement>(".stage")!;
const textEls = Array.from(document.querySelectorAll<HTMLElement>("[data-hero-text]"));
const eyebrow = textEls.find((el) => el.dataset.heroText === "small")!;
const mask = document.createElement("canvas");
const maskCtx = mask.getContext("2d")!;
const strip = document.createElement("canvas");
const stripCtx = strip.getContext("2d")!;
gl.activeTexture(gl.TEXTURE0 + TEXT);
gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
const blurTexture = createTarget(BLUR);
const blurInput = createTarget();
const blurScratch = createTarget();

// One mask channel per tier: red = the name, blue = the tagline, green = small.
const TIER_COLOR: Record<string, string> = { display: "#f00", lead: "#00f", small: "#0f0" };
const MARGIN = 4; // CSS px kept clear around the glyphs in the mask
const PAD = 220; // CSS px around the mask for the blurred zone and island slopes
const SLOT = 64; // CSS px. The readout's reserved width changes in these steps.
const BLUR_DOWNSCALE = 4; // the blurs are smooth, so they don't need full resolution
const BAR = 0.3; // the readout's weight in the blur, about the ink of small text

interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}
// Both in device px from the top-left of the document, so scrolling only
// changes an offset.
let maskRect: Rect = { x: 0, y: 0, w: 1, h: 1 };
let blurRect: Rect = { x: 0, y: 0, w: 1, h: 1 };
let blurSize = [1, 1];
let slotWidth = 0; // CSS px reserved for the readout
let stripTop = 0; // mask row where the eyebrow's strip starts
let layoutDirty = true;
let readoutDirty = false;
let fontsReady = false;
document.fonts.ready.then(() => {
	fontsReady = true;
	layoutDirty = true;
	wake();
});

const deviceScale = () => canvas.width / canvas.clientWidth;
const scrollOffset = (scale: number) => [Math.round(scrollX * scale), Math.round(scrollY * scale)];

function* words(el: HTMLElement) {
	const range = document.createRange();
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		for (const word of (node.textContent ?? "").matchAll(/\S+/g)) {
			range.setStart(node, word.index);
			range.setEnd(node, word.index + word[0].length);
			const rect = range.getClientRects()[0];
			if (rect) yield { text: word[0], rect };
		}
	}
}

/** Left and right edges of an element's words, in CSS px from the viewport. */
function extent(el: HTMLElement) {
	let left = Infinity, right = -Infinity;
	for (const { rect } of words(el)) {
		left = Math.min(left, rect.left);
		right = Math.max(right, rect.right);
	}
	return { left, right };
}

/** Draws an element's words so that device px (ox, oy) of the viewport is the context's origin. */
function drawWords(ctx: CanvasRenderingContext2D, el: HTMLElement, scale: number, ox: number, oy: number) {
	const cs = getComputedStyle(el);
	ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize) * scale}px ${cs.fontFamily}`;
	ctx.fillStyle = TIER_COLOR[el.dataset.heroText ?? "display"] ?? "#f00";
	ctx.textBaseline = "alphabetic";
	for (const { text, rect } of words(el)) {
		const ascent = ctx.measureText(text).fontBoundingBoxAscent;
		ctx.fillText(text, rect.left * scale - ox, rect.top * scale - oy + ascent);
	}
}

// Full rebuild: measure the text, rasterize all of it and blur it.
function layoutText() {
	// Nothing to measure against while the canvas has no size (a tab opened
	// in the background, for instance). Stay dirty and try again next frame.
	if (!canvas.clientWidth || !canvas.width) return;
	const scale = deviceScale();
	let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
	let bar = { left: 0, right: 0 };
	for (const el of textEls) {
		const box = el.getBoundingClientRect();
		const ext = extent(el);
		if (ext.left > ext.right) continue;
		top = Math.min(top, box.top);
		bottom = Math.max(bottom, box.bottom);
		left = Math.min(left, ext.left);
		if (el === eyebrow) {
			// The readout gets a slot a little wider than it needs, so most
			// changes fit without moving anything else.
			slotWidth = Math.ceil((ext.right - ext.left) / SLOT) * SLOT;
			bar = { left: ext.left, right: ext.left + slotWidth };
			right = Math.max(right, bar.right);
		} else {
			right = Math.max(right, ext.right);
		}
	}
	if (left > right) return;
	const x0 = Math.floor((left - MARGIN) * scale);
	const y0 = Math.floor((top - MARGIN) * scale);
	mask.width = Math.ceil((right + MARGIN) * scale) - x0;
	mask.height = Math.ceil((bottom + MARGIN) * scale) - y0;

	// Opaque black ground, so each channel holds antialiased coverage.
	maskCtx.fillStyle = "#000";
	maskCtx.fillRect(0, 0, mask.width, mask.height);
	for (const el of textEls) drawWords(maskCtx, el, scale, x0, y0);
	gl!.activeTexture(gl!.TEXTURE0 + TEXT);
	gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, mask);

	const [sx, sy] = scrollOffset(scale);
	maskRect = { x: x0 + sx, y: y0 + sy, w: mask.width, h: mask.height };
	const line = eyebrow.getBoundingClientRect();
	stripTop = Math.floor(line.top * scale) - y0;
	strip.width = mask.width;
	strip.height = Math.ceil(line.bottom * scale) - Math.floor(line.top * scale);

	// Blurs. The readout goes in as a flat bar the width of its slot, so the
	// blur does not depend on what the readout says.
	const D = BLUR_DOWNSCALE;
	const pad = Math.round((PAD * scale) / D);
	const size = [Math.ceil(mask.width / D) + 2 * pad, Math.ceil(mask.height / D) + 2 * pad];
	if (size[0] !== blurSize[0] || size[1] !== blurSize[1]) {
		resizeTarget(blurTexture, size, BLUR);
		resizeTarget(blurInput, size);
		resizeTarget(blurScratch, size);
		blurSize = size;
	}
	renderPass(blurInput, size, blurSource, null, (u) => {
		gl!.uniform1i(u.uText, TEXT);
		gl!.uniform1f(u.uScale, D);
		gl!.uniform2f(u.uOffset, pad * D, pad * D);
		gl!.uniform4f(
			u.uBar,
			pad * D + bar.left * scale - x0,
			pad * D + stripTop,
			pad * D + bar.right * scale - x0,
			pad * D + stripTop + strip.height,
		);
		gl!.uniform1f(u.uBarValue, BAR);
	});
	// Radii are in CSS px. Sigma is in the blur texture's texels.
	const sigma = (cssPx: number) => (cssPx * scale) / D + 0.5;
	gaussian(blurInput, blurScratch, blurTexture, size, sigma(12), [true, false, true, false]);
	gaussian(blurInput, blurScratch, blurTexture, size, sigma(62), [false, true, false, false]);
	blurRect = { x: maskRect.x - pad * D, y: maskRect.y - pad * D, w: size[0] * D, h: size[1] * D };
	layoutDirty = readoutDirty = false;
}

// The tide readout changed: redraw its strip of the mask and nothing else.
function drawReadout() {
	const ext = extent(eyebrow);
	const width = ext.right - ext.left;
	// Outgrew its slot, or shrank well below it: lay everything out again.
	if (width > slotWidth || width < slotWidth - 2 * SLOT) {
		layoutDirty = true;
		return;
	}
	const scale = deviceScale();
	const [sx, sy] = scrollOffset(scale);
	stripCtx.fillStyle = "#000";
	stripCtx.fillRect(0, 0, strip.width, strip.height);
	drawWords(stripCtx, eyebrow, scale, maskRect.x - sx, maskRect.y - sy + stripTop);
	gl!.activeTexture(gl!.TEXTURE0 + TEXT);
	gl!.texSubImage2D(gl!.TEXTURE_2D, 0, 0, stripTop, gl!.RGBA, gl!.UNSIGNED_BYTE, strip);
	readoutDirty = false;
}
addEventListener("scroll", () => wake(), { passive: true });
new ResizeObserver(() => ((layoutDirty = true), wake())).observe(stage);

// ---- state
let mode: Mode = params.has("tide") ? "scrub" : "live";
let scrub = Number(params.get("tide") ?? 0.5);
let lapseStart = performance.now();
const TEXT_MODES = ["split", "island", "hybrid"] as const;
// Off: the canvas leaves the text to the DOM and skips all text work.
let canvasText = !params.has("domtext");
let textMode = Math.max(0, TEXT_MODES.indexOf((params.get("text") ?? "split") as (typeof TEXT_MODES)[number]));
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const darkQuery = matchMedia("(prefers-color-scheme: dark)");
const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : darkQuery.matches);

const clock = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" });
const day = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "short", hour: "numeric" });

function currentTide() {
	if (mode === "scrub") return { level: scrub, next: 0.8, rate: 0.6, label: `scrubbing · ${Math.round(scrub * 100)}% of range` };
	// Time-lapse: one hour of tide per second, starting from now.
	const when = mode === "lapse" ? new Date(Date.now() + (performance.now() - lapseStart) * 3600) : new Date();
	const t = tideAt(when);
	const trend = t.rate >= 0 ? "rising" : "falling";
	const label =
		mode === "lapse"
			? `${day.format(when)} · ${t.height.toFixed(1)} ft · ${trend}`
			: `${t.height.toFixed(1)} ft · ${trend} · ${t.next.type} ${t.next.height.toFixed(1)} ft at ${clock.format(t.next.time)}`;
	return { level: t.level, next: t.nextLevel, rate: t.rate, label };
}

// ---- drawing
function resize() {
	const dpr = Math.min(devicePixelRatio || 1, 2);
	const w = Math.round(canvas.clientWidth * dpr);
	const h = Math.round(canvas.clientHeight * dpr);
	if (canvas.width === w && canvas.height === h) return false;
	canvas.width = w;
	canvas.height = h;
	return true;
}

const start = performance.now();
let frames = 0;
let lastStat = start;
// Text work since the last stats update: [count, total ms] for each kind.
const textWork = { layout: [0, 0], readout: [0, 0] };
function timed(kind: keyof typeof textWork, work: () => void) {
	const t0 = performance.now();
	work();
	textWork[kind][0]++;
	textWork[kind][1] += performance.now() - t0;
}
function draw(now: number) {
	const resized = resize();
	const tide = currentTide();

	// The canvas takes over the text once the fonts have loaded. Until then
	// the ordinary DOM text shows.
	const textOn = fontsReady && canvasText;
	stage.classList.toggle("on-canvas", textOn);
	if (readout.textContent !== tide.label) {
		readout.textContent = tide.label;
		readoutDirty = true;
	}
	if (textOn) {
		if (resized) layoutDirty = true;
		if (readoutDirty && !layoutDirty) timed("readout", drawReadout);
		if (layoutDirty) timed("layout", layoutText);
	}
	const { program, uniforms } = map;
	const colors = palettes[isDark() ? "dark" : "light"];

	gl!.viewport(0, 0, canvas.width, canvas.height);
	gl!.useProgram(program);
	gl!.uniform2f(uniforms.uRes, canvas.width, canvas.height);
	gl!.uniform1f(uniforms.uTime, reduceMotion.matches ? 0 : (now - start) / 1000);
	gl!.uniform1f(uniforms.uLevel, tide.level);
	gl!.uniform1f(uniforms.uRate, tide.rate);
	gl!.uniform1f(uniforms.uNext, tide.next);
	gl!.uniform1f(uniforms.uFieldAspect, 1.6);
	gl!.uniform1i(uniforms.uHeight, HEIGHT);
	gl!.uniform2f(uniforms.uHeightSize, heightSize[0], heightSize[1]);
	gl!.uniform1i(uniforms.uText, TEXT);
	gl!.uniform1i(uniforms.uBlur, BLUR);
	gl!.uniform2f(uniforms.uBlurSize, blurSize[0], blurSize[1]);
	gl!.uniform1f(uniforms.uTextOn, textOn ? 1 : 0);
	gl!.uniform1f(uniforms.uTextMode, textMode);
	const [sx, sy] = scrollOffset(deviceScale());
	gl!.uniform4f(uniforms.uTextRect, maskRect.x - sx, maskRect.y - sy, maskRect.w, maskRect.h);
	gl!.uniform4f(uniforms.uBlurRect, blurRect.x - sx, blurRect.y - sy, blurRect.w, blurRect.h);
	for (const [name, c] of Object.entries(colors)) gl!.uniform3f(uniforms[name], c[0], c[1], c[2]);
	gl!.drawArrays(gl!.TRIANGLES, 0, 3);
	frames++;
	if (now - lastStat > 1000) {
		const work = Object.entries(textWork)
			.filter(([, [n]]) => n)
			.map(([kind, [n, ms]]) => ` · ${kind} ×${n}, ${(ms / n).toFixed(1)} ms each`)
			.join("");
		stats.textContent = `${Math.round((frames * 1000) / (now - lastStat))} fps · ${canvas.width}×${canvas.height} · ${p3 ? "P3" : "sRGB"}${work} · ${baked}`;
		frames = 0;
		textWork.layout = [0, 0];
		textWork.readout = [0, 0];
		lastStat = now;
	}
}

// Always draw one frame straight away, so a tab opened in the background is
// not blank when it is shown. Keep animating only while the tab is visible
// and motion is allowed; with reduced motion the tide still updates, just
// without continuous movement.
let raf = 0;
function loop(now: number) {
	draw(now);
	raf = requestAnimationFrame(loop);
}
function wake() {
	cancelAnimationFrame(raf);
	raf = 0;
	draw(performance.now());
	if (!document.hidden && !reduceMotion.matches) raf = requestAnimationFrame(loop);
}
document.addEventListener("visibilitychange", wake);
reduceMotion.addEventListener("change", wake);
darkQuery.addEventListener("change", wake);
new MutationObserver(wake).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
new ResizeObserver(wake).observe(canvas);
setInterval(() => reduceMotion.matches && wake(), 30000);

// ---- controls
function sync() {
	document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) =>
		b.setAttribute("aria-pressed", String(b.dataset.mode === mode)),
	);
	document.querySelectorAll<HTMLButtonElement>("[data-text]").forEach((b) =>
		b.setAttribute("aria-pressed", String(b.dataset.text === TEXT_MODES[textMode])),
	);
	const slider = document.querySelector<HTMLInputElement>("#tide-scrub")!;
	slider.disabled = mode !== "scrub";
	slider.value = String(scrub);
	wake();
}
document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) =>
	b.addEventListener("click", () => {
		mode = b.dataset.mode as Mode;
		if (mode === "lapse") lapseStart = performance.now();
		sync();
	}),
);
document.querySelectorAll<HTMLButtonElement>("[data-text]").forEach((b) =>
	b.addEventListener("click", () => {
		textMode = TEXT_MODES.indexOf(b.dataset.text as (typeof TEXT_MODES)[number]);
		sync();
	}),
);
const canvasTextBox = document.querySelector<HTMLInputElement>("#hero-canvas-text")!;
canvasTextBox.checked = canvasText;
canvasTextBox.addEventListener("change", () => {
	canvasText = canvasTextBox.checked;
	layoutDirty = true;
	wake();
});
document.querySelector<HTMLInputElement>("#tide-scrub")!.addEventListener("input", (e) => {
	scrub = Number((e.target as HTMLInputElement).value);
	wake();
});
document.querySelector<HTMLButtonElement>("#hero-theme")!.addEventListener("click", () => {
	root.dataset.theme = isDark() ? "light" : "dark";
});

sync();
