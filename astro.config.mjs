// @ts-check
import { defineConfig, fontProviders } from "astro/config";

import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // TEMPORARY, until DNS moves off Netlify.
  //
  // This is deliberately the workers.dev origin and not christiangaetano.com.
  // `site` drives canonical URLs, so pointing it at production while the
  // deployment also serves `X-Robots-Tag: noindex` would send Google two
  // contradictory signals about the same page — and risks the noindex being
  // consolidated onto the canonical target, i.e. deindexing the live site.
  // Self-referential canonical + noindex agree with each other and implicate
  // no other domain.
  //
  // At cutover: change this to https://christiangaetano.com and set
  // `workers_dev: false` in wrangler.jsonc.
  site: "https://whoami.cgatno.workers.dev",
  adapter: cloudflare(),
  integrations: [sitemap()],
  // Familjen Grotesk (headings), Newsreader (body), Recursive (code + UI).
  // Sizes are measured latin woff2. Google serves one file per axis
  // combination: narrowing a range never shrinks it — only dropping an axis,
  // or pinning it to a single value, does.
  fonts: [
    // 18.4 KB. wght is the only axis on this family.
    {
      provider: fontProviders.google(),
      name: "Familjen Grotesk",
      cssVariable: "--font-familjen-grotesk",
      weights: ["400 700"],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["sans-serif"],
    },

    // 56.8 KB. opsz pinned to body size rather than ranged: the 6..72 range
    // costs 128.8 KB for optical sizes we never render. Retune if body size
    // changes materially.
    {
      provider: fontProviders.google(),
      name: "Newsreader",
      cssVariable: "--font-newsreader",
      weights: ["200 800"],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["serif"],
      options: { experimental: { variableAxis: { opsz: ["16"] } } },
    },

    // 23.8 KB. Separate entry so weight can pin to 400 while roman keeps its
    // range; the italic range is 61.7 KB. Trade-off: no bold italic.
    {
      provider: fontProviders.google(),
      name: "Newsreader",
      cssVariable: "--font-newsreader",
      weights: [400],
      styles: ["italic"],
      subsets: ["latin"],
      fallbacks: ["serif"],
      options: { experimental: { variableAxis: { opsz: ["16"] } } },
    },

    // 70.6 KB. MONO is ranged, not pinned: 0 is a proportional sans for UI
    // chrome, 1 a true monospace for code, both from this one file for 17.1 KB
    // over pinning. MONO defaults to 0 — removing it turns code blocks to sans.
    {
      provider: fontProviders.google(),
      name: "Recursive",
      cssVariable: "--font-recursive",
      weights: ["300 1000"],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["monospace"],
      options: {
        experimental: {
          variableAxis: {
            MONO: [["0", "1"]],
            CASL: ["0"],
            CRSV: ["0"],
            slnt: ["0"],
          },
        },
      },
    },
  ],
});
