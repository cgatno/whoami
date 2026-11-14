// Seattle tide predictions for the hero, from NOAA CO-OPS (station 9447130).
//
// The build fetches a year of high and low predictions starting from the
// build date and serves them to src/hero/tide.ts as `virtual:tides` (see
// astro.config.mjs). If NOAA can't be reached, the build warns and uses the
// committed snapshot in src/hero/tides-seattle.json instead. Past the end of
// whichever one it gets, the hero falls back to a rough model.
//
// `npm run tides` refreshes the committed snapshot.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SNAPSHOT = fileURLToPath(new URL("../src/hero/tides-seattle.json", import.meta.url));
const STATION = "9447130";
const DAYS = 366;

// The hero normalizes heights to this range, so it's fixed rather than taken
// from each fetch. Otherwise the same tide would draw differently from one
// build to the next. These are the lowest and highest predictions from
// October 2026 to March 2027. Heights outside the range clamp.
const MIN = -3.93;
const MAX = 13.09;

const ymd = (date) => date.toISOString().slice(0, 10).replaceAll("-", "");

/** Fetches DAYS of predictions starting two days before `from`, in the snapshot's format. */
export async function fetchTides(from = new Date()) {
	const begin = new Date(from.getTime() - 2 * 86_400_000);
	const end = new Date(begin.getTime() + DAYS * 86_400_000);
	const url = new URL("https://api.tidesandcurrents.noaa.gov/api/prod/datagetter");
	url.search = new URLSearchParams({
		product: "predictions",
		station: STATION,
		datum: "MLLW",
		units: "english",
		time_zone: "gmt",
		interval: "hilo",
		format: "json",
		begin_date: ymd(begin),
		end_date: ymd(end),
	}).toString();

	const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
	if (!response.ok) throw new Error(`NOAA answered ${response.status}`);
	const body = await response.json();
	// NOAA reports errors as a 200 with an `error` object.
	if (!Array.isArray(body.predictions) || body.predictions.length < 100) {
		throw new Error(body.error?.message ?? "NOAA sent no predictions");
	}

	return {
		station: STATION,
		name: "Seattle, WA",
		datum: "MLLW",
		units: "ft",
		source: `NOAA CO-OPS predictions (hi/lo), fetched ${from.toISOString().slice(0, 10)}`,
		min: MIN,
		max: MAX,
		// [minutes since the epoch, height in feet]
		extremes: body.predictions.map(({ t, v }) => [
			Date.parse(`${t.replace(" ", "T")}:00Z`) / 60_000,
			Math.round(Number(v) * 100) / 100,
		]),
	};
}

/** Vite plugin that serves the predictions as `virtual:tides`. */
export function tides() {
	const id = "virtual:tides";
	const resolved = "\0" + id;
	let data;
	return {
		name: "tides",
		resolveId: (source) => (source === id ? resolved : undefined),
		async load(source) {
			if (source !== resolved) return;
			data ??= fetchTides().catch(async (error) => {
				this.warn(`Couldn't fetch tide predictions (${error.message}). Using the committed snapshot.`);
				return JSON.parse(await readFile(SNAPSHOT, "utf8"));
			});
			return `export default ${JSON.stringify(await data)};`;
		},
	};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const data = await fetchTides();
	await writeFile(SNAPSHOT, JSON.stringify(data) + "\n");
	const last = new Date(data.extremes.at(-1)[0] * 60_000);
	console.log(`Wrote ${data.extremes.length} predictions through ${last.toISOString().slice(0, 10)}.`);
}
