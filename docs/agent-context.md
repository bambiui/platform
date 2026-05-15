# bambiui — Detailed Agent Context

This is the long-form reference for agents. `AGENTS.md` is the quick source of truth for commands, verification, no-go rules, component standards, registry entry shape, and commit rules. Read this file when the current task needs deeper architecture details.

> **Legacy context**: an older version of this file described `apps/docs`, `apps/studio`, `apps/www`, `packages/tokens`, `packages/components/button`, Button API conventions, and a Cloudflare Pages deploy flow. All of that has been superseded by the DOM Protocol architecture below. Those apps and packages no longer exist at their prior paths (see `apps/_archived/`).

## Architecture — DOM Protocol

bambiui is a CLI-first, React-focused source distribution UI kit. Contract-driven DOM Protocol files remain internal authoring inputs; the CLI copies only generated, framework-ready public artifacts.

```txt
packages/cli        bambiui init/add; fetches registry assets and writes user files
packages/core       DOM protocol interfaces, utilities, and workspace component implementations
packages/adapters   Generic framework adapter helpers; currently only React helpers are active
packages/registry   Internal React templates plus generated public artifacts
packages/generator  Internal contract parsers and framework artifact generators
apps/templates      Template project for CLI smoke tests (bambi-react)
apps/www            Active minimal static host for bambiui and registry assets
apps/_archived/     docs, studio, old www — suspended during architecture reset
registry.json       v2 public manifest consumed by CLI
registry.authoring.json internal source manifest for maintainers
```

### Core Principles

- **HTML-first, CSS-first**: all component state is expressed via `data-*` attributes.
- **Vanilla TypeScript controllers**: DOM Protocol controllers live in `packages/core` as internal source of truth.
- **Public React artifacts**: generated user files are self-contained and do not copy or import contracts, controllers, adapter helpers, or generators.
- **CustomEvents**: wrappers listen to `bambi:<event-name>` events and forward to framework callbacks/emitters.
- **Controlled/uncontrolled**: `data-controlled="true"` → controller fires event only. Without it, controller writes `data-value` and fires event.
- **Self-contained installed output**: generated user files have no `@bambiui/*` runtime imports.

## Package Boundaries

- `packages/core` — DOM Protocol source of truth. Contract + controller live here and are internal authoring inputs.
- `packages/adapters` — Generic framework adapter helpers. Only React helpers (`react/`) are active. Adapter files are internal authoring inputs.
- `packages/generator` — Private internal parser/generator package used by `pnpm registry:refresh`; not a CLI runtime dependency and never imported by generated output.
- `packages/registry` — Internal React wrapper templates plus generated public artifacts under `packages/registry/generated/`.
- `packages/cli` — must NOT import `@bambiui/core` or `@bambiui/registry` at runtime. Treats `registry.json` as external input.
- Installed output — no `@bambiui/*` runtime imports and no internal helper files.

## Registry Manifests

`registry.json` is public and consumed by the CLI. It may reference only generated files safe to copy into user projects:

```json
{
  "version": 2,
  "styles": { "global": "packages/registry/src/styles/bambi.css" },
  "components": {
    "tabs": {
      "name": "tabs",
      "files": {
        "react": [
          "packages/registry/generated/tabs/react/index.tsx",
          "packages/registry/generated/tabs/react/tabs.css"
        ]
      },
      "exports": { "react": ["Tabs", "TabsList", "TabsTrigger", "TabsContent"] }
    }
  }
}
```

`registry.authoring.json` is internal and tracks contracts, controllers, adapter helpers, source wrappers, generated artifact paths, and generator metadata. Run `pnpm registry:refresh` after authoring changes. It calls `@bambiui/generator` framework dispatch to parse contracts, generate public framework artifacts from contract metadata, inline behavior from core controllers, copy CSS, and validate the manifests.

Schema is validated by `registry.schema.json`. Run `node scripts/check-registry.mjs` or `pnpm check-registry`.

## Canonical Component — Tabs

Tabs is the reference implementation for all DOM Protocol patterns:

- Contract: `packages/core/src/components/tabs/tabs.contract.ts`
- Controller: `packages/core/src/components/tabs/tabs.controller.ts`
- CSS: `packages/registry/src/styles/tabs.css`
- Internal React source: `packages/registry/src/components/tabs/react/`
- Public React artifacts: `packages/registry/generated/tabs/react/`

## CSS Delivery

- Global style file: `packages/registry/src/styles/bambi.css`. CLI writes this to `src/styles/bambi.css` on `init`.
- Component CSS source: `packages/registry/src/styles/<name>.css`. Generated public CSS is copied beside the public framework artifact.
- CSS is driven by `data-*` attribute state written by the controller.

## CLI Output Layout

`bambiui add tabs --framework react` copies files into:

```
src/components/ui/<name>/
  index.tsx
  tabs.css
```

No contract files, controller files, adapter helpers, primitives, generators, or `@bambiui/*` imports may appear in installed output.

## Supported Frameworks

`react`.

bambiui is currently focusing on React as the first canonical adapter target.
Vue, Svelte and Solid support are intentionally removed during the generic adapter migration and will be rebuilt later.

## apps/templates — Smoke Fixtures

`apps/templates` contains a real React project fixture for CLI end-to-end smoke testing. Not a public product surface. Currently: `bambi-react` (React/Next).

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
