# bambiui Agent Entry

bambiui is a pnpm + Turborepo monorepo for CLI-first, source-distributed UI components. Internal DOM Protocol contracts and controllers are generated into public, framework-ready artifacts. The CLI copies those artifacts into user projects.

Active flow: `core -> generator -> registry -> cli -> user project`

Supported output targets: React, Solid, Svelte 5, Vue 3.

## Navigate

```txt
packages/core       DOM Protocol contracts, controllers, primitives, tests
packages/generator  Internal parsers and framework artifact generators
packages/registry   Generated public artifacts and CSS
packages/cli        Published bambiui executable: init/add/copy
apps/templates      CLI smoke-test fixtures
apps/www            Minimal static host for registry assets
apps/_archived      Suspended docs/studio/old www; do not use as active references
```

Nested package rules:

- `packages/core/AGENTS.md`
- `packages/generator/AGENTS.md`
- `packages/registry/AGENTS.md`
- `packages/cli/AGENTS.md`

## Global Rules

- Tabs is the canonical reference component.
- Contracts/controllers live in `packages/core`; public generated artifacts live in `packages/registry/generated`.
- Component state and styling use serializable `data-*` attributes. Do not put callbacks, objects, or functions into `data-*`.
- Controllers are vanilla TypeScript and internal authoring inputs. Installed output must not copy or import contracts, controllers, primitives, generator code, or runtime `@bambiui/*` packages.
- Framework wrappers are generated output. Do not add independent component behavior to wrappers.
- Controlled mode: controllers fire `bambi:<event-name>` and do not mutate source state. Uncontrolled mode: controllers manage source state and fire events.
- `MutationObserver` is only for plain HTML/HTMX auto-mount paths, not framework prop sync.
- Public `registry.json` is version 2 and may reference only files safe for direct CLI copying.
- `registry.json.shared` is a single helper path, currently `packages/registry/generated/shared/bambi-helpers.ts`. Components declare helper usage per framework in `components.<name>.helpers.<framework>`.
- Do not add Astro output, per-component packages, runtime bambiui packages, or new active docs/studio apps without an explicit plan.

## Manifests

- `registry.authoring.json` is internal maintainer input: contracts, controllers, primitive files, styles, generated file targets, and generator metadata.
- `registry.json` is public CLI input: generated files, component CSS, exports, helper declarations, hashes, and global/shared style paths.
- Run `pnpm registry:refresh` after authoring changes. It regenerates public artifacts, validates helper declarations, refreshes hashes, and runs registry validation.

## Verification

| Change | Run |
| --- | --- |
| Docs only | `pnpm check-registry` |
| CLI only | `pnpm --filter bambiui check` |
| Core contracts/controllers/primitives/CSS | `pnpm registry:refresh && pnpm check` |
| Registry manifest/artifacts | `pnpm registry:refresh && pnpm check-registry` |
| Type-only workspace changes | `pnpm check-types` |
| Template install/compile behavior | `pnpm smoke:templates` or `pnpm check:full` |

## Coordination

- One agent at a time for `registry.json`, `registry.authoring.json`, `packages/core/src/dom/`, and this file.
- Keep write scope narrow and do not overwrite unrelated user changes.
