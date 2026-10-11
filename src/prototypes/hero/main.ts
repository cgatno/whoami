// Prototype harness: one full-viewport WebGL2 canvas, a shader per variant,
// and controls for switching between them and scrubbing the tide.
import { makeColors, type RGB } from "./color";
import { generateField } from "./network";
import { FRAG_CHART, FRAG_FILAMENTS, FRAG_FLATS, FRAG_TERRAIN, FRAG_TOPO, VERT } from "./shaders";
import { tideAt } from "./tide";
import { generateHeight } from "./topo";

const VARIANTS = {
	flats: FRAG_FLATS,
	filaments: FRAG_FILAMENTS,
	terrain: FRAG_TERRAIN,
	chart: FRAG_CHART,
	topo: FRAG_TOPO,
} as const;
type Variant = keyof typeof VARIANTS;
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
		cFlat: oklch(0.25, 0.025, 185),
		cRill: oklch(0.33, 0.04, 180),
		cWater: oklch(0.82, 0.17, 172),
		cDeep: oklch(0.27, 0.055, 195),
		cFoam: oklch(0.96, 0.05, 150),
		cPop: oklch(0.7, 0.3, 338),
		// Both are light, so both read on dark. The split shows as a color change.
		cInkLand: oklch(0.82, 0.17, 172),
		cInkWater: hex("#e0edec"),
		cInk: hex("#e0edec"),
	},
	// Light: dark water on pale marsh, like the Nisqually delta.
	light: {
		cGround: hex("#f3fbfb"),
		cFlat: oklch(0.9, 0.025, 170),
		cRill: oklch(0.7, 0.05, 185),
		cWater: oklch(0.66, 0.14, 178),
		cDeep: oklch(0.36, 0.075, 198),
		cFoam: oklch(0.99, 0.015, 170),
		cPop: oklch(0.6, 0.28, 340),
		cInkLand: hex("#142726"),
		cInkWater: hex("#f3fbfb"),
		cInk: hex("#142726"),
	},
};

// ---- programs
function compile(type: number, src: string) {
	const s = gl!.createShader(type)!;
	gl!.shaderSource(s, src);
	gl!.compileShader(s);
	if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(s) ?? "shader error");
	return s;
}
const vert = compile(gl.VERTEX_SHADER, VERT);
const programs = {} as Record<Variant, { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> }>;
for (const [name, frag] of Object.entries(VARIANTS) as [Variant, string][]) {
	const program = gl.createProgram()!;
	gl.attachShader(program, vert);
	gl.attachShader(program, compile(gl.FRAGMENT_SHADER, frag));
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link error");
	const uniforms: Record<string, WebGLUniformLocation | null> = {};
	const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
	for (let i = 0; i < count; i++) {
		const info = gl.getActiveUniform(program, i)!;
		uniforms[info.name] = gl.getUniformLocation(program, info.name);
	}
	programs[name] = { program, uniforms };
}
gl.bindVertexArray(gl.createVertexArray());

// ---- baked textures, built only when a variant that needs them is shown
const seed = Number(params.get("seed") ?? 11);
function upload(unit: number, internal: number, format: number, w: number, h: number, data: Float32Array) {
	gl!.activeTexture(gl!.TEXTURE0 + unit);
	gl!.bindTexture(gl!.TEXTURE_2D, gl!.createTexture());
	gl!.texImage2D(gl!.TEXTURE_2D, 0, internal, w, h, 0, format, gl!.FLOAT, data);
	gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
	gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
	gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.MIRRORED_REPEAT);
	gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.MIRRORED_REPEAT);
}
let field: ReturnType<typeof generateField> | undefined;
let height: ReturnType<typeof generateHeight> | undefined;
let baked = "";
function ensureBaked() {
	if ((variant === "flats" || variant === "filaments") && !field) {
		field = generateField(seed);
		upload(0, gl!.RGBA16F, gl!.RGBA, field.width, field.height, field.data);
		baked = `network ${field.segments.toLocaleString()} segments in ${Math.round(field.ms)} ms`;
	}
	if (variant === "topo" && !height) {
		height = generateHeight(seed);
		upload(1, gl!.R16F, gl!.RED, height.width, height.height, height.data);
		baked = `terrain from ${height.valleys.toLocaleString()} valley segments in ${Math.round(height.ms)} ms`;
	}
}

