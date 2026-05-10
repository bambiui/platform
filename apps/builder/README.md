# bambiui — Token Builder

A grid-based design token editor for the bambiui design system. Inspect and live-edit global CSS custom properties, edit component-local token defaults, generate OKLCH color scales from a primary hue, and switch between light and dark mode — all without a page reload.

Served at `/builder` under the same Cloudflare Pages project as the docs site.

## Features

- **Grid board** — cards flow into 1, 2, or 3 columns based on card count, while pan/zoom navigation still works
- **Live editing** — global token changes are applied instantly on `document.documentElement`; component-local tokens are applied through scoped runtime overrides
- **Generate Theme** — pick a primary color (hue + chroma) and a base lightness; neutral, primary, danger, success, and warning scales are generated with OKLCH
- **Inherited token override** — tokens that reference another token (e.g. `var(--bambi-ring)`) appear disabled; click **Override** to edit directly, or **Reset** to restore the reference
- **Shared theme state** — reads and writes the `starlight-theme` localStorage key, the same key used by the docs site; switching themes in one tab updates the other
- **Token groups**: Color Tokens · Typography Tokens · Button Tokens

## Navigation

- The **bambiui** logo in the top-left links back to `/` (docs root)
- The **light/dark switch** at the bottom of the left drawer persists to localStorage and stays in sync with the docs site

## Development

```sh
# from the monorepo root
pnpm install
pnpm build                        # build docs and builder
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

1. `turbo run build --filter=docs --filter=builder` builds the builder (`apps/builder/dist/`) and docs (`apps/docs/dist/`).
2. `deploy-static` copies `apps/builder/dist/` into `apps/docs/dist/builder/`.
3. `deploy-static` copies `registry.json`, `registry.schema.json`, and registry source files into `apps/docs/dist/`.
4. Cloudflare Pages serves `apps/docs/dist/` — docs at `/`, builder at `/builder`, registry files at the site root, and source files under `/packages/...`.

`base: '/builder'` in `astro.config.mjs` ensures all asset paths are correct at that subpath.

### Cloudflare Pages project settings

| Setting                | Value                |
| ---------------------- | -------------------- |
| Framework preset       | None                 |
| Root directory         | `/` (monorepo root)  |
| Build command          | `pnpm deploy-static` |
| Build output directory | `apps/docs/dist`     |
| Node.js version        | `22.12.0` or newer   |

## Architecture

```
apps/builder/
├── src/
│   └── pages/
│       └── index.astro   # entire app — canvas, drawers, token editor, OKLCH color math
├── public/
├── astro.config.mjs      # base: '/builder'
└── package.json
```

The page entry imports global tokens from `@bambiui/tokens/tokens.css` and button source from `@bambiui/components`. Board layout, pan/zoom, token editing, scoped component overrides, and OKLCH color scale generation live in `src/scripts/builder.ts`.

## Token sources

| Group                 | CSS file                                    |
| --------------------- | ------------------------------------------- |
| Global tokens         | `packages/tokens/src/tokens.css`            |
| Button-local defaults | `packages/components/button/src/button.css` |

Global token values are read from `document.documentElement` and written back with `document.documentElement.style.setProperty` / `removeProperty`. Component-local token values are read from the relevant component selector and written as scoped runtime CSS overrides.
