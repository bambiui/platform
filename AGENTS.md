# bambiui Agent Entry

bambiui is a pnpm + Turborepo monorepo. The CLI distributes public, framework-ready React component artifacts into user projects. DOM Protocol contract/controller/adapter files remain internal authoring inputs. React is the only active framework target during the current migration.

## Navigate

```txt
packages/cli        bambiui init/add; fetches registry assets and writes user files
packages/core       DOM protocol interfaces, utilities, and workspace component implementations
packages/adapters   Generic framework adapter helpers; currently only React helpers are active
packages/registry   Internal React wrapper templates plus generated public artifacts
packages/generator  Internal contract parsers and framework artifact generators
apps/templates      Template project for CLI smoke tests (bambi-react only)
apps/www            Active minimal static host for bambiui and registry assets
apps/_archived/     docs, studio, old www — suspended during architecture reset
registry.json       v2 public manifest consumed by CLI
registry.authoring.json internal source manifest for maintainers
```

Nested rules:

- `packages/cli/AGENTS.md`
- `packages/core/AGENTS.md`
- `packages/adapters/AGENTS.md`
- `packages/generator/AGENTS.md`
- `packages/registry/AGENTS.md`

## Architecture Principles — DOM Protocol

- **HTML-first, CSS-first**: all component state is expressed via `data-*` attributes.
- **Vanilla TypeScript controllers**: controllers remain the internal DOM Protocol source of truth.
- **Generated public artifacts**: user-installed React files are framework-ready and self-contained. They do not import or copy contract, controller, adapter helper, or generator files.
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

- `packages/core` — workspace source of truth; imports allowed between core files. Controllers are internal authoring/build-time inputs and are not copied by `bambiui add`.
- `packages/adapters` — generic framework adapter helpers. Only React helpers (`react/`) are active. Adapter helpers are internal authoring/build-time inputs and are not copied by `bambiui add`.
- `packages/generator` — private internal parsers/generators used by maintainer scripts. The CLI and generated output must not depend on it.
- `packages/registry` — internal React wrapper templates and generated public artifacts. `packages/registry/generated/<name>/<framework>/` is the only component artifact source public `registry.json` may reference.
- `packages/cli` — must NOT import `@bambiui/core` or `@bambiui/registry` at runtime. Treats registry.json as external input.
- Installed output — no `@bambiui/*` runtime imports and no internal contract/controller/adapter helper files.

## Registry File Layout

Each component under `packages/registry/src/components/<name>/`:

```
<name>/
  react/              ← tabs.react.tsx  (only active framework)
  index.ts            ← workspace barrel (not installed)
```

Public generated artifacts live under:

```txt
packages/registry/generated/<name>/<framework>/
  index.tsx
  <name>.css
```

Vue, Svelte, Solid, and HTML subdirectories are intentionally absent during the migration.

Internal framework source may use `@bambiui/core` and `@bambiui/adapters` for workspace typecheck. Public generated artifacts must not. The CLI copies only the paths listed in public `registry.json` and does not run the internal contract/controller/adapter pipeline.

## Golden References

- Tabs is the canonical reference component:
  - Contract + Controller (single source): `packages/core/src/components/tabs/`
  - Internal React source: `packages/registry/src/components/tabs/`
  - Public React artifacts: `packages/registry/generated/tabs/react/`
  - CSS source: `packages/registry/src/styles/tabs.css`
- DOM protocol types: `packages/core/src/dom/`

## Forbidden

- Do NOT write component logic in framework wrappers.
- Do NOT use MutationObserver for framework state sync.
- Do NOT write callbacks, functions, or objects into `data-*` attributes.
- Do NOT import `@bambiui/core` or `@bambiui/registry` from installed component output.
- Do NOT copy contract, controller, adapter helper, or generator files into user projects.
- Do NOT create per-component packages or per-component build steps.
- Do NOT redesign registry v2 schema or package layout without updating check-registry.mjs and CLI.
- Do NOT add apps/docs or apps/studio (suspended — see apps/_archived/).
- Do NOT reactivate `apps/_archived/www` (old marketing site — archived).
- Do NOT reference "button canonical" — tabs is the new reference.
- Do NOT add Astro framework wrapper until explicitly planned.
- Do NOT put controller/contract files in `packages/registry` — they live in `packages/core` and are sourced by internal generation only.
- Do NOT add non-React adapters to `packages/adapters` without an explicit plan.

## Suspended / Archived

`apps/_archived/` contains suspended and archived apps. They are **not active workspace targets** and must not be used as architecture references.

- `apps/_archived/docs` — Starlight documentation (suspended)
- `apps/_archived/studio` — component playground (suspended)
- `apps/_archived/www` — old marketing/landing site (archived; replaced by `apps/www`)

