# bambiui Registry Agent Rules

## Responsibility

`packages/registry` holds internal React wrapper templates and generated public artifacts. Public artifacts are the only component files the CLI copies into user projects.

## What Lives Here

- Internal React wrappers: `src/components/<name>/react/`
- Component CSS source: `src/styles/<name>.css`
- Global style file: `src/styles/bambi.css`
- Public generated artifacts: `generated/<name>/<framework>/`
- Workspace barrels: `src/components/<name>/index.ts` (not installed)

## What Does NOT Live Here

- Contract files (`<name>.contract.ts`) — those live in `packages/core/src/components/<name>/`.
- Controller files (`<name>.controller.ts`) — those live in `packages/core/src/components/<name>/`.
- CLI logic or registry validation scripts.

## Public Artifact Rules

- `registry.json` may reference only framework-ready generated files.
- Generated files must not import `@bambiui/core`, `@bambiui/adapters`, contracts, controllers, or adapter helpers.
- Tabs React currently installs as:
  - `index.tsx`
  - `tabs.css`

## Internal Authoring Rules

- `registry.authoring.json` tracks contract, controller, adapter, source wrapper, style, and generated artifact paths.
- Run `pnpm registry:refresh` after changing authoring inputs or generated artifacts.
- Internal wrappers may import from `@bambiui/core/components/<name>` and `@bambiui/adapters/react` for workspace type-checking only.

## CSS Rules

- Component CSS source lives at `src/styles/<name>.css`.
- Generated public CSS lives beside the generated framework artifact.
- CSS uses `data-*` attribute selectors to express state.

## Supported Frameworks

`react`.

bambiui is currently focusing on React as the first canonical adapter target. Vue, Svelte and Solid support are intentionally removed during the generic adapter migration and will be rebuilt later.

## Canonical Reference

Tabs is the reference component:

- Internal source: `src/components/tabs/react/`
- Public artifacts: `generated/tabs/react/`
- CSS source: `src/styles/tabs.css`

## Verify

```sh
pnpm registry:refresh
pnpm check-types
pnpm check-registry
pnpm check
```
