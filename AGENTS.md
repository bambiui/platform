# bambiui Agent Entry

bambiui is a pnpm + Turborepo monorepo. CLI distributes source components for React, Svelte, Vue, Solid, and plain HTML into user projects using a DOM Protocol architecture.

## Navigate

```txt
packages/cli        bambiui init/add; fetches registry assets and writes user files
packages/core       DOM protocol interfaces, utilities, and workspace component implementations
packages/registry   Framework wrapper templates; uses @bambiui/core as devDep for workspace typecheck only
apps/templates      Template projects for CLI smoke tests (bambi-next, bambi-svelte, bambi-vue)
apps/_archived/     docs, studio, www — suspended during architecture reset
registry.json       v2 manifest consumed by CLI
```

Nested rules:

- `packages/cli/AGENTS.md`
- `packages/core/AGENTS.md`
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
- `packages/registry` — framework wrapper templates. Framework files import from `@bambiui/core/components/<name>` **for workspace type-checking only** (devDep). The CLI replaces these imports with local `./<name>.controller` references on install. Installed output has no `@bambiui/*` runtime imports.
- `packages/cli` — must NOT import `@bambiui/core` or `@bambiui/registry` at runtime. Treats registry.json as external input.
- Installed output — no `@bambiui/*` runtime imports. `contract` and `controller` files come from `packages/core`; framework wrapper comes from `packages/registry`.

## Registry File Layout

Each component under `packages/registry/src/components/<name>/`:

```
<name>/
  core/               ← (absent) contract + controller live in packages/core
  react/              ← tabs.react.tsx
  vue/                ← tabs.vue, tabs-list.vue, tabs-trigger.vue, tabs-content.vue
  svelte/             ← tabs.svelte, tabs-list.svelte, tabs-trigger.svelte, tabs-content.svelte
  solid/              ← tabs.solid.tsx
  html/               ← tabs.html.ts
  index.ts            ← workspace barrel (not installed)
```

Framework files use `import { … } from "@bambiui/core/components/<name>"` for workspace typecheck. The CLI `flattenImports` transform converts these to `"./tabs.controller"` in the installed output.

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
- Do NOT add apps/docs, apps/studio, apps/www, or deployment workflows (suspended — see apps/_archived/).
- Do NOT reference "button canonical" — tabs is the new reference.
- Do NOT add Astro framework wrapper until explicitly planned.
- Do NOT put controller/contract files in `packages/registry` — they live in `packages/core` and are sourced from there by the CLI.

## Suspended

- `apps/_archived/docs` — Starlight documentation (suspended)
- `apps/_archived/studio` — component playground (suspended)
- `apps/_archived/www` — marketing/landing site (suspended)
- Deployment / `deploy-static` — no production site build target currently

## Common Commands

```sh
pnpm install
pnpm check                              # types + registry + CLI smoke
pnpm check-types                        # turbo: core + registry + cli TypeScript
pnpm check-registry                     # validate registry.json v2 schema
pnpm --filter bambiui smoke             # CLI smoke: all 5 frameworks
pnpm smoke:templates                    # template smoke (requires node_modules in templates)
pnpm smoke:templates -- --install       # same, runs npm ci first
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
   - Import only from `./<name>.contract.js` (sibling) — no other `@bambiui/*` imports.
   - Re-export types that framework wrappers need (e.g. `export type { TabsValueChangeDetail } from "./<name>.contract.js"`).
3. Add framework wrappers under `packages/registry/src/components/<name>/`:
   - Use subdirs: `react/`, `vue/`, `svelte/`, `solid/`, `html/`.
   - Framework files import from `@bambiui/core/components/<name>` (workspace devDep, typecheck only).
   - CSS goes at `packages/registry/src/styles/<name>.css`.
   - Add a workspace barrel at `packages/registry/src/components/<name>/index.ts`.
4. Register in `registry.json` (v2 format):
   - `contract` and `controller` → `packages/core/src/components/<name>/…`
   - `style` → `packages/registry/src/components/<name>/<name>.css`
   - `files.<framework>` → `packages/registry/src/components/<name>/<framework>/…`
5. Update CLI `add.js` `flattenImports` transform to handle `@bambiui/core/components/<name>` → `"./<name>.controller"`.
6. Run `pnpm check-registry` and `pnpm check-types`.

## Multi-Agent Coordination

- One agent at a time for: `registry.json`, `packages/core/src/dom/`, `AGENTS.md`.
- Narrow write scope — do not overwrite changes you did not make.
