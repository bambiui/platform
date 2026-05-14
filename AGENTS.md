# bambiui Agent Entry

bambiui is a pnpm + Turborepo monorepo. CLI distributes source components for React, Svelte, Vue, Solid, and plain HTML into user projects using a DOM Protocol architecture.

## Navigate

```txt
packages/cli        bambiui init/add; fetches registry assets and writes user files
packages/core       DOM protocol interfaces, utilities, and workspace component implementations
packages/registry   CLI-installable source templates (self-contained, no @bambiui/* runtime deps)
packages/tokens     (suspended — contents moved to packages/registry/src/styles/bambi.css)
apps/templates      Template projects for CLI smoke tests
apps/_archived/     docs, studio, www — suspended during architecture reset
registry.json       v2 manifest consumed by CLI
```

Nested rules:

- `packages/cli/AGENTS.md`
- `packages/core/AGENTS.md` (if present)

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

- `packages/core` — workspace source of truth; imports allowed between core files.
- `packages/registry` — self-contained installable templates; must NOT import from `@bambiui/core` at runtime. Types/helpers are inlined.
- `packages/cli` — must NOT import `@bambiui/core` or `@bambiui/registry` at runtime. Treats registry.json as external input.
- Installed output — no `@bambiui/*` runtime imports. CLI output is self-contained.

## Golden References

- Tabs is the canonical reference component:
  - Controller: `packages/core/src/components/tabs/tabs.controller.ts`
  - Installable: `packages/registry/src/components/tabs/`
  - CSS: `packages/registry/src/components/tabs/core/tabs.css`
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

## Suspended

- `apps/_archived/docs` — Starlight documentation (suspended)
- `apps/_archived/studio` — component playground (suspended)
- `apps/_archived/www` — marketing/landing site (suspended)
- Deployment / `deploy-static` — no production site build target currently

## Common Commands

```sh
pnpm install
pnpm check
pnpm check-types
pnpm check-registry
pnpm --filter bambiui smoke
pnpm --filter bambiui dev  (not applicable — CLI has no dev mode)
```

## Verification Matrix

| Change                                    | Run                           |
| ----------------------------------------- | ----------------------------- |
| controller / contract / CSS / wrappers    | `pnpm check`                  |
| CLI only                                  | `pnpm --filter bambiui check` |
| registry only                             | `pnpm check-registry`         |
| core types only                           | `pnpm check-types`            |

## Add A Component

1. Define DOM contract in `packages/core/src/components/<name>/<name>.contract.ts`.
2. Implement controller in `packages/core/src/components/<name>/<name>.controller.ts`.
3. Add self-contained installable versions under `packages/registry/src/components/<name>/`.
4. Register in `registry.json` (v2 format).
5. Run `pnpm check-registry` and `pnpm check-types`.

## Multi-Agent Coordination

- One agent at a time for: `registry.json`, `packages/core/src/dom/`, `AGENTS.md`.
- Narrow write scope — do not overwrite changes you did not make.
