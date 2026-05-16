# bambiui — Detailed Agent Context

This is the long-form reference for agents. `AGENTS.md` is the quick source of truth for commands, verification, no-go rules, component standards, registry entry shape, and commit rules. Read this file when the current task needs deeper architecture details.

> **Legacy context**: an older version of this file described `apps/docs`, `apps/studio`, `apps/www`, `packages/tokens`, `packages/components/button`, Button API conventions, and a Cloudflare Pages deploy flow. All of that has been superseded by the DOM Protocol architecture below. Those apps and packages no longer exist at their prior paths (see `apps/_archived/`).

## Architecture — DOM Protocol

bambiui is a CLI-first, multi-framework source distribution UI kit. Contract-driven DOM Protocol files remain internal authoring inputs; the build-time generator turns them into generated artifacts, and the CLI copies only generated, framework-ready public artifacts.

```txt
packages/cli        bambiui init/add; fetches registry assets and writes user files
packages/core       DOM protocol interfaces, utilities, and workspace component implementations
packages/generator  Internal contract parsers and framework artifact generators
packages/registry   Generated public artifacts and component CSS
apps/templates      Template projects for CLI smoke tests (bambi-react, bambi-solid, bambi-svelte, bambi-vue)
apps/www            Active minimal static host for bambiui and registry assets
apps/_archived/     docs, studio, old www — suspended during architecture reset
registry.json       v2 public manifest consumed by CLI
registry.authoring.json internal source manifest for maintainers
```

Active data flow: `core → generator → registry → cli → user project`

### Core Principles

- **HTML-first, CSS-first**: all component state is expressed via `data-*` attributes.
- **Vanilla TypeScript controllers**: DOM Protocol controllers live in `packages/core` as internal source of truth.
- **Public framework artifacts**: generated user files are self-contained and do not copy or import contracts, controllers, internal primitives, generator files, or runtime bambiui packages.
- **CustomEvents**: wrappers listen to `bambi:<event-name>` events and forward to framework callbacks/emitters.
- **Controlled/uncontrolled**: `data-controlled="true"` → controller fires event only. Without it, controller writes `data-value` and fires event.
- **Self-contained installed output**: generated user files have no `@bambiui/*` runtime imports.

## Package Boundaries

- `packages/core` — DOM Protocol source of truth. Contract + controller live here and are internal authoring inputs.
- `packages/generator` — Private internal parser/generator package used by `pnpm registry:refresh`; not a CLI runtime dependency and never imported by generated output.
- `packages/registry` — Generated public artifacts under `packages/registry/generated/` and component CSS under `src/styles/`.
- `packages/cli` — must NOT import `@bambiui/core`, `@bambiui/generator`, or `@bambiui/registry` at runtime. Treats `registry.json` as external input and only copies registry artifacts.
- Installed output — no `@bambiui/*` runtime imports and no internal contract, controller, primitive, or generator files.

## Registry Manifests

`registry.json` is public and consumed by the CLI. It may reference only generated files safe to copy into user projects:

```json
{
  "version": 2,
  "styles": { "global": "packages/registry/src/styles/bambi.css" },
  "shared": {
    "react": "packages/registry/generated/shared/react/bambi-helpers.ts",
    "solid": "packages/registry/generated/shared/solid/bambi-helpers.ts",
    "svelte": "packages/registry/generated/shared/svelte/bambi-helpers.ts",
    "vue": "packages/registry/generated/shared/vue/bambi-helpers.ts"
  },
  "sharedHashes": {
    "react": "<sha256>",
    "solid": "<sha256>",
    "svelte": "<sha256>",
    "vue": "<sha256>"
  },
  "components": {
    "tabs": {
      "name": "tabs",
      "files": {
        "react": ["packages/registry/generated/tabs/react/index.tsx", "packages/registry/generated/tabs/react/tabs.css"],
        "solid": ["packages/registry/generated/tabs/solid/index.tsx", "packages/registry/generated/tabs/solid/tabs.css"],
        "svelte": ["packages/registry/generated/tabs/svelte/Tabs.svelte", "...TabsList.svelte", "...index.ts", "...tabs.css"],
        "vue": ["packages/registry/generated/tabs/vue/Tabs.vue", "...TabsList.vue", "...index.ts", "...tabs.css"]
      },
      "helpers": {
        "react": ["BambiBehavior", "getAttr", "setAttr", "getBoolAttr"],
        "solid": ["BambiBehavior", "getAttr", "setAttr", "getBoolAttr"],
        "svelte": ["BambiBehavior", "getAttr", "setAttr", "getBoolAttr"],
        "vue": ["BambiBehavior", "getAttr", "setAttr", "getBoolAttr"]
      },
      "exports": {
        "react": ["Tabs", "TabsList", "TabsTrigger", "TabsContent"],
        "solid": ["Tabs", "TabsList", "TabsTrigger", "TabsContent"],
        "svelte": ["Tabs", "TabsList", "TabsTrigger", "TabsContent"],
        "vue": ["Tabs", "TabsList", "TabsTrigger", "TabsContent"]
      }
    }
  }
}
```

