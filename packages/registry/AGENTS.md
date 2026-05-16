# bambiui Registry Agent Rules

## Responsibility

`packages/registry` holds generated public artifacts and CSS. Public artifacts are the only component files the CLI copies into user projects.

## What Lives Here

- Component CSS source: `src/styles/<name>.css`
- Global style file: `src/styles/bambi.css`
- Public generated artifacts: `generated/<name>/<framework>/` (react, solid, svelte, vue)
- Shared public helpers: `generated/shared/{react,solid,svelte,vue}/bambi-helpers.ts`
- Workspace barrels: `src/components/<name>/index.ts` (not installed)

## What Does NOT Live Here

- Contract files (`<name>.contract.ts`) — those live in `packages/core/src/components/<name>/`.
- Controller files (`<name>.controller.ts`) — those live in `packages/core/src/components/<name>/`.
- CLI logic or registry validation scripts.
- Contract, controller, internal primitive, or generator source files.

## Public Artifact Rules

- `registry.json` may reference only framework-ready generated files.
- Generated files must not import `@bambiui/core`, `@bambiui/generator`, `@bambiui/adapters`, contracts, controllers, internal primitives, or generator files.
- Generated files must be self-contained registry output safe for direct CLI copying.
- Tabs React installs as:
  - `src/components/ui/tabs/index.tsx`
  - `src/components/ui/tabs/tabs.css`
  - `src/components/ui/bambi-helpers.ts` (shared public helper, only when the component uses helpers)

## Internal Authoring Rules

- `registry.authoring.json` tracks contract, controller, style, generated artifact paths, and generator metadata.
- Run `pnpm registry:refresh` after changing authoring inputs. It calls `@bambiui/generator` framework dispatch to parse contracts, generate public framework artifacts from contract metadata, inline behavior from core controllers, copy CSS, and validate generated artifacts. The generator auto-detects which shared helpers the controller used.

## CSS Rules

- Component CSS source lives at `src/styles/<name>.css`.
- Generated public CSS lives beside the generated framework artifact.
- CSS uses `data-*` attribute selectors to express state.

## Supported Frameworks

`react`, `solid`, `svelte`, `vue`.

## Canonical Reference

Tabs is the reference component:

- Public artifacts: `generated/tabs/{react,solid,svelte,vue}/`
- CSS source: `src/styles/tabs.css`
- Shared helpers: `generated/shared/{react,solid,svelte,vue}/bambi-helpers.ts`

## Verify

```sh
pnpm registry:refresh
pnpm check-types
pnpm check-registry
pnpm check
```
