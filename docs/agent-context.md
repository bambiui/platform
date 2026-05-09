# BambiUI — Detailed Agent Context

This is the long-form reference for Codex. Keep `AGENTS.md` short; read this file only when the current task needs deeper context.

## What This Repo Is

BambiUI is a multi-framework UI component CLI built as a pnpm + Turborepo monorepo. The CLI copies React, Svelte, Vue, and Astro component source into user projects. Docs and builder consume the same package source through workspace dependencies.

## Monorepo Structure

```txt
apps/
  docs/                    # Starlight (Astro) documentation site
  builder/                 # Infinite-canvas design token editor (static Astro, served at /builder)
packages/
  cli/                     # bambiui CLI — init + add source components
  core/                    # @bambiui/core — shared contracts and framework-agnostic types
  tokens/                  # @bambiui/tokens — primitive, semantic, intent, state, component tokens
  components/              # @bambiui/components — source components + CSS
    button/
```

## CLI-First Component Delivery

- Components are source files under `packages/components`, not per-framework packages.
- User-facing installation happens through `packages/cli`, which fetches component source, component CSS, and global tokens from the configured registry URL.
- The default registry is the hosted static site at `https://bambi-ui.felekoglu.dev`; `--registry-url` and `BAMBIUI_REGISTRY_URL` can point to local or preview registries.
- The CLI package must not depend on `@bambiui/components` or `@bambiui/tokens` at runtime.
- Do not add per-component `package.json` files or build steps unless the project intentionally returns to package publishing.

## Source Of Truth

- Shared component-agnostic contracts live in `packages/core/src/contracts.ts`; component-specific contracts such as button derive from them.
- `packages/components` should consume shared type contracts internally where useful, while CLI-installed user files must remain source-distributed and self-contained.
- If adding a new component, avoid duplicating intent, appearance, size, or default values without deciding which layer owns them first.

## CSS Delivery

- All button CSS lives in `packages/components/button/src/button.css`; it is the single source consumed by all frameworks.
- Public user projects receive global tokens from `packages/tokens/src/tokens.css` and component CSS from `packages/components/<name>/src/<name>.css`.
- In the docs site, app-level CSS is loaded via Starlight's `customCss` array in `astro.config.mjs`; token CSS is imported from `@bambiui/tokens/tokens.css` inside `src/styles/global.css`.
- The builder imports `@bambiui/tokens/tokens.css` from its page entry and imports component source from `@bambiui/components`.

## Design Tokens

- Global design tokens are CSS custom properties in `packages/tokens/src/tokens.css`.
- Colors use OKLCH. Light defaults live in `:root`, dark overrides in `.dark`.
- Button tokens are namespaced `--bambi-button-*`. Theme tokens are `--bambi-*`.
- Token layering is primitive -> semantic -> intent/state -> component.

## Theme Management

- Both apps use the `starlight-theme` localStorage key (`"light"` or `"dark"`) as the single source of truth for the active theme.
- Docs: Starlight reads and writes this key natively.
- Builder: reads on page load, writes on toggle, and listens to the `storage` event so tabs stay in sync.
- Dark mode is activated by `data-theme="dark"` on `<html>` plus the `.dark` class to match both Starlight and Bambi token conventions.

## Button API Conventions

Every button component across all frameworks follows the same shape:

- Props: `intent`, `appearance`, `size`, `loading`, `disabled`, `type`; all optional with defaults.
- Default `type="button"` prevents accidental form submission.
- `data-intent`, `data-appearance`, and `data-size` attributes drive CSS styling.
- `data-loading` and `aria-busy="true"` represent loading state.
- Use `opacity: 0`, not `visibility: hidden`, on `.bambi-button-content` during loading so text stays accessible to screen readers.
- Set `aria-disabled` when `loading || disabled`.
- Icon-only buttons must have an accessible name, usually `aria-label`.

## Adding A New Component

1. Add shared component-agnostic contracts to `packages/core/src/contracts.ts` when needed, then derive component-specific contracts from them.
2. Add component source under `packages/components/<name>/src/`.
3. Add component CSS beside the source component in `packages/components/<name>/src/<name>.css`.
4. Register the component in `registry.json`.
5. Add the component to the docs under `apps/docs/src/content/docs/components/<name>.mdx`.

## Common Commands

```sh
# Install dependencies
pnpm install

# Build docs and builder
pnpm build

# Run the docs dev server
pnpm --filter docs dev

# Run the builder dev server
pnpm --filter builder dev

# Full static deploy build (docs + builder merged, output: apps/docs/dist)
pnpm deploy-static

# Type-check all packages
pnpm check-types

# Full local verification
pnpm check
```

## Docs Site (`apps/docs`)

- Built with Starlight on top of Astro.
- Integrations: `@astrojs/react`, `@astrojs/svelte`, `@astrojs/vue`; all four frameworks can render in the same MDX page when needed.
- Tab groups use `<Tabs syncKey="framework">` so switching framework in one section switches all sections on the page.
- Preview wrappers use `.preview`, `.preview-row`, `.preview-col` CSS classes from `src/styles/preview.css`.
- Global CSS (`src/styles/global.css`) imports the token sheet; button CSS is imported by the package component source.
- Hero page (`index.mdx`) links to Documents (`/components/button`), Token Builder (`/builder`), and GitHub.

## Builder App (`apps/builder`)

- A single-page infinite-canvas token editor.
- `base: '/builder'` is set in `astro.config.mjs` so all assets resolve correctly when served under the `/builder` subpath.
- The logo in the left drawer links back to `/` (docs root).
- Color token generation uses OKLCH math ported from the old theme builder.

## Deployment (Cloudflare Pages)

Both apps are deployed as a single Cloudflare Pages project. `pnpm deploy-static` builds docs and builder with Turborepo, copies `apps/builder/dist/` into `apps/docs/dist/builder/`, and copies `registry.json`, `registry.schema.json`, and all source files referenced by `registry.json` into `apps/docs/dist/`. The single output directory is `apps/docs/dist`.

| Setting | Value |
| --- | --- |
| Build command | `pnpm deploy-static` |
| Build output directory | `apps/docs/dist` |
| Node.js version | `22.12.0` or newer |

## Dependency Graph

```txt
bambiui CLI         (fetches source from registry URL)
@bambiui/core        (shared contracts)
@bambiui/tokens      (global CSS tokens)
@bambiui/components  -> @bambiui/core
docs                 -> source components and tokens
builder              -> source components and tokens
```

## Things To Watch Out For

- Node version: use Node `>=22.12.0` across the repo.
- Registry URL: CLI defaults to `https://bambi-ui.felekoglu.dev` and supports `--registry-url` / `BAMBIUI_REGISTRY_URL` for local or preview registries.
- Installed source must stay self-contained: internal packages can share contracts, but files copied into user projects should not require BambiUI runtime packages.
- Recipes in installed components: keep component-local recipes self-contained so users do not need extra BambiUI runtime packages.
- Component source has no build step: user-facing files are copied by the CLI.
- Builder `base: '/builder'`: all internal asset paths in the builder are prefixed with `/builder`. Do not remove this or assets will 404 in production.
- `starlight-theme` localStorage key: both apps share this key. Never rename it in the builder without updating Starlight's config in docs, and vice versa.