Archived AGENTS.md files under `apps/_archived/` carry a top-level warning. Do not follow instructions in those files for active development.

## Distribution Model

The CLI distributes **framework-ready public source artifacts**, not internal authoring files.

- Public `registry.json` describes only files safe to copy directly into a user project.
- Internal `registry.authoring.json` describes contracts, controllers, adapters, primitives, and source inputs for maintainers.
- Run `pnpm registry:refresh` after authoring changes. It uses `@bambiui/generator` framework dispatch to parse contracts, generate public framework artifacts from contract metadata plus core controller behavior, copy CSS, and validate public/internal registry separation.

## Primitive Files

Controllers may import implemented shared primitives from `@bambiui/core/primitives/<name>` in the workspace. Primitive source files are internal authoring inputs and belong in `registry.authoring.json`, not public `registry.json`.

Public generated artifacts must inline or otherwise own any runtime behavior they need without exposing primitive files to the user project.

## Active Static Host

- `apps/www` — minimal static host for bambiui and registry assets. Built via `pnpm build:static`. Not the old marketing site.

## Common Commands

```sh
pnpm install
pnpm check                              # registry refresh + types + registry + CLI smoke
pnpm check-types                        # turbo: core + registry + cli TypeScript
pnpm check-registry                     # validate registry.json v2 schema
pnpm registry:refresh                   # generate/validate public registry artifacts
pnpm --filter bambiui smoke             # CLI smoke: react
pnpm smoke:templates                    # template smoke (requires node_modules in templates)
pnpm smoke:templates -- --install       # same, runs npm ci first
pnpm build:static                       # build apps/www and inject registry files into dist
```

## Verification Matrix

| Change                                           | Run                              |
| ------------------------------------------------ | -------------------------------- |
| controller / contract / CSS / wrappers           | `pnpm registry:refresh && pnpm check` |
| CLI only                                         | `pnpm --filter bambiui check`    |
| registry only                                    | `pnpm registry:refresh && pnpm check-registry` |
| core types only                                  | `pnpm check-types`               |
| template projects (end-to-end install + compile) | `pnpm smoke:templates`           |

## Add A Component

1. Define DOM contract in `packages/core/src/components/<name>/<name>.contract.ts`.
2. Implement a **self-contained** controller in `packages/core/src/components/<name>/<name>.controller.ts`:
   - Inline `BambiController`, types, and DOM helpers (`getAttr`, `setAttr`, `getBoolAttr`, event dispatch).
  - Allowed imports: `./<name>.contract.js` (sibling) and extensionless `@bambiui/core/primitives/<name>` package imports. No other `@bambiui/*` imports.
   - Re-export types that framework wrappers need (e.g. `export type { TabsValueChangeDetail } from "./<name>.contract.js"`).
  - If the controller uses a primitive, declare it in `registry.authoring.json` under `primitiveFiles`.
3. Add React wrapper under `packages/registry/src/components/<name>/react/`:
   - Framework files import from `@bambiui/core/components/<name>` (workspace devDep, typecheck only).
   - CSS goes at `packages/registry/src/styles/<name>.css`.
   - Add a workspace barrel at `packages/registry/src/components/<name>/index.ts`.
   - **SSR**: React adapter code is server-safe — no DOM APIs run during render (all mutations are in `useEffect`). Do NOT add `"use client"` to library files; it is the consumer's responsibility in RSC environments (e.g. Next.js App Router).
4. Register authoring inputs in `registry.authoring.json`:
   - `contract`, `controller`, `contractFiles`, optional `primitiveFiles`
   - `adapter.react` and `sourceFiles.react`
   - `generatedFiles.react` target paths under `packages/registry/generated/<name>/react/`
   - `generator.<framework>` metadata for framework-specific public API rules, such as which parts expose a value or disabled prop.
5. Generate or update public artifacts under `packages/registry/generated/<name>/<framework>/`. For Tabs React, `pnpm registry:refresh` parses `tabs.contract.ts`, inlines behavior from `tabs.controller.ts`, emits React parts from contract metadata, applies `generator.react` metadata, and copies `tabs.css` from `packages/registry/src/styles/tabs.css`.
6. Register only public artifact files in `registry.json` (v2 format):
   - `files.react` → generated `index.tsx`, `<name>.css` artifacts
   - `exports.react` → list of exported component names
7. Run `pnpm registry:refresh`, `pnpm check-registry`, and `pnpm check-types`.

## Multi-Agent Coordination

- One agent at a time for: `registry.json`, `packages/core/src/dom/`, `AGENTS.md`.
- Narrow write scope — do not overwrite changes you did not make.
