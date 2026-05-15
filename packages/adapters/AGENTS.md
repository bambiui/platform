# bambiui Adapters Agent Rules

## Responsibility

`packages/adapters` owns generic framework adapter helpers for bambiui DOM Protocol components. These helpers are installed into user projects by the CLI alongside the controller and framework wrapper.

## Current Status

Only React adapter helpers are active. Vue, Svelte, Solid, and other framework adapters are not present and must not be added without an explicit plan.

## What Lives Here

- `react/use-bambi-controller.ts` — React hook that mounts and syncs a BambiController to a DOM ref.
- `react/create-react-part.tsx` — factory for typed React part components (Root, List, Trigger, Content, etc.) wired to DOM attributes.
- `react/create-react-adapter.ts` — top-level factory; combines controller + contract + parts into a full React adapter.
- `react/index.ts` — workspace barrel export. Used by `packages/registry` as a devDep for workspace type-checking only.

## How the CLI Uses This Package

The CLI copies these files directly into the user project under `src/components/ui/<name>/component/`. After copying, no `@bambiui/adapters/react` import exists in the output — the CLI's `flattenPackageImports` transform rewrites those to `"./create-react-adapter"`.

**Installed output must contain no `@bambiui/*` runtime imports.**

## Type Limitation

`create-react-part.tsx` currently types every generated part as `HTMLElement` plus broad HTML attributes. This is acceptable for the generic adapter baseline, including kebab-case part names converted to PascalCase by `create-react-adapter.ts`, but it is not the final typing model.

Future per-part element typing should derive props from `BambiPartDefinition.element` so `button` parts receive button attributes, `input` parts receive input attributes, and `div` parts remain generic. Do this as an adapter type-system extension, not as component-specific wrapper logic.

## Package Boundaries

- This package is `private: true`. It is a workspace utility, not a published package.
- It may import `@bambiui/core` as a devDep for workspace type-checking only.
- No framework adapter files should import from `@bambiui/adapters` itself at runtime — the CLI copies files individually.
- Do NOT add adapters for Vue, Svelte, Solid, or other frameworks here without an explicit architecture decision.

## Forbidden

- Do NOT publish this package.
- Do NOT add non-React adapter files.
- Do NOT import `@bambiui/adapters` from controller files — controllers must be self-contained.
- Do NOT create runtime dependencies on `@bambiui/core` in these helper files (devDep for types only).

## Verify

```sh
pnpm --filter @bambiui/adapters check-types
```

If adapter files change, also run `pnpm --filter bambiui smoke` to confirm installed output has no `@bambiui/*` imports.
