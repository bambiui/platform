# BambiUI — Agent Quick Context

BambiUI is a pnpm + Turborepo monorepo for a multi-framework UI component CLI. The CLI copies source components for React, Svelte, Vue, and Astro into user projects. Docs and builder consume the same package source through workspace dependencies.

Keep this file short to reduce Codex context usage. Load `docs/agent-context.md` only when deeper architecture, deployment, or component details are needed.

## Structure

```txt
apps/docs       # Starlight docs site
apps/builder    # static Astro token builder served at /builder
packages/cli    # @bambiui/cli init + add commands
packages/core   # shared contracts and framework-agnostic types
packages/tokens # global CSS design tokens
packages/components/button
```

## Core Rules

- Components are source files under `packages/components`; do not add per-component packages or build steps unless explicitly requested.
- `packages/cli` must not depend on `@bambiui/components` or `@bambiui/tokens` at runtime.
- Installed component source must stay self-contained for user projects.
- Shared component-agnostic contracts live in `packages/core/src/contracts.ts`; component-specific contracts derive from them.
- Global tokens live in `packages/tokens/src/tokens.css`; component CSS lives beside each component, for example `packages/components/button/src/button.css`.
- Button CSS is shared by all frameworks and uses `data-intent`, `data-appearance`, `data-size`, and loading/disabled attributes.
- Docs and builder share the `starlight-theme` localStorage key. Dark mode uses both `data-theme="dark"` on `<html>` and the `.dark` class.
- Builder must keep `base: '/builder'` so production assets work under `/builder`.

## Common Commands

```sh
pnpm install
pnpm build
pnpm check-types
pnpm --filter docs dev
pnpm --filter builder dev
pnpm deploy-static
```

## Add A Component

1. Add or reuse shared contracts in `packages/core/src/contracts.ts`.
2. Add source and CSS under `packages/components/<name>/src/`.
3. Register it in the CLI registry map or manifest.
4. Add docs at `apps/docs/src/content/docs/components/<name>.mdx`.

## Need More Detail?

Read `docs/agent-context.md` for:

- full CSS/token conventions
- full button API conventions
- docs and builder notes
- Cloudflare Pages deployment settings
- dependency graph and gotchas
