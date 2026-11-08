# christiangaetano.com

My personal site. It's built with Astro and runs on Cloudflare Workers.

## Commands

| Command            | Action                                                       |
| :----------------- | :----------------------------------------------------------- |
| `npm install`      | Install dependencies                                         |
| `npm run dev`      | Start the dev server at `localhost:4321`                     |
| `npm run build`    | Build the site to `./dist/`                                  |
| `npm run preview`  | Serve the build locally                                      |
| `npm run palettes` | Regenerate `src/styles/palette.css` from `scripts/palettes.mjs` |

Change colors in `scripts/palettes.mjs`. The CSS file is generated.

## Layout

- `src/pages/index.astro` is the homepage.
- `src/components/Hero.astro` and `src/hero/` are the homepage's tidal map.
- `src/styles/` has the global CSS, in cascade layers.
- `/design` is the style reference, `/design/preview` shows the styles on
  sample content, and `/design/hero` is the hero with controls and timings.
  None of them are in the sitemap.
- `docs/inspiration.md` has the references and design decisions.

## Deploying

The site runs at `whoami.cgatno.workers.dev` until the domain moves over.
Until then every response carries `X-Robots-Tag: noindex` (set in
`public/_headers`).

To move christiangaetano.com over:

1. Set `site` in `astro.config.mjs` to `https://christiangaetano.com`.
2. Set `workers_dev: false` in `wrangler.jsonc`.
3. Remove the noindex rule from `public/_headers`.
4. Point DNS at the Worker.
