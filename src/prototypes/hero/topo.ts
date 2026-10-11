// The hero's terrain: a watershed heightfield built from the drainage tree.
// The channels become valley floors and the ground rises away from them into
// ridges.
//
// Height at any point is the lowest "valley floor + climb" over all nearby
// valleys (a lower envelope). That surface always drains downhill to the
// sea along the tree, so thresholding it at the tide level behaves like a
// flood fill: water spreads up the trunks first, then into each tributary,
// without running a fill every frame.
//
// Valleys have flat floors and steep banks. In a V-shaped valley the water
// pinches to a needle wherever it runs out. On a flat floor it keeps its
// width and ends bluntly. Floor width grows with the valley's size, so
// trunks are broad and side valleys narrow, and the branching is easy to
// see.
//
// buildValleys() does the part that needs the tree, which is quick. Stamping
// the valleys into a heightfield is the slow part. The page does that on the
// GPU (see the terrain shaders). generateHeight() does the same thing in
// plain JavaScript and is kept as the reference and the fallback.
import { buildTree } from "./network";

export const TEXELS_PER_CELL = 2;
const VALLEY_ACC = 70; // upstream cells before a channel counts as a valley
const TRUNK_ACC = 420; // above this a valley shapes the land far around it
const REACH_SIDE = 15; // cells a side valley's slopes extend
const REACH_TRUNK = 40; // cells a trunk valley's slopes extend
const FLOOR_RISE = 48; // height gained along the tree, sea to furthest tip

/** Numbers the JavaScript and GLSL versions of the bake have to agree on. */
export const SHAPE = {
	BANK_WIDTH: 3.5, // cells of steep bank before the gentler hillside
	BANK_SLOPE: 2.4,
	CEILING: FLOOR_RISE + REACH_TRUNK, // ground beyond every valley's reach
	MAX_HEIGHT: 112, // for normalizing
	BLUR_SIGMA: 2, // texels. Rounds off bank edges and ridge lines.
};

export const SEGMENT_FLOATS = 9;

export interface Valleys {
	/** Heightfield size in texels. */
	width: number;
	height: number;
	count: number;
	/**
	 * SEGMENT_FLOATS per valley segment: ax, ay, bx, by in texels, the floor's
	 * height at a and b, its half-width at a and b in cells, and how far the
	 * valley's slopes reach in texels.
	 */
	segments: Float32Array;
	seed: number;
	fbm: (x: number, y: number) => number;
	ms: number;
}

export interface HeightField {
	/** One float per texel, normalized 0..1. */
	data: Float32Array;
	width: number;
	height: number;
	ms: number;
}

// Half-width of a valley's flat floor, in cells. The minimum has to be wide
// enough to survive the blur: a floor narrower than the blur rounds back
// into a V and the points return.
const floorHalf = (a: number) => Math.min(6, Math.max(1.7, 0.42 * Math.pow(a, 0.33)));

export function buildValleys(seed = 11): Valleys {
	const t0 = performance.now();
	const { GW, GH, parent, cost, maxCost, acc, px, py, fbm } = buildTree(seed);
	const S = TEXELS_PER_CELL;
	const out: number[] = [];
	for (let c = 0; c < GW * GH; c++) {
		const p = parent[c];
		if (p < 0 || acc[c] < VALLEY_ACC) continue;
		out.push(
			px[c] * S,
			py[c] * S,
			px[p] * S,
			py[p] * S,
			(FLOOR_RISE * cost[c]) / maxCost,
			(FLOOR_RISE * cost[p]) / maxCost,
			floorHalf(acc[c]),
			floorHalf(acc[p]),
			(acc[c] >= TRUNK_ACC ? REACH_TRUNK : REACH_SIDE) * S,
		);
	}
	return {
		width: GW * S,
		height: GH * S,
		count: out.length / SEGMENT_FLOATS,
		segments: new Float32Array(out),
		seed,
		fbm,
		ms: performance.now() - t0,
	};
}

