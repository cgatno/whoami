// @ts-check
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://christiangaetano.com",
  adapter: cloudflare(),
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [sitemap()],
});
