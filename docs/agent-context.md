# bambiui — Detailed Agent Context

This is the long-form reference for agents. `AGENTS.md` is the quick source of truth for commands, verification, no-go rules, component standards, registry entry shape, and commit rules. Read this file when the current task needs deeper architecture details.

> **Legacy context**: an older version of this file described `apps/docs`, `apps/studio`, `apps/www`, `packages/tokens`, `packages/components/button`, Button API conventions, and a Cloudflare Pages deploy flow. All of that has been superseded by the DOM Protocol architecture below. Those apps and packages no longer exist at their prior paths (see `apps/_archived/`).

## Architecture — DOM Protocol

bambiui is a CLI-first, React-focused source distribution UI kit built on the DOM Protocol while the contract-driven generic adapter architecture is stabilized.

```txt
packages/cli        bambiui init/add; fetches registry assets and writes user files
packages/core       DOM protocol interfaces, utilities, and workspace component implementations
packages/registry   React wrapper templates; uses @bambiui/core as devDep for workspace typecheck only
apps/templates      Template project for CLI smoke tests (bambi-react)
apps/_archived/     docs, studio, www — suspended during architecture reset
registry.json       v2 manifest consumed by CLI
```

### Core Principles

- **HTML-first, CSS-first**: all component state is expressed via `data-*` attributes.
- **Vanilla TypeScript controllers**: all interactive behavior lives in the controller (`packages/core`). Framework wrappers implement no behavior.
- **React wrapper is a thin bridge**: it translates props → DOM attributes, mounts/destroys the controller, and calls `controller.sync()` or `controller.update()` on prop changes.
- **CustomEvents**: wrappers listen to `bambi:<event-name>` events and forward to framework callbacks/emitters.
- **Controlled/uncontrolled**: `data-controlled="true"` → controller fires event only. Without it, controller writes `data-value` and fires event.
- **Self-contained installed output**: generated user files have no `@bambiui/*` runtime imports.

## Package Boundaries

- `packages/core` — DOM Protocol source of truth. Contract + controller live here. Controllers must be self-contained (no `@bambiui/*` imports in the controller itself).
- `packages/registry` — React wrapper templates. Import `@bambiui/core/components/<name>` for workspace typecheck only (devDep). CLI replaces these with local `"./<name>.controller"` on install.
- `packages/cli` — must NOT import `@bambiui/core` or `@bambiui/registry` at runtime. Treats `registry.json` as external input.
- Installed output — no `@bambiui/*` runtime imports.

## Registry v2 Format

```json
{
  "version": 2,
  "styles": { "global": "packages/registry/src/styles/bambi.css" },
  "components": {
    "tabs": {
      "name": "tabs",
      "contract": "packages/core/src/components/tabs/tabs.contract.ts",
      "controller": "packages/core/src/components/tabs/tabs.controller.ts",
      "style": "packages/registry/src/styles/tabs.css",
      "files": {
        "react": ["..."]
      }
    }
  }
}
```

Schema is validated by `registry.schema.json`. Run `node scripts/check-registry.mjs` or `pnpm check-registry`.

## Canonical Component — Tabs

Tabs is the reference implementation for all DOM Protocol patterns:

- Contract: `packages/core/src/components/tabs/tabs.contract.ts`
- Controller: `packages/core/src/components/tabs/tabs.controller.ts`
- CSS: `packages/registry/src/styles/tabs.css`
- React wrapper: `packages/registry/src/components/tabs/react/`

## CSS Delivery

- Global style file: `packages/registry/src/styles/bambi.css`. CLI writes this to `src/styles/bambi.css` on `init`.
- Component CSS: `packages/registry/src/styles/<name>.css`. CLI writes this to `src/components/ui/<name>/component/<name>.css`.
- CSS is driven by `data-*` attribute state written by the controller.

## Supported Frameworks

`react`.

bambiui is currently focusing on React as the first canonical adapter target.
Vue, Svelte and Solid support are intentionally removed during the generic adapter migration and will be rebuilt later.

## apps/templates — Smoke Fixtures

`apps/templates` contains a real React project fixture for CLI end-to-end smoke testing. Not a public product surface. Currently: `bambi-react` (React/Next).

## Suspended

- `apps/_archived/docs` — Starlight documentation
- `apps/_archived/studio` — component playground
- `apps/_archived/www` — marketing site
- Deployment / static site build — no active production deploy target

Do not add `apps/docs`, `apps/studio`, or `apps/www` back. Do not re-introduce deployment workflows without an explicit architecture decision.

## CLI Registry URL

- Default: `https://bambiui.com` (hosted, when active).
- Override: `--registry-url <path>` or `BAMBIUI_REGISTRY_URL` env var. Points to local repo root or preview registry for development.
