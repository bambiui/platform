# bambiui Generator Agent Rules

`packages/generator` is private maintainer tooling. It parses internal DOM Protocol contracts and emits deterministic public artifacts for React, Solid, Svelte 5, and Vue 3.

## Responsibilities

- Parse component contracts and generator metadata from authoring inputs.
- Inline controller behavior and declared primitive source into framework output.
- Generate framework wrapper source from contract metadata, not hand-authored wrapper behavior.
- Return detected shared helper usage so `registry:refresh` can validate `registry.json` helper declarations.

## Boundaries

- The CLI must not import this package at runtime.
- Generated public artifacts must not import `@bambiui/core`, `@bambiui/generator`, `@bambiui/adapters`, contracts, controllers, internal primitives, or generator files.
- Keep output deterministic and stable.
- Put component-specific public API hints in `registry.authoring.json` `generator.<framework>` metadata.
- Do not add Astro output or a broad compiler rewrite without an explicit plan.

## Useful Files

- Entrypoint: `src/index.js`
- Shared utilities: `src/shared.js`
- Framework generators: `src/react/`, `src/solid/`, `src/svelte/`, `src/vue/`
- Coverage: `src/__tests__/`

## Verify

```sh
pnpm --filter @bambiui/generator test
pnpm registry:refresh
pnpm check-registry
```
