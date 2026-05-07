# Bambi UI — Token Builder

An infinite-canvas design token editor for the Bambi UI design system. Inspect and live-edit every CSS custom property, generate a full color theme from a single primary hue, and switch between light and dark mode — all without a page reload.

Served at `/builder` under the same Cloudflare Pages project as the docs site.

## Features

- **Infinite canvas** — pan and zoom freely across all token groups; selecting a card resets zoom to 1× and flies to the card's top
- **Live editing** — changes are applied instantly as CSS custom properties on `document.documentElement`
- **Generate Theme** — pick a primary color (hue + chroma) and a base lightness; all semantic color tokens are derived automatically using OKLCH
- **Inherited token override** — tokens that reference another token (e.g. `var(--bambi-ring)`) appear disabled; click **Override** to edit directly, or **Reset** to restore the reference
- **Shared theme state** — reads and writes the `starlight-theme` localStorage key, the same key used by the docs site; switching themes in one tab updates the other
- **Token groups**: Color Tokens · Typography Tokens · Button Tokens

## Navigation

- The **Bambi** logo in the top-left links back to `/` (docs root)
- The **light/dark switch** at the bottom of the left drawer persists to localStorage and stays in sync with the docs site

## Development

```sh
# from the monorepo root
pnpm install
pnpm build                        # build upstream packages first
pnpm --filter builder dev         # http://localhost:4321/builder
```

> The dev server also picks up `base: '/builder'` from `astro.config.mjs`, so all routes and assets are served under `/builder` locally as well.

## Production build

```sh
# standalone builder output → apps/builder/dist/
pnpm --filter builder build

# full deploy build (docs + builder merged into apps/docs/dist/)
pnpm deploy-static
```

## Deploying to Cloudflare Pages

The builder is merged into the docs site's output at build time. A single Cloudflare Pages project serves both.

### How it works

1. `turbo run build` builds all packages, the builder (`apps/builder/dist/`), and the docs (`apps/docs/dist/`).
2. `deploy-static` copies `apps/builder/dist/` into `apps/docs/dist/builder/`.
3. Cloudflare Pages serves `apps/docs/dist/` — docs at `/`, builder at `/builder`.

`base: '/builder'` in `astro.config.mjs` ensures all asset paths are correct at that subpath.

### Cloudflare Pages project settings

| Setting | Value |
|---|---|
| Framework preset | None |
| Root directory | `/` (monorepo root) |
| Build command | `pnpm deploy-static` |
| Build output directory | `apps/docs/dist` |
| Node.js version | `22` |

## Architecture

```
apps/builder/
├── src/
│   └── pages/
│       └── index.astro   # entire app — canvas, drawers, token editor, OKLCH color math
├── public/
├── astro.config.mjs      # base: '/builder' + CSS alias workaround for workspace packages
└── package.json
```

All logic lives in `src/pages/index.astro`. The `<style is:global>` block styles the canvas and drawers; the `<script>` block (TypeScript, processed by Vite) handles pan/zoom, drawer state, token rendering, and OKLCH color math.

## Token sources

| Group | CSS file |
|---|---|
| Color + Typography | `packages/ui/theme/src/tokens.css` |
| Button | `packages/ui/button/src/index.css` |

Token values are read at runtime via `getComputedStyle(document.documentElement)` and overrides are written back with `document.documentElement.style.setProperty` / `removeProperty`.