`registry.authoring.json` is internal and tracks contracts, controllers, generated artifact paths, and generator metadata. Run `pnpm registry:refresh` after authoring changes. It calls `@bambiui/generator` to parse contracts, generate public framework artifacts from contract metadata, inline behavior from core controllers, copy CSS, and validate the manifests.

Schema is validated by `registry.schema.json`. Run `node scripts/check-registry.mjs` or `pnpm check-registry`.

`registry.json` also carries `sharedHashes` — SHA-256 hashes of each framework's `bambi-helpers.ts` shared artifact — and `components[name].hashes` — per-file hashes for all generated component artifacts. The CLI verifies these on install.

## Canonical Component — Tabs

Tabs is the reference implementation for all DOM Protocol patterns:

- Contract: `packages/core/src/components/tabs/tabs.contract.ts`
- Controller: `packages/core/src/components/tabs/tabs.controller.ts`
- CSS: `packages/registry/src/styles/tabs.css`
- Public artifacts: `packages/registry/generated/tabs/{react,solid,svelte,vue}/`

## CSS Delivery

- Global style file: `packages/registry/src/styles/bambi.css`. CLI writes this to `src/styles/bambi.css` on `init`.
- Component CSS source: `packages/registry/src/styles/<name>.css`. Generated public CSS is copied beside the public framework artifact.
- CSS is driven by `data-*` attribute state written by the controller.

## CLI Output Layout

`bambiui add tabs --framework react` copies files into:

```
src/components/ui/
  bambi-helpers.ts          ← only when the component uses shared helpers
  tabs/
    index.tsx               ← React / Solid
    tabs.css
```

`bambiui add tabs --framework svelte` (and `vue`) copies per-part component files:

```
src/components/ui/
  bambi-helpers.ts
  tabs/
    Tabs.svelte             ← root component (Tabs.vue for Vue)
    TabsList.svelte
    TabsTrigger.svelte
    TabsContent.svelte
    index.ts                ← re-exports all parts
    tabs.css
```

No contract files, controller files, primitives, generator files, or `@bambiui/*` imports may appear in installed output. `bambi-helpers.ts` is a generated public artifact — it is safe to distribute and contains no internal authoring references.

## Supported Frameworks

`react`, `solid`, `svelte`, `vue`.

All four output targets are generated by `@bambiui/generator` from the same internal contract and controller source. Generator output per framework:

- **React**: single `index.tsx` with all four parts as named exports
- **Solid**: single `index.tsx` with all four parts; `splitProps` used in part components to avoid leaking component-controlled props (value, disabled, type, children) into the DOM spread
- **Svelte 5**: per-part `.svelte` files using runes (`$props`, `$effect`, `$derived`, `onMount`); children explicitly destructured as `Snippet`, not left in `...props`
- **Vue 3**: per-part `.vue` files using Composition API (`script setup`, `defineProps`, `watch`, `onMounted`, `onUpdated`)

### Dynamic Children — Framework Notes

How each framework handles triggers/content added or removed at runtime:

- **React**: `children` is in the `useEffect` deps → `behavior.update()` called automatically ✅
- **Solid**: `resolvedChildren` from `children(() => local.children)` is read inside `createEffect` → tracks fine-grained children reactivity ✅
- **Vue**: `onUpdated` hook calls `behavior.update()` after each DOM update including slot changes ✅
- **Svelte 5**: Svelte 5 Snippets do not expose a reactive identity that `$effect` can subscribe to without rendering. Workaround: wrap `<Tabs>` in `{#key}` keyed to the structure change: `{#key tabs.length}<Tabs ...>...</Tabs>{/key}` ⚠️

## apps/templates — Smoke Fixtures

`apps/templates` contains real framework project fixtures for CLI end-to-end smoke testing. Not a public product surface.

Templates:
- `bambi-react` — React/Next.js
- `bambi-solid` — Solid + Vite
- `bambi-svelte` — Svelte 5 + Vite
- `bambi-vue` — Vue 3 + Vite

The smoke script (`scripts/smoke-templates.mjs`) runs `bambiui init` + `bambiui add tabs` against each template, verifies expected output files, and runs the framework's typecheck command. With `--install`, it installs dependencies first: `npm ci` when `package-lock.json` exists, otherwise `npm install`. All four templates currently carry committed lock files, so `--install` runs `npm ci` for each.

## apps/www — Active Static Host

`apps/www` is the active minimal static host for bambiui and registry assets. It is NOT the old marketing site.

- Built via `pnpm build:static` (runs `apps/www` Astro build, then injects registry files into `dist/`).
- Serves `registry.json`, `registry.schema.json`, and all public generated files referenced by the registry manifest.

## Suspended / Archived

- `apps/_archived/docs` — Starlight documentation (suspended)
- `apps/_archived/studio` — component playground (suspended)
- `apps/_archived/www` — old marketing/landing site (archived; do not reactivate)

Do not add `apps/docs` or `apps/studio` back. Do not re-introduce deployment workflows without an explicit architecture decision.

## CLI Registry URL

- Default: `https://bambiui.com` (hosted, when active).
- Override: `--registry-url <path>` or `BAMBIUI_REGISTRY_URL` env var. Points to local repo root or preview registry for development.