// Hillside steepness varies across the map, so ridges are not all the same
// height and contours are not evenly spaced everywhere.
const hillsideAt = (fbm: Valleys["fbm"], x: number, y: number) =>
	0.55 + 0.9 * fbm((x / TEXELS_PER_CELL) * 0.03 + 40, (y / TEXELS_PER_CELL) * 0.03 + 12);
// Broad relief on top, so the land is not a perfectly regular set of slopes.
const reliefAt = (fbm: Valleys["fbm"], x: number, y: number) =>
	8 * (fbm((x / TEXELS_PER_CELL) * 0.018 + 7, (y / TEXELS_PER_CELL) * 0.018 + 31) - 0.44);

export function generateHeight(valleys: Valleys): HeightField {
	const t0 = performance.now();
	const { width: W, height: H, segments, count, fbm } = valleys;
	const S = TEXELS_PER_CELL;
	const { BANK_WIDTH, BANK_SLOPE, CEILING, MAX_HEIGHT } = SHAPE;
	const z = new Float32Array(W * H).fill(1e9);

	const hillside = new Float32Array(W * H);
	for (let y = 0; y < H; y++) {
		for (let x = 0; x < W; x++) hillside[y * W + x] = hillsideAt(fbm, x, y);
	}

	for (let s = 0; s < count; s++) {
		const [ax, ay, bx, by, za, zb, wa, wb, r] = segments.subarray(s * SEGMENT_FLOATS, (s + 1) * SEGMENT_FLOATS);
		const dx = bx - ax;
		const dy = by - ay;
		const len2 = dx * dx + dy * dy || 1e-6;
		const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r));
		const x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + r));
		const y0 = Math.max(0, Math.floor(Math.min(ay, by) - r));
		const y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by) + r));
		for (let y = y0; y <= y1; y++) {
			const qy = y + 0.5 - ay;
			for (let x = x0; x <= x1; x++) {
				const qx = x + 0.5 - ax;
				let t = (qx * dx + qy * dy) / len2;
				t = t < 0 ? 0 : t > 1 ? 1 : t;
				const ex = qx - t * dx;
				const ey = qy - t * dy;
				// Distance beyond the edge of the flat floor, in cells.
				const d = Math.sqrt(ex * ex + ey * ey) / S - (wa + (wb - wa) * t);
				const i = y * W + x;
				let v = za + (zb - za) * t;
				if (d > 0) v += d < BANK_WIDTH ? BANK_SLOPE * d : BANK_SLOPE * BANK_WIDTH + hillside[i] * (d - BANK_WIDTH);
				if (v < z[i]) z[i] = v;
			}
		}
	}

	// Anything beyond every valley's reach is high ground.
	for (let y = 0; y < H; y++) {
		for (let x = 0; x < W; x++) {
			const i = y * W + x;
			z[i] = Math.min(z[i], CEILING) + reliefAt(fbm, x, y);
		}
	}

	// Round off the bank edges and ridge lines so contours don't kink. Keep it
	// light, because a heavy blur erases the side valleys. Two passes of a
	// 5-wide box come to about SHAPE.BLUR_SIGMA.
	const tmp = new Float32Array(W * H);
	const blur = (src: Float32Array, dst: Float32Array, n: number, stride: number, lines: number, step: number) => {
		const R = 2;
		for (let l = 0; l < lines; l++) {
			const base = l * step;
			let sum = 0;
			for (let k = -R; k <= R; k++) sum += src[base + Math.min(n - 1, Math.max(0, k)) * stride];
			for (let k = 0; k < n; k++) {
				dst[base + k * stride] = sum / (2 * R + 1);
				sum += src[base + Math.min(n - 1, k + R + 1) * stride] - src[base + Math.max(0, k - R) * stride];
			}
		}
	};
	for (let pass = 0; pass < 2; pass++) {
		blur(z, tmp, W, 1, H, W); // horizontal
		blur(tmp, z, H, W, W, 1); // vertical
	}

	for (let i = 0; i < z.length; i++) z[i] = Math.min(1, Math.max(0, z[i] / MAX_HEIGHT));

	return { data: z, width: W, height: H, ms: performance.now() - t0 };
}
