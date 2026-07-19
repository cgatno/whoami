# christiangaetano.com

Personal site for Christian Gaetano. Two phases, one codebase:

1. **Now:** professional landing page—resume, work samples, career presence.
2. **Later:** blog / writing platform. Additive, not a migration. Decisions made now must carry
   forward without a rebuild.

## Stack

| Thing           | Choice                                                |
| --------------- | ----------------------------------------------------- |
| Framework       | Astro 7.1                                             |
| Host            | Cloudflare Workers (via `@astrojs/cloudflare`)        |
| Integrations    | `@astrojs/cloudflare`, `@astrojs/sitemap`—that's it |
| Styling         | Plain modern CSS. No Tailwind, no CSS-in-JS           |
| UI framework    | None installed                                        |
| Package manager | npm                                                   |

## Decisions and their reasoning

These were deliberate. Don't silently reverse them; raise it if you think one is wrong.

**No UI framework renderer is installed, on purpose.** Astro components plus vanilla `<script>`
covers nav, theme toggle, and menus. A renderer only earns its place when a component has real
client-side state. If one is genuinely needed later, the current pick is Svelte 5 (smallest island payload,
compile-time), with Preact as the fallback. Do not reach for React by default, but don't rule anything out.

**No Tailwind, on purpose.** The visual design is the differentiator here, and modern CSS—nesting,
`@layer`, custom properties, container queries, scroll-driven animations,
`@view-transition`—covers it. Tailwind's value is team velocity, which doesn't apply to a
solo site.

**Markdown integration (MDX / Markdoc) is deferred, not forgotten.** Astro 7's Sätteri processor
gives plain `.md` GFM, smart punctuation, heading IDs, container directives, math, footnotes, and
wikilinks with zero plugins. That covers most needs. Add MDX only when a post genuinely needs an
embedded interactive component—it's a one-command change with no refactoring cost.

**Content collections are NOT deferred.** They work with plain `.md` via the `glob()` loader with
no integration installed. Use them from the first piece of content. Note: Zod imports come from
`astro/zod`, not `astro:content`.

**Motion (motion.dev) is deferred.** Astro's built-in view transitions plus CSS cover most of it.
Add Motion only for a specific interaction that genuinely earns it.

## Astro 7 gotchas

- **The Rust compiler is strict.** No more silent HTML correction. Unclosed tags and unterminated
  attributes are errors. Whitespace between elements is collapsed per JSX conventions—use an
  explicit `{' '}` where a space matters.
- **Sätteri is the default markdown processor.** remark/rehype plugins require opting back in via
  `@astrojs/markdown-remark`. Prefer Sätteri's built-in features over reaching for a plugin.
- **`site` must be set in `astro.config.mjs`** or `@astrojs/sitemap` silently produces nothing.
- Node 22.12+ required (`engines` in `package.json`). Local dev is on Node 26.x.
- Cloudflare Workers runs workerd, not Node—local Node version only affects build tooling.

## Design direction

**Minimalism is not the goal.** Demonstrating frontend craft and interaction care is part of the
professional positioning. A sparse, safe site actively undercuts the point.

The approach is **one or two load-bearing moments of craft**—not a wholesale maximalist studio
aesthetic, and not a template. Reference point for the quality bar: tympanus.net/codrops.

Note that most Codrops-caliber work is canvas, WebGL, GSAP, and CSS—not framework code. Don't
assume an interaction needs a component framework.

Typography and palette exploration exists as reference, not locked decisions: Fraunces (serif),
Inter (sans), JetBrains Mono (mono); OKLCH color with P3 gamut, CSS custom properties, light and
dark modes.

## Working preferences

- Honest, thorough feedback. Push back when a recommendation is wrong.
- Explain reasoning, don't just produce output.
- Strategic questions before implementation questions.

---

## Deployment and branches

| Branch    | Deploys to                                | Via                                        |
| --------- | ----------------------------------------- | ------------------------------------------ |
| `main`    | `whoami.cgatno.workers.dev`               | Workers Builds → `wrangler deploy`         |
| `preview` | `<version>-whoami.cgatno.workers.dev`     | Workers Builds → `wrangler versions upload` |
| `master`  | Netlify, serving both live domains        | Legacy. Do not touch; delete at cutover.   |

Superseded history lives in tags—`archive/v1-netlify` (2018 site) and `archive/v2-astro5`
(2025 attempt). Nothing else from those branches needs to survive.

**Two settings look like bugs and are not. Don't "fix" them:**

- **`site` points at the workers.dev origin, not `christiangaetano.com`.** A production
  canonical on a page that also serves `X-Robots-Tag: noindex` risks the noindex being
  consolidated onto the canonical target—i.e. deindexing the live site.
- **`public/_headers` applies `noindex` unscoped (`/*`), not scoped to workers.dev.**
  `_headers` permits only ONE wildcard per rule, so `https://*.workers.dev/*` is invalid
  and gets skipped at build with only a warning. That exact bug left every path except `/`
  indexable on the previous deployment for a year.

`_headers` applies to **static assets only**. A route with `prerender = false` won't get the
noindex header and needs it set in middleware instead.

### DNS cutover checklist

1. `site` → `https://christiangaetano.com`
2. Delete the `noindex` rule from `public/_headers`
3. `"workers_dev": false` in `wrangler.jsonc`, once a custom domain is attached
4. Point DNS at Cloudflare, retire Netlify, delete `master`
5. Verify by curling real paths—not by reading config

## Development

Start the dev server with `astro dev --background`; manage it via `astro dev stop`, `status`,
and `logs`. To run a throwaway second server alongside a running one, use
`astro dev --ignore-lock`—those instances are invisible to `stop`/`status`/`logs`.

Note `astro dev` does not apply `_headers`. To verify header behavior, build and run
`wrangler dev` against `dist/`.

## Documentation

Astro: https://docs.astro.build — [routing and middleware](https://docs.astro.build/en/guides/routing/),
[components](https://docs.astro.build/en/basics/astro-components/),
[content collections](https://docs.astro.build/en/guides/content-collections/),
[styling](https://docs.astro.build/en/guides/styling/) (ignore the Tailwind portion).

Cloudflare work has dedicated skills—`wrangler`, `workers-best-practices`, `cloudflare`,
`web-perf`. Prefer them, and prefer live docs over recall: Workers config fields and
`_headers` semantics have both changed recently.
