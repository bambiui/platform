# Bambi UI — CLAUDE.md

## What this repo is

Bambi UI is a multi-framework UI component library built as a pnpm + Turborepo monorepo. Components are available for React, Svelte, Vue, and Astro. All frameworks share the same design tokens and base CSS.

## Monorepo structure

```
apps/
  docs/                    # Starlight (Astro) documentation site
packages/
  ui/
    button/                # @bambi-ui/button — shared types + base CSS (built with tsup)
    theme/                 # @bambi-ui/theme — CSS tokens + cn() utility (built with tsup)
  react/
    button/                # @bambi-react/button — React component (built with tsup)
  svelte/
    button/                # @bambi-svelte/button — Svelte 5 component (source-shipped)
  vue/
    button/                # @bambi-vue/button — Vue 3 component (source-shipped)
  astro/
    button/                # @bambi-astro/button — Astro component (source-shipped)
```

## Key conventions

### Source-shipping vs. built packages
- `@bambi-ui/button`, `@bambi-ui/theme`, `@bambi-react/button` are **built with tsup** — consumers get compiled JS + `.d.ts`.
- `@bambi-svelte/button`, `@bambi-vue/button`, `@bambi-astro/button` are **source-shipped** — `.svelte`, `.vue`, `.astro` files go to consumers as-is; the consumer's bundler compiles them.

### CSS delivery
- All button CSS lives in `packages/ui/button/src/index.css` — a single source consumed by all frameworks.
- The CSS export is `@bambi-ui/button/index.css` (declared in `package.json` exports, not the dist).
- In the docs site, CSS is loaded via Starlight's `customCss` array in `astro.config.mjs`, **not** via PostCSS `@import` (PostCSS doesn't resolve package.json `exports` for CSS).

### Design tokens
- All design tokens are CSS custom properties in `packages/ui/theme/src/tokens.css`.
- Colors use OKLCH. Light defaults in `:root`, dark overrides in `.dark`.
- Button tokens are namespaced `--bambi-button-*`. Theme tokens are `--bambi-*`.

### Component API conventions
Every button component across all frameworks follows the same shape:
- Props: `variant`, `size`, `loading`, `disabled`, `type` (all optional with defaults)
- Default `type="button"` (prevents accidental form submission)
- `data-variant`, `data-size` attributes drive CSS styling
- `data-loading` + `aria-busy="true"` for loading state
- `opacity: 0` (not `visibility: hidden`) on `.bambi-button-content` during loading — keeps text accessible to screen readers
- `aria-disabled` set when `loading || disabled`

### Adding a new component
1. Add shared types + CSS to a new package under `packages/ui/<name>/`
2. Add framework implementations under `packages/react/<name>/`, `packages/svelte/<name>/`, etc.
3. Add the component to the docs under `apps/docs/src/content/docs/components/<name>.mdx`
4. Register new workspace packages in `pnpm-workspace.yaml` if new directories are introduced
5. Add `noExternal` entries in `apps/docs/astro.config.mjs` for any new workspace package used in docs

## Common commands

```sh
# Install dependencies
pnpm install

# Build all packages (required before running docs)
pnpm build

# Build a specific package
pnpm --filter @bambi-ui/button build
pnpm --filter @bambi-react/button build

# Run the docs dev server
pnpm --filter docs dev

# Type-check all packages
pnpm check-types
```

## Docs site (`apps/docs`)
- Built with [Starlight](https://starlight.astro.build/) on top of Astro.
- Integrations: `@astrojs/react`, `@astrojs/svelte`, `@astrojs/vue` — all four frameworks render in the same MDX page.
- Tab groups use `<Tabs syncKey="framework">` so switching framework in one section switches all sections on the page.
- Preview wrappers use `.preview`, `.preview-row`, `.preview-col` CSS classes from `src/styles/preview.css`.
- Global CSS (`src/styles/global.css`) imports the token sheet and button CSS.

## Dependency graph

```
@bambi-ui/theme          (no internal deps)
@bambi-ui/button         (no internal deps)
@bambi-react/button  →   @bambi-ui/button, @bambi-ui/theme
@bambi-svelte/button →   @bambi-ui/button
@bambi-vue/button    →   @bambi-ui/button
@bambi-astro/button  →   @bambi-ui/button
docs                 →   all of the above
```

## Things to watch out for

- **Build order matters**: `@bambi-ui/button` and `@bambi-ui/theme` must be built before `@bambi-react/button` and before running the docs. Turborepo handles this via `"dependsOn": ["^build"]` in `turbo.json`.
- **`vite.ssr.noExternal`**: All workspace packages used by docs must be listed here or Astro's SSR bundler won't process them correctly.
- **PostCSS cannot resolve CSS from package `exports`**: Always use Starlight's `customCss` for CSS coming from workspace packages.
- **Svelte/Vue/Astro packages have no build step**: Don't add `tsup` scripts to them. Their source files are the published artifact.
