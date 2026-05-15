# bambiui Registry Agent Rules

## Responsibility

`packages/registry` holds React wrapper templates during the generic adapter migration. It is the source of the installable component files that the CLI copies into user projects.

## What Lives Here

- React wrappers: `src/components/<name>/react/`
- Component CSS: `src/styles/<name>.css`
- Global style file: `src/styles/bambi.css`
- Workspace barrels: `src/components/<name>/index.ts` (not installed — workspace only)

## What Does NOT Live Here

- Contract files (`<name>.contract.ts`) — those live in `packages/core/src/components/<name>/`.
- Controller files (`<name>.controller.ts`) — those live in `packages/core/src/components/<name>/`.
- CLI logic, registry schema validation, or deployment scripts.

## Framework Wrapper Rules

- Wrappers translate props → DOM attributes, mount/destroy the controller, and call `controller.sync()` or `controller.update()` on prop changes.
- Wrappers must NOT implement component behavior. All behavior lives in the controller.
- Wrappers import from `@bambiui/core/components/<name>` **for workspace type-checking only**. This is a devDep that is NOT present in user projects.
- During `bambiui add`, the CLI's `flattenImports` transform rewrites these imports to local `./<name>.controller` references. The installed output has no `@bambiui/*` imports.

## CSS Rules

- Component CSS lives at `src/styles/<name>.css`, not inside the component subdirectory.
- CSS uses `data-*` attribute selectors to express state — no JS-injected class names.

## Supported Frameworks

`react`.

bambiui is currently focusing on React as the first canonical adapter target. Vue, Svelte and Solid support are intentionally removed during the generic adapter migration and will be rebuilt later.

## Workspace Barrel

`src/components/<name>/index.ts` is a workspace-only barrel for local development. It is NOT installed into user projects.

## Canonical Reference

Tabs is the reference component:

- Wrappers: `src/components/tabs/react/`
- CSS: `src/styles/tabs.css`

## Verify

```sh
pnpm check-types         # workspace typecheck for registry wrappers
pnpm check-registry      # validate registry.json against schema
pnpm check               # full suite including CLI smoke
```
