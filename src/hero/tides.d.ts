// `virtual:tides` comes from the Vite plugin in scripts/tides.mjs. It has the
// same shape as the committed snapshot it falls back to.
declare module "virtual:tides" {
	const data: typeof import("./tides-seattle.json");
	export default data;
}