// ---- text drawn in the shader
// The real text stays in the DOM (for screen readers, selection and search)
// and is made transparent while the canvas draws the visible version. Each
// word is rasterized at the exact position the browser laid it out.
const stage = document.querySelector<HTMLElement>(".stage")!;
const textEls = Array.from(document.querySelectorAll<HTMLElement>("[data-hero-text]"));
const mask = document.createElement("canvas");
const maskCtx = mask.getContext("2d")!;
gl.activeTexture(gl.TEXTURE2);
gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
// A second texture holds smooth blurs of the mask, which give the shader the
// "zone around the text" and the island's shape. These are real blurs. A low
// mip level is only a few texels wide at these radii and leaves faceted
// edges.
gl.activeTexture(gl.TEXTURE3);
gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
const small = document.createElement("canvas");
const smallCtx = small.getContext("2d", { willReadFrequently: true })!;
let blurSize = [1, 1];
const BLUR_DOWNSCALE = 4;

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

let textRect = [0, 0, 1, 1];
let textDirty = true;
let fontsReady = false;
document.fonts.ready.then(() => {
	fontsReady = true;
	textDirty = true;
	wake();
});

function drawTextMask() {
	// Nothing to measure against while the canvas has no size (a tab opened
	// in the background, for instance). Stay dirty and try again next frame.
	if (!canvas.clientWidth || !canvas.width) return;
	textDirty = false;
	const scale = canvas.width / canvas.clientWidth;
	// Only the block the text occupies is rasterized and uploaded.
	let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
	for (const el of textEls) {
		const r = el.getBoundingClientRect();
		x0 = Math.min(x0, r.left);
		y0 = Math.min(y0, r.top);
		x1 = Math.max(x1, r.right);
		y1 = Math.max(y1, r.bottom);
	}
	const pad = 220; // room for the blurred zone (and island slopes) around the text
	x0 = Math.floor((x0 - pad) * scale);
	y0 = Math.floor((y0 - pad) * scale);
	mask.width = Math.max(1, Math.ceil((x1 + pad) * scale) - x0);
	mask.height = Math.max(1, Math.ceil((y1 + pad) * scale) - y0);
	textRect = [x0, y0, mask.width, mask.height];

	// Opaque black ground, so each channel holds antialiased coverage.
	maskCtx.fillStyle = "#000";
	maskCtx.fillRect(0, 0, mask.width, mask.height);
	maskCtx.textBaseline = "alphabetic";
	const range = document.createRange();
	for (const el of textEls) {
		const cs = getComputedStyle(el);
		maskCtx.font = `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize) * scale}px ${cs.fontFamily}`;
		// One channel per tier: red = the name, blue = the tagline, green = small.
		maskCtx.fillStyle = { display: "#f00", lead: "#00f", small: "#0f0" }[el.dataset.heroText ?? "display"] ?? "#f00";
		const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			for (const word of (node.textContent ?? "").matchAll(/\S+/g)) {
				range.setStart(node, word.index);
				range.setEnd(node, word.index + word[0].length);
				const r = range.getClientRects()[0];
				if (!r) continue;
				const ascent = maskCtx.measureText(word[0]).fontBoundingBoxAscent;
				maskCtx.fillText(word[0], r.left * scale - x0, r.top * scale - y0 + ascent);
			}
		}
	}
	gl!.activeTexture(gl!.TEXTURE2);
	gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, mask);

	// Blurs, computed at reduced resolution (they are smooth, so nothing is lost).
	const bw = Math.max(1, Math.ceil(mask.width / BLUR_DOWNSCALE));
	const bh = Math.max(1, Math.ceil(mask.height / BLUR_DOWNSCALE));
	small.width = bw;
	small.height = bh;
	smallCtx.drawImage(mask, 0, 0, bw, bh);
	const px = smallCtx.getImageData(0, 0, bw, bh).data;
	const all = new Float32Array(bw * bh);
	const rest = new Float32Array(bw * bh);
	for (let i = 0; i < bw * bh; i++) {
		const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
		all[i] = Math.max(r, g, b) / 255;
		rest[i] = Math.max(g, b) / 255; // tagline and small text only
	}
	// Radii are in CSS px, converted to this texture's pixels.
	const toBlurPx = (cssPx: number) => Math.max(1, Math.round((cssPx * scale) / BLUR_DOWNSCALE));
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
	gl!.activeTexture(gl!.TEXTURE3);
	gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA16F, bw, bh, 0, gl!.RGBA, gl!.FLOAT, packed);
	blurSize = [bw, bh];
}
addEventListener("scroll", () => ((textDirty = true), wake()), { passive: true });

