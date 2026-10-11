// Bakes a watershed heightfield from the drainage tree: the channels become
// valley floors and the ground rises away from them into ridges.
//
// Height at any point is the lowest "valley floor + climb" over all nearby
// valleys — a lower envelope. That surface always drains downhill to the
// sea along the tree, so thresholding it at the tide level behaves like a
// flood fill: water spreads up the trunks first, then into each tributary,
// without running a fill every frame.
//
// Valleys are flat-floored with steep banks, not V-shaped. Water in a V
// pinches to a needle wherever it runs out; on a flat floor it keeps its
// width and ends bluntly. Floor width grows with the valley's size, so
// trunks are broad and side valleys narrow — which is what makes the
// branching readable.
import { buildTree } from "./network";

export interface HeightField {
	/** One float per texel, normalised 0..1. */
	data: Float32Array;
	width: number;
	height: number;
	aspect: number;
	valleys: number;
	ms: number;
}

const TEXELS_PER_CELL = 2;
const VALLEY_ACC = 70; // upstream cells before a channel counts as a valley
const TRUNK_ACC = 420; // above this a valley shapes the land far around it
const REACH_SIDE = 15; // cells a side valley's slopes extend
const REACH_TRUNK = 40; // cells a trunk valley's slopes extend
const FLOOR_RISE = 48; // height gained along the tree, sea to furthest tip
const BANK_WIDTH = 3.5; // cells of steep bank before the gentler hillside
const BANK_SLOPE = 2.4;
const MAX_HEIGHT = 112; // for normalising

export function generateHeight(seed = 11): HeightField {
	const t0 = performance.now();
	const { GW, GH, parent, cost, maxCost, acc, px, py, fbm } = buildTree(seed);
	const S = TEXELS_PER_CELL;
	const W = GW * S;
	const H = GH * S;
	const z = new Float32Array(W * H).fill(1e9);

	// Hillside steepness varies across the map, so ridges are not all the
	// same height and contours are not evenly spaced everywhere.
	const hillside = new Float32Array(W * H);
	for (let y = 0; y < H; y++) {
		for (let x = 0; x < W; x++) {
			hillside[y * W + x] = 0.55 + 0.9 * fbm((x / S) * 0.03 + 40, (y / S) * 0.03 + 12);
		}
	}

	// Half-width of a valley's flat floor, in cells.
	// The minimum has to be wide enough to survive the blur below: a floor
	// narrower than the blur rounds back into a V and the points return.
	const floorHalf = (a: number) => Math.min(6, Math.max(1.7, 0.42 * Math.pow(a, 0.33)));

	let valleys = 0;
	for (let c = 0; c < GW * GH; c++) {
		const p = parent[c];
		if (p < 0 || acc[c] < VALLEY_ACC) continue;
		valleys++;
		const ax = px[c] * S;
		const ay = py[c] * S;
		const dx = px[p] * S - ax;
		const dy = py[p] * S - ay;
		const za = (FLOOR_RISE * cost[c]) / maxCost;
		const zb = (FLOOR_RISE * cost[p]) / maxCost;
		const wa = floorHalf(acc[c]);
		const wb = floorHalf(acc[p]);
		const len2 = dx * dx + dy * dy || 1e-6;
		const r = (acc[c] >= TRUNK_ACC ? REACH_TRUNK : REACH_SIDE) * S;
		const x0 = Math.max(0, Math.floor(Math.min(ax, ax + dx) - r));
		const x1 = Math.min(W - 1, Math.ceil(Math.max(ax, ax + dx) + r));
		const y0 = Math.max(0, Math.floor(Math.min(ay, ay + dy) - r));
		const y1 = Math.min(H - 1, Math.ceil(Math.max(ay, ay + dy) + r));
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

	// Anything beyond every valley's reach is high ground; then add broad
	// relief so the land is not a perfectly regular set of slopes.
	const ceiling = FLOOR_RISE + REACH_TRUNK;
	for (let y = 0; y < H; y++) {
		for (let x = 0; x < W; x++) {
			const i = y * W + x;
			if (z[i] > ceiling) z[i] = ceiling;
			z[i] += 8 * (fbm((x / S) * 0.018 + 7, (y / S) * 0.018 + 31) - 0.44);
		}
	}

	// Round off the bank edges and ridge lines so contours flow rather than
	// kink. Kept light: a heavy blur erases the side valleys.
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

	return { data: z, width: W, height: H, aspect: GW / GH, valleys, ms: performance.now() - t0 };
}
