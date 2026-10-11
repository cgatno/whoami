// @ts-check
import { defineConfig, fontProviders } from "astro/config";

import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // Temporary, until DNS moves off Netlify.
  //
  // `site` sets canonical URLs, and this deployment sends
  // `X-Robots-Tag: noindex`. If `site` pointed at christiangaetano.com,
  // Google could apply the noindex to the live site. Keeping it on the
  // workers.dev origin avoids that.
  //
  // At cutover: change this to https://christiangaetano.com and set
  // `workers_dev: false` in wrangler.jsonc.
  site: "https://whoami.cgatno.workers.dev",
  adapter: cloudflare(),
  // All CSS is ~2 KB gzipped, so it's inlined to save a request (homepage:
  // 2.9 KB gz total). It isn't cached across pages. Revisit if the CSS grows.
  build: { inlineStylesheets: "always" },
  // Astro 7 defaults to "jsx", which drops line breaks next to elements and
  // runs words together in wrapped paragraphs.
  compressHTML: true,
  integrations: [
    // Matches on the path so it still works after `site` changes at cutover.
    sitemap({ filter: (page) => !new URL(page).pathname.startsWith("/design") }),
  ],
  // Colors come from src/styles/syntax.css. <Code /> doesn't inherit this,
  // so pass theme="css-variables" there too.
  markdown: {
    shikiConfig: { theme: "css-variables" },
  },
  // Familjen Grotesk (headings), Newsreader (body), Recursive (code + UI).
  // Sizes are measured latin woff2. Google serves one file per combination
  // of axes, so only dropping an axis or pinning it to one value makes a
  // file smaller. Narrowing a range does nothing.
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

    // 56.8 KB. opsz is pinned to the body size. The full 6..72 range costs
    // 128.8 KB for optical sizes the site never uses. Retune if the body
    // size changes much.
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

    // 23.8 KB. Separate entry so the italic can pin to weight 400 while
    // roman keeps its range. The italic range is 61.7 KB. Trade-off: no
    // bold italic.
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

    // 70.6 KB. MONO is a range: 0 is a proportional sans for UI text and 1
    // is a monospace for code. One file covers both for 17.1 KB more than
    // pinning. MONO defaults to 0, so removing it turns code blocks to sans.
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
