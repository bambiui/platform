# bambiui — Detailed Agent Context

This is the long-form reference for Codex. `AGENTS.md` is the quick source of truth for commands, verification, no-go rules, component standards, registry entry shape, and commit rules. Read this file only when the current task needs deeper architecture, deployment, or component details.

## Additional Structure Detail

```txt
apps/
  docs/                    # Starlight (Astro) documentation site
  builder/                 # Grid-based design token editor (static Astro, served at /builder)
packages/
  cli/                     # bambiui CLI — init + add source components
  core/                    # @bambiui/core — shared contracts and framework-agnostic types
  tokens/                  # @bambiui/tokens — global primitive, semantic, intent, and state tokens
  components/              # @bambiui/components — source components + CSS
    button/
```

## CLI-First Component Delivery

- User-facing installation happens through `packages/cli`, which fetches component source, component CSS, and global tokens from the configured registry URL.
- The default registry is the hosted static site at `https://bambiui.com`; `--registry-url` and `BAMBIUI_REGISTRY_URL` can point to local or preview registries.

## Source Of Truth

- Shared component-agnostic contracts live in `packages/core/src/contracts.ts`; component-specific contracts such as button derive from them.
- `packages/components` should consume shared type contracts internally where useful, while CLI-installed user files must remain source-distributed and self-contained.
- If adding a new component, avoid duplicating intent, appearance, size, or default values without deciding which layer owns them first.

## CSS Delivery

- All button CSS lives in `packages/components/button/src/button.css`; it is the single source consumed by all frameworks.
- Public user projects receive global tokens from `packages/tokens/src/tokens.css` and component CSS from `packages/components/<name>/src/<name>.css`.
- Component-specific token defaults live in component CSS, not in global `tokens.css`. For example, `--bambi-button-*` defaults are scoped on `.bambi-button` inside `packages/components/button/src/button.css`.
- In the docs site, app-level CSS is loaded via Starlight's `customCss` array in `astro.config.mjs`; token CSS is imported from `@bambiui/tokens/tokens.css` inside `src/styles/global.css`.
- The builder imports `@bambiui/tokens/tokens.css` from its page entry and imports component source from `@bambiui/components`.

## Design Tokens

- Global design tokens are CSS custom properties in `packages/tokens/src/tokens.css`.
- Colors use OKLCH scale tokens (`--bambi-primary-50` through `--bambi-primary-950`, plus neutral/danger/success/warning scales). Light semantic defaults live in `:root`, dark semantic overrides live in `[data-theme="dark"], .dark`.
- Global token layering is primitive scale -> semantic -> intent/state.
- Component token layering happens in component CSS so scoped user overrides can target the component without changing global theme values.

## Theme Management

- Both apps use the `starlight-theme` localStorage key (`"light"` or `"dark"`) as the single source of truth for the active theme.
- Docs: Starlight reads and writes this key natively.
- Builder: reads on page load, writes on toggle, and listens to the `storage` event so tabs stay in sync.
- Dark mode is activated by `data-theme="dark"` on `<html>` plus the `.dark` class to match both Starlight and bambiui token conventions.

## Button API Conventions

Every button component across all frameworks follows the same shape:

- Props: `intent`, `appearance`, `size`, `loading`, `disabled`, `type`; all optional with defaults.
- Default `type="button"` prevents accidental form submission.
- `data-intent`, `data-appearance`, and `data-size` attributes drive CSS styling.
- `data-loading` and `aria-busy="true"` represent loading state.
- Use `opacity: 0`, not `visibility: hidden`, on `.bambi-button-content` during loading so text stays accessible to screen readers.
- Set `aria-disabled` when `loading || disabled`.
- Icon-only buttons must have an accessible name, usually `aria-label`.

## Docs Site (`apps/docs`)

- Built with Starlight on top of Astro.
- Integrations: `@astrojs/react`, `@astrojs/svelte`, `@astrojs/vue`; all four frameworks can render in the same MDX page when needed.
- Tab groups use `<Tabs syncKey="framework">` so switching framework in one section switches all sections on the page.
- Preview wrappers use `.preview`, `.preview-row`, `.preview-col` CSS classes from `src/styles/preview.css`.
- Global CSS (`src/styles/global.css`) imports the token sheet; button CSS is imported by the package component source.
- Hero page (`index.mdx`) links to Documents (`/components/button`), Token Builder (`/builder`), and GitHub.

## Builder App (`apps/builder`)

- A single-page grid-based token editor with pan/zoom navigation.
- `base: '/builder'` is set in `astro.config.mjs` so all assets resolve correctly when served under the `/builder` subpath.
- The logo in the left drawer links back to `/` (docs root).
- Color token generation uses OKLCH math to generate scale tokens for neutral, primary, danger, success, and warning. Semantic and intent tokens stay linked to those scales.
- Global token edits apply to `document.documentElement`. Component-local token edits, such as button tokens, are written as scoped runtime overrides for `.bambi-button`.

## Deployment (Cloudflare Pages)

Both apps are deployed as a single Cloudflare Pages project. `pnpm deploy-static` builds docs and builder with Turborepo, copies `apps/builder/dist/` into `apps/docs/dist/builder/`, and copies `registry.json`, `registry.schema.json`, and all source files referenced by `registry.json` into `apps/docs/dist/`. The single output directory is `apps/docs/dist`.

| Setting                | Value                |
| ---------------------- | -------------------- |
| Build command          | `pnpm deploy-static` |
| Build output directory | `apps/docs/dist`     |
| Node.js version        | `22.12.0` or newer   |

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
- Registry URL: CLI defaults to `https://bambiui.com` and supports `--registry-url` / `BAMBIUI_REGISTRY_URL` for local or preview registries.
- Recipes in installed components: keep component-local recipes self-contained so users do not need extra bambiui runtime packages. Only create a shared recipe or helper after at least two components need it, and only if the generated installed output remains self-contained.
- Builder `base: '/builder'`: all internal asset paths in the builder are prefixed with `/builder`, which is why production assets resolve under the merged docs output.
- `starlight-theme` localStorage key: both apps share this key. Never rename it in the builder without updating Starlight's config in docs, and vice versa.
