# bambiui Registry Agent Rules

`packages/registry` holds generated public artifacts and CSS. Files referenced by public `registry.json` are the only component artifacts the CLI may copy into user projects.

## What Lives Here

- Global CSS source: `src/styles/bambi.css`
- Component CSS source: `src/styles/<name>.css`
- Generated component artifacts: `generated/<name>/<framework>/`
- Generated component CSS: `generated/<name>/<name>.css`
- Single shared public helper file: `generated/shared/bambi-helpers.ts`
- Workspace-only component barrels under `src/components/`

## What Does Not Live Here

- Contracts and controllers; they live in `packages/core/src/components/<name>/`.
- Internal primitive source; it lives in `packages/core/src/primitives/`.
- Generator, CLI, or registry validation logic.

## Public Artifact Rules

- Public artifacts must be framework-ready and safe for direct CLI copying.
- Public artifacts must not import `@bambiui/core`, `@bambiui/generator`, `@bambiui/adapters`, contracts, controllers, internal primitives, or generator files.
- `registry.json.shared` points to the single helper file. Component helper usage remains per framework under `components.<name>.helpers.<framework>`.
- CSS state should be expressed with `data-*` selectors.

## References

- Canonical generated component: `generated/tabs/{react,solid,svelte,vue}/`
- Canonical CSS source: `src/styles/tabs.css`
- Shared helper: `generated/shared/bambi-helpers.ts`

## Verify

```sh
pnpm registry:refresh
pnpm check-registry
pnpm --filter @bambiui/registry check-types
```
