# bambiui Agent Entry

bambiui is a pnpm + Turborepo monorepo. The CLI distributes React source components into user projects using a DOM Protocol architecture. React is the only active framework target during the current migration.

## Navigate

```txt
packages/cli        bambiui init/add; fetches registry assets and writes user files
packages/core       DOM protocol interfaces, utilities, and workspace component implementations
packages/adapters   Generic framework adapter helpers; currently only React helpers are active
packages/registry   React wrapper templates; uses @bambiui/core as devDep for workspace typecheck only
apps/templates      Template project for CLI smoke tests (bambi-react only)
apps/www            Active minimal static host for bambiui and registry assets
apps/_archived/     docs, studio, old www — suspended during architecture reset
registry.json       v2 manifest consumed by CLI
```

Nested rules:

- `packages/cli/AGENTS.md`
- `packages/core/AGENTS.md`
- `packages/adapters/AGENTS.md`
- `packages/registry/AGENTS.md`

## Architecture Principles — DOM Protocol

- **HTML-first, CSS-first**: all component state is expressed via `data-*` attributes.
- **Vanilla TypeScript controllers**: all interactive behavior lives in the controller. No logic in framework wrappers.
- **Framework wrappers are thin bridges**: they translate props → DOM attributes/data, mount/destroy the controller, and call `controller.sync()` or `controller.update()` on prop changes. They do NOT implement behavior.
- **CustomEvents for callbacks**: wrappers listen to `bambi:<event-name>` events and forward to framework callbacks/emitters.
- **Controlled mode**: controller fires `bambi:<event-name>` only; does NOT mutate source state (`data-value`). Host framework is responsible for updating.
- **Uncontrolled mode**: controller manages source state directly.
- **MutationObserver**: only for plain HTML / HTMX auto-mount (`autoMount()` in `dom/mount.ts`). Never use MutationObserver for framework prop sync.
- **`data-*` standard**: only serializable, CSS-visible, inspect-friendly state/config. Never write callbacks, objects, or functions into `data-*`.
- **BambiController lifecycle**: every controller must implement `sync(): void` and `destroy(): void`. `update?(options?)` is optional but recommended for prop changes without full remount.

## Controller Lifecycle

```ts
interface BambiController {
  sync(): void;     // called once on mount; re-called on forced re-sync
  update?(): void;  // called when props change (no remount)
  destroy(): void;  // idempotent teardown — AbortController pattern recommended
}
```

## Controlled / Uncontrolled Pattern

```
controlled:   data-controlled="true"  →  controller fires event, does NOT write data-value
uncontrolled: (no data-controlled)    →  controller writes data-value and fires event
```

## CustomEvent Standard

- Event name: `bambi:<event-name>` (kebab-case, namespaced)
- Detail: plain serializable object only
- Example: `bambi:value-change` with `{ value, previousValue, source }`

## data-* Attribute Standard

- Role markers (structural): `data-bambi-<component>`, `data-bambi-<component>-<part>`
- Source state: `data-value`, `data-default-value`
- Config: `data-orientation`, `data-controlled`
- Visual state (written by controller): `data-state="active|inactive"`, `data-disabled="true"`

## Package Boundaries

- `packages/core` — workspace source of truth; imports allowed between core files. Controllers are **self-contained** (no `@bambiui/core` imports within the controller itself) so the CLI can copy them directly to user projects.
- `packages/adapters` — generic framework adapter helpers. Only React helpers (`react/`) are active. Adapter helper files are copied by the CLI into user projects; the installed output must not contain runtime `@bambiui/*` imports.
- `packages/registry` — React wrapper templates. Framework files import from `@bambiui/core/components/<name>` **for workspace type-checking only** (devDep). The CLI replaces these imports with local `./<name>.controller` references on install. Installed output has no `@bambiui/*` runtime imports.
- `packages/cli` — must NOT import `@bambiui/core` or `@bambiui/registry` at runtime. Treats registry.json as external input.
- Installed output — no `@bambiui/*` runtime imports. `contract` and `controller` files come from `packages/core`; adapter helpers come from `packages/adapters`; framework wrapper comes from `packages/registry`.

## Registry File Layout

Each component under `packages/registry/src/components/<name>/`:

```
<name>/
  react/              ← tabs.react.tsx  (only active framework)
  index.ts            ← workspace barrel (not installed)
```

Vue, Svelte, Solid, and HTML subdirectories are intentionally absent during the migration.

Framework files use `import { … } from "@bambiui/core/components/<name>"` for workspace typecheck. The CLI `flattenPackageImports` transform converts these to `"./<name>.controller"` in the installed output. Adapter helper imports (`@bambiui/adapters/react`) are similarly transformed to `"./create-react-adapter"`. This transform is generic — no per-component CLI update is required when adding new components.

## Golden References

- Tabs is the canonical reference component:
  - Contract + Controller (single source): `packages/core/src/components/tabs/`
  - Installable framework wrappers: `packages/registry/src/components/tabs/`
  - CSS: `packages/registry/src/styles/tabs.css`
- DOM protocol types: `packages/core/src/dom/`

## Forbidden

- Do NOT write component logic in framework wrappers.
- Do NOT use MutationObserver for framework state sync.
- Do NOT write callbacks, functions, or objects into `data-*` attributes.
- Do NOT import `@bambiui/core` or `@bambiui/registry` from installed component output.
- Do NOT create per-component packages or per-component build steps.
- Do NOT redesign registry v2 schema or package layout without updating check-registry.mjs and CLI.
- Do NOT add apps/docs or apps/studio (suspended — see apps/_archived/).
- Do NOT reactivate `apps/_archived/www` (old marketing site — archived).
- Do NOT reference "button canonical" — tabs is the new reference.
- Do NOT add Astro framework wrapper until explicitly planned.
- Do NOT put controller/contract files in `packages/registry` — they live in `packages/core` and are sourced from there by the CLI.
- Do NOT add non-React adapters to `packages/adapters` without an explicit plan.

