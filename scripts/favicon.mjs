// Draws the shoreline icon and writes the favicon files: favicon.svg for
// browser tabs and apple-touch-icon.png for home screens into src/assets/,
// where Base.astro imports them so their URLs change with their contents,
// and favicon.ico into public/, since some clients only ever ask for
// /favicon.ico. Run with `npm run favicon`.
//
// Everything comes from one shoreline curve. The water bands, the magenta
// high-tide line and the land contours are offsets of it, so the spacing
// stays even and no two lines cross. Every line runs past the edges of the
// tile and is cut off there.
//
// Tabs get a pared-down version (water, shoreline and magenta line, drawn
// thicker), because the full one blurs at 16 px. Home screens get the full
// version. The colors are the hero's dark palette (see src/hero/main.ts).
//
// PNG and ICO output uses sharp, which Astro installs.
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const GROUND = "#0b1616";
const INK = "#e0edec";
const MINT = "#00e7b7";
const MID = "#006c62";
const DEEP = "#002e2f";
const RILL = "#1c3c36";
const POP = "#ff2fd0";

const SAMPLES = 240;

/** The shoreline, west at the left: a cubic with a gentle wobble, longer than the 32-unit tile. */
function shoreline() {
	const ctrl = [[-5, 13], [8, 13], [20, 18], [28.5, 39]];
	const at = (t) => {
		const u = 1 - t;
		return [0, 1].map((i) => u ** 3 * ctrl[0][i] + 3 * u * u * t * ctrl[1][i] + 3 * u * t * t * ctrl[2][i] + t ** 3 * ctrl[3][i]);
	};
	const base = Array.from({ length: SAMPLES }, (_, i) => at(i / (SAMPLES - 1)));
	return offsetBy(base, (i) => Math.sin((2 * Math.PI * 2 * i) / (SAMPLES - 1) + 0.3));
}

/** Moves each point along its normal: positive toward land (up and right), negative out to sea. */
function offsetBy(points, distance) {
	return points.map(([x, y], i) => {
		const [ax, ay] = points[Math.max(i - 1, 0)];
		const [bx, by] = points[Math.min(i + 1, points.length - 1)];
		const length = Math.hypot(bx - ax, by - ay);
		const d = typeof distance === "function" ? distance(i) : distance;
		return [x + ((by - ay) / length) * d, y - ((bx - ax) / length) * d];
	});
}
const offset = (points, d) => offsetBy(points, d);

const num = (v) => Number(v.toFixed(2)).toString();

/** A smooth path through every tenth point (Catmull-Rom, written as cubic Beziers). */
function path(points) {
	const k = points.filter((_, i) => i % 10 === 0 || i === points.length - 1);
	let d = `M${num(k[0][0])} ${num(k[0][1])}`;
	for (let i = 0; i < k.length - 1; i++) {
		const [p0, p1, p2, p3] = [k[Math.max(i - 1, 0)], k[i], k[i + 1], k[Math.min(i + 2, k.length - 1)]];
		const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
		const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
		d += `C${[...c1, ...c2, ...p2].map(num).join(" ")}`;
	}
	return d;
}

/** The sea side of a curve, closed well outside the tile. */
function sea(points) {
	const [first, last] = [points[0], points[points.length - 1]];
	return `${path(points)}L${num(last[0])} 60L-20 60L-20 ${num(first[1])}Z`;
}

/**
 * The icon as SVG. `radius` rounds the tile (home screen icons are square,
 * since the phone rounds them itself).
 */
function icon({ contours, highTide, bands, keyline, magenta, radius }) {
	const shore = shoreline();
	const stroke = (color, width, points) => `<path fill="none" stroke="${color}" stroke-width="${width}" d="${path(points)}"/>`;
	const fill = (color, points) => `<path fill="${color}" d="${sea(points)}"/>`;
	const deep = [MID, DEEP];
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">`,
		`<clipPath id="tile"><rect width="32" height="32" rx="${radius}"/></clipPath>`,
		`<g clip-path="url(#tile)">`,
		`<rect width="32" height="32" fill="${GROUND}"/>`,
		...contours.map((d) => stroke(RILL, 1.1, offset(shore, d))),
		stroke(POP, magenta, offset(shore, highTide)),
		fill(MINT, shore),
		...bands.map((d, i) => fill(deep[i], offset(shore, -d))),
		stroke(INK, keyline, shore),
		`</g></svg>\n`,
	].join("");
}

const tab = icon({ contours: [], highTide: 3.6, bands: [7], keyline: 1.8, magenta: 2.8, radius: 7 });
const full = icon({ contours: [7, 12.5], highTide: 2.8, bands: [5, 10], keyline: 1.1, magenta: 1.8, radius: 0 });

const png = (svg, size) => sharp(Buffer.from(svg), { density: (72 * size) / 32 }).resize(size, size).png().toBuffer();

/** An .ico holding PNG images, which every browser that still asks for one can read. */
function ico(images) {
	const header = Buffer.alloc(6 + 16 * images.length);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(images.length, 4);
	let at = header.length;
	images.forEach(({ size, data }, i) => {
		const entry = 6 + 16 * i;
		header.writeUInt8(size, entry);
		header.writeUInt8(size, entry + 1);
		header.writeUInt16LE(1, entry + 4);
		header.writeUInt16LE(32, entry + 6);
		header.writeUInt32LE(data.length, entry + 8);
		header.writeUInt32LE(at, entry + 12);
		at += data.length;
	});
	return Buffer.concat([header, ...images.map(({ data }) => data)]);
}

const sizes = [16, 32, 48];
const tabPngs = await Promise.all(sizes.map(async (size) => ({ size, data: await png(tab, size) })));

await mkdir("src/assets", { recursive: true });
await writeFile("src/assets/favicon.svg", tab);
await writeFile("src/assets/apple-touch-icon.png", await png(full, 180));
await writeFile("public/favicon.ico", ico(tabPngs));
console.log("Wrote src/assets/favicon.svg, src/assets/apple-touch-icon.png and public/favicon.ico");