// ---- state
// Topo is the current direction; the others stay for comparison.
let variant = ((params.get("v") as Variant) in VARIANTS ? params.get("v") : "topo") as Variant;
let mode: Mode = params.has("tide") ? "scrub" : "live";
let scrub = Number(params.get("tide") ?? 0.5);
let lapseStart = performance.now();
const TEXT_MODES = ["split", "island", "hybrid"] as const;
// Off: the canvas leaves the text to the DOM and skips all text work.
let canvasText = !params.has("domtext");
let textMode = Math.max(0, TEXT_MODES.indexOf((params.get("text") ?? "split") as (typeof TEXT_MODES)[number]));
// Sea at the top reads as a map (or roots); at the bottom, as a horizon.
let seaTop = params.get("sea") !== "bottom";
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
// Cost of re-rasterizing the text mask since the last stats update.
let textMs = 0;
let textDraws = 0;
function draw(now: number) {
	const resized = resize();
	ensureBaked();
	const tide = currentTide();

	// The canvas takes over the text only for Topo, and only once the fonts
	// have loaded; otherwise the ordinary DOM text shows.
	const textOn = variant === "topo" && fontsReady && canvasText;
	stage.classList.toggle("on-canvas", textOn);
	if (readout.textContent !== tide.label) {
		readout.textContent = tide.label;
		textDirty = true;
	}
	if (textOn && (textDirty || resized)) {
		const t0 = performance.now();
		drawTextMask();
		textMs += performance.now() - t0;
		textDraws++;
	}
	const { program, uniforms } = programs[variant];
	const colors = palettes[isDark() ? "dark" : "light"];

	gl!.viewport(0, 0, canvas.width, canvas.height);
	gl!.useProgram(program);
	gl!.uniform2f(uniforms.uRes, canvas.width, canvas.height);
	gl!.uniform1f(uniforms.uTime, reduceMotion.matches ? 0 : (now - start) / 1000);
	gl!.uniform1f(uniforms.uLevel, tide.level);
	gl!.uniform1f(uniforms.uRate, tide.rate);
	gl!.uniform1f(uniforms.uNext, tide.next);
	gl!.uniform1f(uniforms.uDark, isDark() ? 1 : 0);
	gl!.uniform1f(uniforms.uFieldAspect, 1.6);
	gl!.uniform1f(uniforms.uSeaTop, seaTop ? 1 : 0);
	gl!.uniform1i(uniforms.uField, 0);
	gl!.uniform1i(uniforms.uHeight, 1);
	if (height) gl!.uniform2f(uniforms.uHeightSize, height.width, height.height);
	gl!.uniform1i(uniforms.uText, 2);
	gl!.uniform1i(uniforms.uBlur, 3);
	gl!.uniform2f(uniforms.uBlurSize, blurSize[0], blurSize[1]);
	gl!.uniform1f(uniforms.uTextOn, textOn ? 1 : 0);
	gl!.uniform1f(uniforms.uTextMode, textMode);
	gl!.uniform4f(uniforms.uTextRect, textRect[0], textRect[1], textRect[2], textRect[3]);
	for (const [name, c] of Object.entries(colors)) gl!.uniform3f(uniforms[name], c[0], c[1], c[2]);
	gl!.drawArrays(gl!.TRIANGLES, 0, 3);
	frames++;
	if (now - lastStat > 1000) {
		stats.textContent = `${Math.round((frames * 1000) / (now - lastStat))} fps · ${canvas.width}×${canvas.height} · ${p3 ? "P3" : "sRGB"}${textDraws ? ` · text ×${textDraws}, ${(textMs / textDraws).toFixed(1)} ms each` : ""}${baked ? " · " + baked : ""}`;
		frames = 0;
		textMs = 0;
		textDraws = 0;
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
	document.querySelectorAll<HTMLButtonElement>("[data-variant]").forEach((b) =>
		b.setAttribute("aria-pressed", String(b.dataset.variant === variant)),
	);
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
document.querySelectorAll<HTMLButtonElement>("[data-variant]").forEach((b) =>
	b.addEventListener("click", () => {
		variant = b.dataset.variant as Variant;
		sync();
	}),
);
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
	textDirty = true;
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
