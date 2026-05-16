# bambiui Generator Agent Rules

## Responsibility

`packages/generator` owns internal parsers and artifact generators used by maintainer scripts such as `pnpm registry:refresh`.

## What Lives Here

- Contract parsers that read internal DOM Protocol component contracts.
- Framework artifact generators for React, Solid, Svelte 5, and Vue 3 output targets.
- Framework dispatch entrypoint in `src/index.js`.
- Small generation utilities shared across components.

## Boundaries

- This package is private and internal. It must not be published.
- The CLI must not import this package at runtime.
- Generated public artifacts must not import this package.
- Generated public artifacts must stay self-contained and must not import `@bambiui/core`, `@bambiui/generator`, `@bambiui/adapters`, contracts, controllers, or internal primitives.
- Keep generator output deterministic and stable.

## Forbidden

- Do not make user-installed files depend on `@bambiui/generator`.
- Do not make user-installed files depend on `@bambiui/core`, `@bambiui/adapters`, or any runtime bambiui package.
- Do not add framework runtime behavior here that should remain in core controllers.
- Do not hardcode component-specific part semantics in parser code. Put component API hints in `registry.authoring.json` `generator.<framework>` metadata.
- Do not use adapter terminology for active output; use generator, framework wrapper, or generated component source.
- Do not add Astro framework output without an explicit plan.
- Do not build a broad compiler without an explicit plan; extend parser/generator support component by component and output target by output target.

## Verify

```sh
pnpm registry:refresh
pnpm check-registry
pnpm check
```
