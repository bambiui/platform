# bambiui

DOM Protocol based, CLI-first UI kit.

> Status: architecture reset in progress. The old docs/studio/marketing apps are archived; `apps/www` is the active minimal static host.

## Quick Start

```sh
npx bambiui init
npx bambiui add tabs --framework react
npx bambiui add tabs --framework solid
npx bambiui add tabs --framework svelte
npx bambiui add tabs --framework vue
```

If framework auto-detection is inconclusive, the CLI uses React defaults.

## Architecture

bambiui uses a DOM Protocol model:

```txt
packages/core -> packages/generator -> packages/registry -> packages/cli -> user project
```

- `packages/core` defines internal contracts, controllers, and primitives.
- `packages/generator` turns internal authoring inputs into framework-ready source artifacts.
- `packages/registry` stores generated public artifacts and CSS.
- `packages/cli` copies those public artifacts into user projects.

Installed component output is self-contained. It must not import runtime `@bambiui/*` packages and must not include contracts, controllers, internal primitives, or generator files.

## Supported Frameworks

- React
- Solid
- Svelte 5
- Vue 3

## Install Output

`bambiui add tabs --framework react` writes:

```txt
src/styles/bambi.css
src/components/ui/bambi-helpers.ts
src/components/ui/tabs/index.tsx
src/components/ui/tabs/tabs.css
```

Solid uses the same file shape as React. Svelte and Vue install per-part component files plus `index.ts` and `tabs.css`.

The shared helper is declared once at `registry.json.shared`, currently `packages/registry/generated/shared/bambi-helpers.ts`. The CLI copies it only when the selected component declares helper usage for the selected framework.

## Controlled And Uncontrolled Tabs

```tsx
// Uncontrolled: controller manages state internally.
<Tabs defaultValue="one">...</Tabs>

// Controlled: host framework owns state; controller fires bambi:value-change.
<Tabs value={tab} onValueChange={(detail) => setTab(detail.value)}>...</Tabs>
```

`onValueChange` receives `{ value, previousValue, source }`.

## Workspace

| Path | Purpose |
| --- | --- |
| `packages/cli` | Published `bambiui` executable: `init`, `add`, registry copying |
| `packages/core` | Internal DOM Protocol contracts, controllers, primitives |
| `packages/generator` | Internal framework artifact generators |
| `packages/registry` | Generated public artifacts and CSS |
| `apps/templates` | CLI smoke-test fixtures |
| `apps/www` | Active static host for registry assets |
| `apps/_archived` | Suspended docs/studio/old www |

## Commands

```sh
pnpm install
pnpm registry:refresh        # regenerate public artifacts and refresh hashes
pnpm check-registry          # validate registry.json and authoring manifest
pnpm check-types             # TypeScript checks across workspace tasks
pnpm --filter bambiui smoke  # CLI smoke tests
pnpm check                   # registry refresh + types + registry + core/generator/CLI tests
pnpm check:full              # pnpm check + template install/compile smoke
pnpm build:static            # build apps/www and inject registry assets
```

## New Component Checklist

- Define serializable DOM Protocol state in `packages/core`; do not put callbacks, objects, or functions in `data-*`.
- Add generator metadata for every framework in `registry.authoring.json`.
- If controller mount mutates visible selected/open/active state, add `ssrSelectedState` metadata so SSR and first client render match before hydration.
- Run `pnpm registry:refresh` and keep generated registry artifacts in sync with template fixtures.
- Verify with the narrowest relevant checks, then use `pnpm check:full` for install or compile behavior changes.

## Svelte 5 Dynamic Children

Svelte 5 snippets do not expose a reactive identity for structural child changes. If triggers/content are added or removed dynamically, key the `<Tabs>` wrapper to the structure:

```svelte
{#key tabs.length}
  <Tabs ...>...</Tabs>
{/key}
```

React, Solid, and Vue handle dynamic children through their normal update lifecycles.
