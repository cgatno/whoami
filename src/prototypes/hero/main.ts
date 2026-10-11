// Prototype harness: one full-viewport WebGL2 canvas and controls for the
// tide and the text treatment.
import { makeColors, type RGB } from "./color";
import { FRAG, VERT } from "./shaders";
import { tideAt } from "./tide";
import { generateHeight } from "./topo";

type Mode = "live" | "scrub" | "lapse";

const canvas = document.querySelector<HTMLCanvasElement>("#hero")!;
const readout = document.querySelector<HTMLElement>("#tide-readout")!;
const stats = document.querySelector<HTMLElement>("#hero-stats")!;
const root = document.documentElement;
const params = new URLSearchParams(location.search);

const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "low-power" });
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
function compile(type: number, src: string) {
	const s = gl!.createShader(type)!;
	gl!.shaderSource(s, src);
	gl!.compileShader(s);
	if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(s) ?? "shader error");
	return s;
}
function link(frag: string) {
	const program = gl!.createProgram()!;
	gl!.attachShader(program, compile(gl!.VERTEX_SHADER, VERT));
	gl!.attachShader(program, compile(gl!.FRAGMENT_SHADER, frag));
	gl!.linkProgram(program);
	if (!gl!.getProgramParameter(program, gl!.LINK_STATUS)) throw new Error(gl!.getProgramInfoLog(program) ?? "link error");
	const uniforms: Record<string, WebGLUniformLocation | null> = {};
	const count = gl!.getProgramParameter(program, gl!.ACTIVE_UNIFORMS) as number;
	for (let i = 0; i < count; i++) {
		const info = gl!.getActiveUniform(program, i)!;
		uniforms[info.name] = gl!.getUniformLocation(program, info.name);
	}
	return { program, uniforms };
}
const map = link(FRAG);
gl.bindVertexArray(gl.createVertexArray());

// Texture units.
const HEIGHT = 0;
const TEXT = 1;
const BLUR = 2;

// ---- terrain, baked once at load
const seed = Number(params.get("seed") ?? 11);
const height = generateHeight(seed);
gl.activeTexture(gl.TEXTURE0 + HEIGHT);
gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, height.width, height.height, 0, gl.RED, gl.FLOAT, height.data);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
const baked = `terrain from ${height.valleys.toLocaleString()} valley segments in ${Math.round(height.ms)} ms`;

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
const small = document.createElement("canvas");
const smallCtx = small.getContext("2d", { willReadFrequently: true })!;
for (const unit of [TEXT, BLUR]) {
	gl.activeTexture(gl.TEXTURE0 + unit);
	gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

// One mask channel per tier: red = the name, blue = the tagline, green = small.
const TIER_COLOR: Record<string, string> = { display: "#f00", lead: "#00f", small: "#0f0" };
const MARGIN = 4; // CSS px kept clear around the glyphs in the mask
const PAD = 220; // CSS px around the mask for the blurred zone and island slopes
const SLOT = 64; // CSS px. The readout's reserved width changes in these steps.
const BLUR_DOWNSCALE = 4;
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

// Three passes of a box blur approximate a Gaussian.
function boxBlur(src: Float32Array, w: number, h: number, radius: number) {
	let a = src;
	let b = new Float32Array(src.length);
	const pass = (n: number, stride: number, lines: number, step: number) => {
		for (let l = 0; l < lines; l++) {
			const base = l * step;
			let sum = 0;
			for (let k = -radius; k <= radius; k++) sum += a[base + Math.min(n - 1, Math.max(0, k)) * stride];
			for (let k = 0; k < n; k++) {
				b[base + k * stride] = sum / (2 * radius + 1);
				sum += a[base + Math.min(n - 1, k + radius + 1) * stride] - a[base + Math.max(0, k - radius) * stride];
			}
		}
		[a, b] = [b, a];
	};
	for (let i = 0; i < 3; i++) {
		pass(w, 1, h, w);
		pass(h, w, w, 1);
	}
	return a;
}

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

	// Blurs, computed at reduced resolution (they are smooth, so nothing is
	// lost). The readout goes in as a flat bar the width of its slot, so the
	// blur does not depend on what the readout says.
	const D = BLUR_DOWNSCALE;
	const pad = Math.round((PAD * scale) / D);
	const bw = Math.ceil(mask.width / D) + 2 * pad;
	const bh = Math.ceil(mask.height / D) + 2 * pad;
	small.width = bw;
	small.height = bh;
	smallCtx.fillStyle = "#000";
	smallCtx.fillRect(0, 0, bw, bh);
	smallCtx.drawImage(mask, pad, pad, mask.width / D, mask.height / D);
	const px = smallCtx.getImageData(0, 0, bw, bh).data;
	const barX0 = pad + (bar.left * scale - x0) / D, barX1 = pad + (bar.right * scale - x0) / D;
	const barY0 = pad + stripTop / D, barY1 = pad + (stripTop + strip.height) / D;
	const all = new Float32Array(bw * bh);
	const rest = new Float32Array(bw * bh);
	for (let y = 0, i = 0; y < bh; y++) {
		for (let x = 0; x < bw; x++, i++) {
			const inBar = x >= barX0 && x < barX1 && y >= barY0 && y < barY1 ? BAR : 0;
			const name = px[i * 4] / 255, tagline = px[i * 4 + 2] / 255;
			all[i] = Math.max(name, tagline, inBar);
			rest[i] = Math.max(tagline, inBar); // tagline and small text only
		}
	}
	// Radii are in CSS px, converted to this texture's pixels.
	const toBlurPx = (cssPx: number) => Math.max(1, Math.round((cssPx * scale) / D));
	// boxBlur uses its input as scratch space, so take the copy first.
	const wideAll = boxBlur(all.slice(), bw, bh, toBlurPx(62));
	const tightAll = boxBlur(all, bw, bh, toBlurPx(12));
	const tightRest = boxBlur(rest, bw, bh, toBlurPx(12));
	const packed = new Float32Array(bw * bh * 4);
	for (let i = 0; i < bw * bh; i++) {
		packed[i * 4] = tightAll[i];
		packed[i * 4 + 1] = wideAll[i];
		packed[i * 4 + 2] = tightRest[i];
		packed[i * 4 + 3] = 1;
	}
	gl!.activeTexture(gl!.TEXTURE0 + BLUR);
	gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA16F, bw, bh, 0, gl!.RGBA, gl!.FLOAT, packed);
	blurSize = [bw, bh];
	blurRect = { x: maskRect.x - pad * D, y: maskRect.y - pad * D, w: bw * D, h: bh * D };
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
	gl!.uniform2f(uniforms.uHeightSize, height.width, height.height);
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
