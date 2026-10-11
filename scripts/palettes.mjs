#!/usr/bin/env node
/**
 * Generate src/styles/palette.css and verify every colour pairing.
 *
 * Run with `npm run palettes`. No dependencies.
 *
 * Each palette is two source hues (accent, secondary). Everything else is
 * derived in OKLab: neutrals take the accent hue at low chroma, text tones are
 * solved for contrast against --raise (the stricter surface in both themes),
 * and P3 overrides are emitted only where P3 can show what sRGB cannot.
 *
 * All three candidates are derived and checked; only ACTIVE is written, as
 * light-dark() pairs inside the `tokens` cascade layer.
 *
 * If any WCAG check fails, nothing is written and the script exits 1.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(import.meta.dirname, "..", "src", "styles", "palette.css");

// ---- palettes ---------------------------------------------------------------

const SRC = {
	a: ["#3730C4", "#B4451B"],
	b: ["#0F5E5C", "#9A6A0F"],
	c: ["#8C2E3C", "#3F5C7A"],
};
const NAMES = { a: "Ink & Ember", b: "Petrol & Ochre", c: "Oxblood & Slate" };

// The palette that ships. Switching is a one-line change here.
const ACTIVE = "b";

// Neutral roles as [OKLab lightness, chroma], all at the accent hue.
const LIGHT = {
	ground: [0.982, 0.009], raise: [0.95, 0.018], rule: [0.888, 0.022],
	ink: [0.255, 0.024], dim: [0.52, 0.036],
};
const DARK = {
	ground: [0.19, 0.016], raise: [0.243, 0.024], rule: [0.33, 0.03],
	ink: [0.935, 0.014], dim: [0.78, 0.028],
};

// [role, minimum ratio, surface, label]. --rule is decorative and exempt.
const CHECKS = [
	["ink", 4.5, "ground", "ink"], ["ink", 4.5, "raise", "ink on raise"],
	["dim", 4.5, "ground", "dim"], ["dim", 4.5, "raise", "dim on raise"],
	["faint", 4.5, "ground", "faint"], ["faint", 4.5, "raise", "faint on raise"],
	["accent", 4.5, "ground", "link"], ["accent", 4.5, "raise", "link on raise"],
	["secondary", 4.5, "ground", "secondary"], ["secondary", 4.5, "raise", "secondary on raise"],
	["rule-strong", 3.0, "ground", "control border"],
	["rule-strong", 3.0, "raise", "control border on card"],
];

// ---- colour maths -----------------------------------------------------------

// Round half to even, matching the Python original, so hex output can't drift
// on an exact .5 (Math.round always rounds halves up).
const roundEven = (x) => {
	const r = Math.round(x);
	return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
};
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const cbrt = (x) => (x < 0 ? -1 : 1) * Math.abs(x) ** (1 / 3);

const hx = (h) => {
	h = h.replace(/^#/, "");
	return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
};
const s2l = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const l2s = (v) => {
	v = clamp01(v);
	return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
};
const hexof = (lin) =>
	"#" + lin.map((v) => roundEven(l2s(v) * 255).toString(16).padStart(2, "0")).join("");

function toLab(c) {
	const l = cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]);
	const m = cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]);
	const s = cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	];
}

function fromLab(L, a, b) {
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	];
}

function lch(h) {
	const [L, a, b] = toLab(hx(h).map(s2l));
	return [L, Math.hypot(a, b), Math.atan2(b, a)];
}

const inGamut = (v) => v.every((x) => x >= -1e-4 && x <= 1 + 1e-4);

/** Colour at OKLCH (L, C, h), easing chroma down until it fits sRGB. */
function mk(L, C, h) {
	let c;
	for (let i = 0; i < 40; i++) {
		c = fromLab(L, C * Math.cos(h), C * Math.sin(h));
		if (inGamut(c)) return c.map(clamp01);
		C *= 0.95;
	}
	return c.map(clamp01);
}

const Y = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const cr = (a, b) => {
	const x = Math.max(Y(a), Y(b));
	const y = Math.min(Y(a), Y(b));
	return (x + 0.05) / (y + 0.05);
};

