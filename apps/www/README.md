# bambiui — www

Custom Astro marketing and landing site for bambiui. Served at `/` (site root).

This is not a Starlight app. It is a plain Astro site with a hand-crafted landing page. Documentation lives under `/docs` (`apps/docs`); the Studio token editor lives under `/studio` (`apps/studio`).

## Development

```sh
pnpm --filter www dev
```

## Production build

```sh
# standalone www output → apps/www/dist/
pnpm --filter www build

# full deploy build — merges www + docs + studio into apps/www/dist/
pnpm deploy-static
```

## Cloudflare Pages project settings

| Setting                | Value                |
| ---------------------- | -------------------- |
| Framework preset       | None                 |
| Root directory         | `/` (monorepo root)  |
| Build command          | `pnpm deploy-static` |
| Build output directory | `apps/www/dist`      |
| Node.js version        | `22.12.0` or newer   |

## What goes here

- Marketing copy, hero sections, feature highlights
- Links to docs and Studio
- Root-level HTML, meta tags, OG tags, favicon, robots.txt, site.webmanifest

## What does NOT go here

- Documentation pages → `apps/docs`
- Token editor or component previews → `apps/studio`
- Starlight UI elements
