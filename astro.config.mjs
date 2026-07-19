// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

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
  site: 'https://whoami.cgatno.workers.dev',
  adapter: cloudflare(),
  integrations: [sitemap()]
});