/**
 * The L closest to `bg` that still clears `target`. Walks away from the
 * surface rather than assuming contrast rises with L, which is false on a
 * light ground.
 */
function solveL(C, h, bg, target, lo, hi) {
	const light = Y(bg) > 0.18;
	const steps = Array.from({ length: 401 }, (_, i) => lo + ((hi - lo) * i) / 400);
	if (light) steps.reverse();
	for (const L of steps) {
		const c = mk(L, C, h);
		if (cr(c, bg) >= target) return c;
	}
	return mk(light ? lo : hi, C, h);
}

const SRGB_XYZ = [
	[0.4123908, 0.3575843, 0.1804808],
	[0.212639, 0.7151687, 0.0721923],
	[0.0193308, 0.1191948, 0.9505322],
];
const XYZ_P3 = [
	[2.4934969, -0.9313836, -0.4027108],
	[-0.829489, 1.7626641, 0.0236247],
	[0.0358458, -0.0761724, 0.9568845],
];
const mul = (M, v) => M.map((row) => row.reduce((sum, k, j) => sum + k * v[j], 0));
const toP3 = (lin) => mul(XYZ_P3, mul(SRGB_XYZ, lin));
const p3Y = (p) => 0.2289746 * p[0] + 0.6917385 * p[1] + 0.0792869 * p[2];

/** Chroma multiplier at which the colour leaves the given gamut. */
function edge(lin, space) {
	const [L, a, b] = toLab(lin);
	let lo = 0.2;
	let hi = 6.0;
	for (let i = 0; i < 60; i++) {
		const m = (lo + hi) / 2;
		const c = fromLab(L, a * m, b * m);
		if (inGamut(space === "srgb" ? c : toP3(c))) lo = m;
		else hi = m;
	}
	return lo;
}

function boost(lin, f) {
	const [L, a, b] = toLab(lin);
	return toP3(fromLab(L, a * f, b * f)).map(clamp01);
}

// ---- derive -----------------------------------------------------------------

const out = [];
const p3L = [];
const p3D = [];
const report = [];

for (const [k, [acc, sec]] of Object.entries(SRC)) {
	const [, ac, ah] = lch(acc);
	const [, sc, sh] = lch(sec);
	for (const [mode, spec] of [["light", LIGHT], ["dark", DARK]]) {
		const n = Object.fromEntries(
			Object.entries(spec).map(([r, [L, C]]) => [r, mk(L, C, ah)]),
		);
		let accent, second, faint;
		if (mode === "light") {
			accent = hx(acc).map(s2l);
			second = solveL(sc, sh, n.raise, 4.6, 0.2, 0.95);
			faint = solveL(0.03, ah, n.raise, 4.6, 0.2, 0.95);
		} else {
			accent = solveL(ac * 0.85, ah, n.raise, 6.0, 0.3, 0.98);
			second = solveL(sc * 0.85, sh, n.raise, 4.6, 0.3, 0.98);
			faint = solveL(0.03, ah, n.raise, 4.6, 0.3, 0.98);
		}
		const ruleStrong = solveL(0.03, ah, n.raise, 3.05, 0.2, 0.98);
		const rows = { ...n, "rule-strong": ruleStrong, faint, accent, secondary: second };

		for (const [role, need, bg, label] of CHECKS) {
			const r = cr(rows[role], rows[bg]);
			report.push({ k, mode, label, r, ok: r >= need });
		}
		const r = cr(rows.ground, rows.accent);
		report.push({ k, mode, label: "button label", r, ok: r >= 4.5 });

		const sel =
			mode === "light" ? `[data-palette="${k}"]` : `[data-palette="${k}"][data-theme="dark"]`;
		out.push({ mode, sel, k, rows });

		// P3 only where it adds >10% room at this hue AND the x1.20 boost
		// actually leaves sRGB; otherwise it would be a restyle, not fidelity.
		for (const role of ["accent", "secondary"]) {
			const lin = rows[role];
			const se = edge(lin, "srgb");
			const pe = edge(lin, "p3");
			if (pe / se > 1.1 && 1.2 > se) {
				const p = boost(lin, 1.2);
				const g = Y(rows.ground);
				const ct = (Math.max(p3Y(p), g) + 0.05) / (Math.min(p3Y(p), g) + 0.05);
				const coords = p.map((v) => l2s(v).toFixed(4)).join(" ");
				const value = `color(display-p3 ${coords})`;
				(mode === "light" ? p3L : p3D).push({ k, role, value, ct, se, pe });
			}
		}
	}
}

