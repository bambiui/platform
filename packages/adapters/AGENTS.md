# bambiui Adapters Agent Rules

## Responsibility

`packages/adapters` owns generic framework adapter helpers for bambiui DOM Protocol authoring. These helpers are internal build-time/source inputs; they are not copied into user projects by `bambiui add`.

## Current Status

Only React adapter helpers are active. Vue, Svelte, Solid, and other framework adapters are not present and must not be added without an explicit plan.

## What Lives Here

- `react/use-bambi-controller.ts` — React hook that mounts and syncs a BambiController to a DOM ref.
- `react/create-react-part.tsx` — factory for typed React part components.
- `react/create-react-adapter.ts` — top-level factory combining controller + contract + parts.
- `react/index.ts` — workspace barrel export.

## How This Package Is Used

Authoring code may use these helpers to produce or typecheck internal wrappers. Public generated artifacts under `packages/registry/generated/` must not import `@bambiui/adapters` and must not require these helper files to be installed into user projects.

## Boundaries

- This package is `private: true`. It is a workspace utility, not a published package.
- It may import `@bambiui/core` as a devDep for workspace type-checking only.
- Do NOT add adapters for Vue, Svelte, Solid, or other frameworks here without an explicit architecture decision.

## Forbidden

- Do NOT publish this package.
- Do NOT add non-React adapter files.
- Do NOT import `@bambiui/adapters` from controller files.
- Do NOT make public generated artifacts depend on these helper files.

## Verify

```sh
pnpm --filter @bambiui/adapters check-types
```
