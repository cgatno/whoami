// Colors for the canvas, as gamma-encoded RGB triples in the canvas's own
// color space (Display P3 when available, sRGB otherwise). Same OKLab math
// as scripts/palettes.mjs.

export type RGB = [number, number, number];

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
const mul = (M: number[][], v: number[]) => M.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const encode = (v: number) => {
	v = Math.max(0, Math.min(1, v));
	return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
};

function oklabToLinearSrgb(L: number, a: number, b: number) {
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	];
}

const inGamut = (v: number[]) => v.every((x) => x >= -1e-4 && x <= 1 + 1e-4);

export function makeColors(p3: boolean) {
	const toTarget = (linSrgb: number[]) => (p3 ? mul(XYZ_P3, mul(SRGB_XYZ, linSrgb)) : linSrgb);

	/** OKLCH color, with chroma eased down until it fits the target gamut. */
	const oklch = (L: number, C: number, hueDeg: number): RGB => {
		const h = (hueDeg * Math.PI) / 180;
		let out = [0, 0, 0];
		for (let i = 0; i < 60; i++) {
			out = toTarget(oklabToLinearSrgb(L, C * Math.cos(h), C * Math.sin(h)));
			if (inGamut(out)) break;
			C *= 0.96;
		}
		return out.map(encode) as RGB;
	};

	/** An sRGB hex color, reproduced exactly in the target space. */
	const hex = (h: string): RGB => {
		const lin = [1, 3, 5].map((i) => toLinear(parseInt(h.slice(i, i + 2), 16) / 255));
		return toTarget(lin).map(encode) as RGB;
	};

	return { oklch, hex };
}