## Suspended / Archived

`apps/_archived/` contains suspended and archived apps. They are **not active workspace targets** and must not be used as architecture references.

- `apps/_archived/docs` — Starlight documentation (suspended)
- `apps/_archived/studio` — component playground (suspended)
- `apps/_archived/www` — old marketing/landing site (archived; replaced by `apps/www`)

Archived AGENTS.md files under `apps/_archived/` carry a top-level warning. Do not follow instructions in those files for active development.

## Distribution Model

The CLI distributes **source files**, not compiled or bundled output.

- **Why source**: easier to debug, preserves TypeScript types, no toolchain imposed on user projects, avoids import resolution mismatches.
- **Why not compile at install time**: adds a compiler dependency to the CLI, complicates error reporting, and provides little benefit for the current scale.
- **Future option**: a `bundled` output mode could be produced as a build artifact by a registry build step — outside the CLI's responsibility. If this is ever needed, it belongs in a `registry build` pipeline, not in `bambiui add`.

Possible future modes: `source` (current), `bundled` (pre-built artifact, not yet implemented).

## Primitive Files

Controllers may import implemented shared primitives from `@bambiui/core/primitives/<name>` in the workspace. New workspace source should use extensionless package specifiers such as `@bambiui/core/primitives/roving-focus`; the CLI also tolerates a `.js` suffix when rewriting installed output. The CLI's `flattenPackageImports` transform rewrites these to `./primitives/<name>` in the installed output, and copies the primitive source files into a `primitives/` subdirectory inside the component's implementation directory.

**Primitive dependency chain**: `primitiveFiles` does NOT automatically resolve transitive dependencies. If a primitive imports from another local primitive or helper file, that file must also be listed explicitly in the component's `primitiveFiles` array. Automatic dependency graph resolution may be added in a later iteration if needed.

To declare which primitive files a component needs, add `primitiveFiles` to its registry entry:

```json
"primitiveFiles": ["packages/core/src/primitives/roving-focus.ts"]
```

The installed layout becomes:
```
src/components/ui/<name>/
  component/
    <name>.contract.ts
    <name>.controller.ts
    primitives/
      roving-focus.ts   ← copied here; import rewritten to ./primitives/roving-focus
```

## Active Static Host

- `apps/www` — minimal static host for bambiui and registry assets. Built via `pnpm build:static`. Not the old marketing site.

## Common Commands

```sh
pnpm install
pnpm check                              # types + registry + CLI smoke
pnpm check-types                        # turbo: core + registry + cli TypeScript
pnpm check-registry                     # validate registry.json v2 schema
pnpm --filter bambiui smoke             # CLI smoke: react
pnpm smoke:templates                    # template smoke (requires node_modules in templates)
pnpm smoke:templates -- --install       # same, runs npm ci first
pnpm build:static                       # build apps/www and inject registry files into dist
```

## Verification Matrix

| Change                                           | Run                              |
| ------------------------------------------------ | -------------------------------- |
| controller / contract / CSS / wrappers           | `pnpm check`                     |
| CLI only                                         | `pnpm --filter bambiui check`    |
| registry only                                    | `pnpm check-registry`            |
| core types only                                  | `pnpm check-types`               |
| template projects (end-to-end install + compile) | `pnpm smoke:templates`           |

## Add A Component

1. Define DOM contract in `packages/core/src/components/<name>/<name>.contract.ts`.
2. Implement a **self-contained** controller in `packages/core/src/components/<name>/<name>.controller.ts`:
   - Inline `BambiController`, types, and DOM helpers (`getAttr`, `setAttr`, `getBoolAttr`, event dispatch).
   - Allowed imports: `./<name>.contract.js` (sibling) and extensionless `@bambiui/core/primitives/<name>` package imports (shared primitives — CLI rewrites to `./primitives/<name>` on install). No other `@bambiui/*` imports.
   - Re-export types that framework wrappers need (e.g. `export type { TabsValueChangeDetail } from "./<name>.contract.js"`).
   - If the controller uses a primitive, declare it in `registry.json` under `primitiveFiles`.
3. Add React wrapper under `packages/registry/src/components/<name>/react/`:
   - Framework files import from `@bambiui/core/components/<name>` (workspace devDep, typecheck only).
   - CSS goes at `packages/registry/src/styles/<name>.css`.
   - Add a workspace barrel at `packages/registry/src/components/<name>/index.ts`.
   - **SSR**: React adapter code is server-safe — no DOM APIs run during render (all mutations are in `useEffect`). Do NOT add `"use client"` to library files; it is the consumer's responsibility in RSC environments (e.g. Next.js App Router).
4. Register in `registry.json` (v2 format):
   - `contract` and `controller` → `packages/core/src/components/<name>/…`
   - `contractFiles` → shared contract helper files from `packages/core/contract/`
   - `adapter.react` → React adapter helper files from `packages/adapters/react/`
   - `adapters.react` → `{ status: "active", mode: "generic" }`
   - `style` → `packages/registry/src/styles/<name>.css`
   - `files.react` → `packages/registry/src/components/<name>/react/…`
   - `exports.react` → list of exported component names
5. Run `pnpm check-registry` and `pnpm check-types`.
   - No CLI changes needed: `flattenPackageImports` is generic and handles all component imports automatically.

## Multi-Agent Coordination

- One agent at a time for: `registry.json`, `packages/core/src/dom/`, `AGENTS.md`.
- Narrow write scope — do not overwrite changes you did not make.