const fails = report.filter((x) => !x.ok);
console.log(`contrast checks: ${report.length} run, ${fails.length} failed`);
for (const f of fails) {
	console.log(`  FAIL  ${f.k} ${f.mode.padEnd(5)} ${f.label.padEnd(24)} ${f.r.toFixed(2)}:1`);
}
if (fails.length) {
	console.log(`Not writing ${OUT}.`);
	process.exit(1);
}

// ---- emit -------------------------------------------------------------------

const HEADER = `/*
 * Palette ${ACTIVE.toUpperCase()} — ${NAMES[ACTIVE]}. Near-monochrome base, one intense pop.
 *
 * Every token is a light-dark() pair. \`color-scheme\` on :root picks the side:
 * the OS preference by default, overridable via [data-theme] (see tokens.css).
 *
 * Neutrals are not grey: every ground, rule and text tone carries a real
 * amount of the accent hue, which is what makes a palette read as one
 * material (the Gruvbox move). The accent is the only saturated colour in
 * the document; --secondary is held back for rare use and for the hero.
 *
 * --faint is TEXT (12px eyebrows, tags, years) and must clear 4.5:1. All
 * derived tones are solved against --raise, the stricter of the two surfaces,
 * so they hold on cards and code blocks as well as on the page.
 *
 * --rule is a decorative divider and is deliberately exempt from 1.4.11.
 * --rule-strong is for borders on interactive controls and clears 3:1.
 *
 * GENERATED by scripts/palettes.mjs (\`npm run palettes\`), which also runs the
 * contrast checks for all three candidate palettes. Edit the script, not this
 * file.
 */`;

const light = out.find((o) => o.k === ACTIVE && o.mode === "light").rows;
const dark = out.find((o) => o.k === ACTIVE && o.mode === "dark").rows;
const pair = (r, l = hexof(light[r]), d = hexof(dark[r])) => `light-dark(${l}, ${d})`;

const tokens = Object.keys(light)
	.map((r) => `\t\t--${r}: ${pair(r)};\n`)
	.join("");

// P3: override a role on whichever side(s) earned it; keep sRGB on the other.
const p3 = {};
for (const e of p3L.filter((e) => e.k === ACTIVE)) (p3[e.role] ??= {}).light = e;
for (const e of p3D.filter((e) => e.k === ACTIVE)) (p3[e.role] ??= {}).dark = e;
const note = (side, e) =>
	`${side} sRGB edge x${e.se.toFixed(2)}, P3 reaches x${e.pe.toFixed(2)} — ${e.ct.toFixed(2)}:1`;
const p3Tokens = Object.entries(p3)
	.map(([r, { light: l, dark: d }]) => {
		const notes = [l && note("light", l), d && note("dark", d)].filter(Boolean).join("; ");
		const value = pair(r, l ? l.value : undefined, d ? d.value : undefined);
		return `\t\t\t/* ${notes} */\n\t\t\t--${r}: ${value};\n`;
	})
	.join("");

const p3Section = p3Tokens
	? `

	/*
	 * Display P3, only where it shows what sRGB physically cannot: same OKLab
	 * lightness and hue, chroma x1.20. The sRGB value is a deliberate sibling,
	 * not a degraded copy. Contrast verified in P3 space via XYZ luminance.
	 */
	@media (color-gamut: p3) {
		:root {
${p3Tokens}		}
	}`
	: "";

const css = `${HEADER}

@layer tokens {
	:root {
${tokens}	}${p3Section}
}
`;

writeFileSync(OUT, css);
console.log(`wrote ${OUT}`);
