# bambiui — Studio

A grid-based design token editor and component playground for the bambiui design system. Inspect and live-edit global CSS custom properties, edit component-local token defaults, generate OKLCH color scales from a primary hue, and switch between light and dark mode — all without a page reload.

Served at `/studio` under the same Cloudflare Pages project as the marketing and docs sites.

## Features

- **Grid board** — cards flow into 1, 2, or 3 columns based on card count, while pan/zoom navigation still works
- **Live editing** — global token changes are applied instantly on `document.documentElement`; component-local tokens are applied through scoped runtime overrides
- **Generate Theme** — pick a primary color (hue + chroma) and a base lightness; neutral, primary, danger, success, and warning scales are generated with OKLCH
- **Inherited token override** — tokens that reference another token (e.g. `var(--bambi-ring)`) appear disabled; click **Override** to edit directly, or **Reset** to restore the reference
- **Shared theme state** — reads and writes the `starlight-theme` localStorage key; switching themes in one tab updates the other
- **Token groups**: Color Tokens · Typography Tokens · Button and ButtonGroup Tokens
- **API previews** — complex component previews should show props-driven root usage for common layouts and compound/composed usage for advanced control.

## Development

```sh
# from the monorepo root
pnpm install
pnpm --filter studio dev         # http://localhost:4321/studio
```

## Production build

```sh
# standalone studio output → apps/studio/dist/
pnpm --filter studio build

# full deploy build — merges www + docs + studio into apps/www/dist/
pnpm deploy-static
```

## Deploying to Cloudflare Pages

Studio is merged into the www site's output at build time. A single Cloudflare Pages project serves www, docs, and studio.

### How it works

1. `pnpm deploy-static` builds www, docs, and studio.
2. Docs output (`apps/docs/dist/`) is copied into `apps/www/dist/docs/`.
3. Studio output (`apps/studio/dist/`) is copied into `apps/www/dist/studio/`.
4. Registry files are copied into `apps/www/dist/`.
5. Cloudflare Pages serves `apps/www/dist/` — marketing at `/`, docs at `/docs`, studio at `/studio`.

### Cloudflare Pages project settings

| Setting                | Value                |
| ---------------------- | -------------------- |
| Framework preset       | None                 |
| Root directory         | `/` (monorepo root)  |
| Build command          | `pnpm deploy-static` |
| Build output directory | `apps/www/dist`      |
| Node.js version        | `22.12.0` or newer   |

## Architecture

```
apps/studio/
├── src/
│   └── pages/
│       └── index.astro   # canvas, drawers, token editor, OKLCH color math
├── public/
├── astro.config.mjs      # base: '/studio'
└── package.json
```

## Token sources

| Group                      | CSS file                                              |
| -------------------------- | ----------------------------------------------------- |
| Global tokens              | `packages/tokens/src/tokens.css`                      |
| Button-local defaults      | `packages/components/button/src/button.css`           |
| ButtonGroup-local defaults | `packages/components/buttongroup/src/buttongroup.css` |
