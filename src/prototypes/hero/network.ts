// Builds a dendritic tidal-channel network.
//
// Method: a shortest-path tree grown inland from the sea edge over a noisy
// cost field. Every cell drains to the neighbor it was reached from, which
// gives a pit-free drainage tree; counting upstream cells gives each channel
// its size. This is the same shape real tidal rills make as they converge.

/** The drainage tree the terrain is built from. */
export interface Tree {
	GW: number;
	GH: number;
	/** Downstream neighbor of each cell (-1 at the sea). */
	parent: Int32Array;
	/** Path cost from the sea; divide by maxCost for a 0..1 upstream coordinate. */
	cost: Float32Array;
	maxCost: number;
	/** Number of cells draining through each cell. */
	acc: Float32Array;
	/** Jittered cell positions, in cells. */
	px: Float32Array;
	py: Float32Array;
	fbm: (x: number, y: number) => number;
}

const GW = 416;
const GH = 260;

function mulberry32(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function buildTree(seed = 11): Tree {
	const N = GW * GH;
	const rand = mulberry32(seed);

	// ---- smooth lattice noise for the cost field
	const lattice = (x: number, y: number) => {
		let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0;
		n = Math.imul(n ^ (n >>> 13), 1274126177);
		return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
	};
	const noise = (x: number, y: number) => {
		const xi = Math.floor(x);
		const yi = Math.floor(y);
		const fx = x - xi;
		const fy = y - yi;
		const ux = fx * fx * (3 - 2 * fx);
		const uy = fy * fy * (3 - 2 * fy);
		const a = lattice(xi, yi);
		const b = lattice(xi + 1, yi);
		const c = lattice(xi, yi + 1);
		const d = lattice(xi + 1, yi + 1);
		return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
	};
	const fbm = (x: number, y: number) =>
		0.5 * noise(x, y) + 0.25 * noise(x * 2.1 + 9, y * 2.1 + 4) + 0.125 * noise(x * 4.3 + 2, y * 4.3 + 7);

	// Low-cost corridors (from the smooth noise) become trunk channels; the
	// per-cell randomness makes the fine rills wander.
	const weight = new Float32Array(N);
	for (let y = 0; y < GH; y++) {
		for (let x = 0; x < GW; x++) {
			weight[y * GW + x] = Math.exp(3.4 * (fbm(x * 0.014, y * 0.014) - 0.44)) * (0.6 + 0.8 * rand());
		}
	}

	// ---- shortest-path tree from the sea edge (the bottom row)
	const cost = new Float32Array(N).fill(Infinity);
	const parent = new Int32Array(N).fill(-1);
	const done = new Uint8Array(N);
	const order = new Int32Array(N);

	// A few outlets along the shore start "cheaper", so neighboring basins
	// funnel toward them and form larger trees.
	const outlets = Array.from({ length: 4 }, () => rand() * GW);
	const heapCost = new Float32Array(N * 8);
	const heapCell = new Int32Array(N * 8);
	let heapSize = 0;
	const push = (c: number, cell: number) => {
		let i = heapSize++;
		while (i > 0) {
			const p = (i - 1) >> 1;
			if (heapCost[p] <= c) break;
			heapCost[i] = heapCost[p];
			heapCell[i] = heapCell[p];
			i = p;
		}
		heapCost[i] = c;
		heapCell[i] = cell;
	};
	const pop = () => {
		const top = heapCell[0];
		const c = heapCost[--heapSize];
		const cell = heapCell[heapSize];
		let i = 0;
		for (;;) {
			let k = 2 * i + 1;
			if (k >= heapSize) break;
			if (k + 1 < heapSize && heapCost[k + 1] < heapCost[k]) k++;
			if (heapCost[k] >= c) break;
			heapCost[i] = heapCost[k];
			heapCell[i] = heapCell[k];
			i = k;
		}
		heapCost[i] = c;
		heapCell[i] = cell;
		return top;
	};

	for (let x = 0; x < GW; x++) {
		let near = Infinity;
		for (const o of outlets) near = Math.min(near, Math.abs(x - o));
		const cell = (GH - 1) * GW + x;
		cost[cell] = 40 * (1 - Math.exp(-(near * near) / (2 * 22 * 22)));
		push(cost[cell], cell);
	}

	let visited = 0;
	while (heapSize > 0) {
		const cell = pop();
		if (done[cell]) continue;
		done[cell] = 1;
		order[visited++] = cell;
		const cx = cell % GW;
		const cy = (cell / GW) | 0;
		for (let dy = -1; dy <= 1; dy++) {
			const ny = cy + dy;
			if (ny < 0 || ny >= GH) continue;
			for (let dx = -1; dx <= 1; dx++) {
				if (!dx && !dy) continue;
				const nx = cx + dx;
				if (nx < 0 || nx >= GW) continue;
				const n = ny * GW + nx;
				if (done[n]) continue;
				const step = (dx && dy ? Math.SQRT2 : 1) * 0.5 * (weight[cell] + weight[n]);
				const c = cost[cell] + step;
				if (c < cost[n]) {
					cost[n] = c;
					parent[n] = cell;
					push(c, n);
				}
			}
		}
	}
	const maxCost = cost[order[N - 1]];

	// ---- upstream area
	const acc = new Float32Array(N).fill(1);
	for (let i = N - 1; i >= 0; i--) {
		const c = order[i];
		if (parent[c] >= 0) acc[parent[c]] += acc[c];
	}

	// Jittered positions hide the grid.
	const px = new Float32Array(N);
	const py = new Float32Array(N);
	for (let y = 0; y < GH; y++) {
		for (let x = 0; x < GW; x++) {
			const c = y * GW + x;
			px[c] = x + 0.5 + (lattice(x + 911, y) - 0.5) * 0.7;
			py[c] = y + 0.5 + (lattice(x, y + 577) - 0.5) * 0.7;
		}
	}

	return { GW, GH, parent, cost, maxCost, acc, px, py, fbm };
}
