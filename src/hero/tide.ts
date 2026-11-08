// Tide state for Seattle from a baked snapshot of NOAA hi/lo predictions.
// The snapshot is a static file fetched by hand and runs through March 2027.
// After that the hero falls back to a rough model. It should be fetched at
// build time instead.
import data from "./tides-seattle.json";

export interface TideState {
	/** Height in feet above MLLW. */
	height: number;
	/** Height normalized to 0..1 across the snapshot's full range. */
	level: number;
	/** -1..1: positive while rising, strongest mid-tide, zero at the turn. */
	rate: number;
	next: { time: Date; height: number; type: "high" | "low" };
	/** The next extreme's height, normalized like `level`. */
	nextLevel: number;
	/** False when the date is outside the snapshot and a rough model is used. */
	fromData: boolean;
}

const extremes = data.extremes as [minutes: number, height: number][];
const span = data.max - data.min;
const norm = (h: number) => Math.min(1, Math.max(0, (h - data.min) / span));

export function tideAt(date: Date): TideState {
	const m = date.getTime() / 60000;
	const first = extremes[0];
	const last = extremes[extremes.length - 1];
	if (m < first[0] || m >= last[0]) return approximate(date);

	// Binary search for the extreme at or before `m`.
	let lo = 0;
	let hi = extremes.length - 1;
	while (hi - lo > 1) {
		const mid = (lo + hi) >> 1;
		if (extremes[mid][0] <= m) lo = mid;
		else hi = mid;
	}
	const [t0, h0] = extremes[lo];
	const [t1, h1] = extremes[hi];

	// Cosine interpolation between successive extremes: the standard
	// approximation, good to a couple of inches.
	const phase = (m - t0) / (t1 - t0);
	const height = h0 + (h1 - h0) * (1 - Math.cos(Math.PI * phase)) * 0.5;
	const rising = h1 > h0;
	return {
		height,
		level: norm(height),
		rate: (rising ? 1 : -1) * Math.sin(Math.PI * phase),
		next: { time: new Date(t1 * 60000), height: h1, type: rising ? "high" : "low" },
		nextLevel: norm(h1),
		fromData: true,
	};
}

// Outside the snapshot: two constituents (M2 + K1) around the mean. It isn't
// accurate, but it keeps the visual moving.
function approximate(date: Date): TideState {
	const hours = date.getTime() / 3600000;
	const mean = (data.max + data.min) / 2;
	const a = (2 * Math.PI * hours) / 12.42;
	const b = (2 * Math.PI * hours) / 23.93;
	const height = mean + 0.3 * span * Math.cos(a) + 0.16 * span * Math.cos(b);
	const slope = -0.3 * Math.sin(a) * (1 / 12.42) - 0.16 * Math.sin(b) * (1 / 23.93);
	const rising = slope > 0;
	return {
		height,
		level: norm(height),
		rate: Math.max(-1, Math.min(1, slope * 30)),
		next: { time: new Date(date.getTime() + 3 * 3600000), height, type: rising ? "high" : "low" },
		nextLevel: norm(height),
		fromData: false,
	};
}

export const station = { name: data.name as string, min: data.min as number, max: data.max as number };
