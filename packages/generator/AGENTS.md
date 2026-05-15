# bambiui Generator Agent Rules

## Responsibility

`packages/generator` owns internal parsers and artifact generators used by maintainer scripts such as `pnpm registry:refresh`.

## What Lives Here

- Contract parsers that read internal DOM Protocol component contracts.
- Framework artifact generators, currently React.
- Framework dispatch entrypoint in `src/index.js`.
- Small generation utilities shared across components.

## Boundaries

- This package is private and internal. It must not be published.
- The CLI must not import this package at runtime.
- Generated public artifacts must not import this package.
- Keep generator output deterministic and stable.

## Forbidden

- Do not make user-installed files depend on `@bambiui/generator`.
- Do not add React runtime behavior here that should remain in core controllers.
- Do not hardcode component-specific part semantics in parser code. Put component API hints in `registry.authoring.json` `generator.<framework>` metadata.
- Do not build a broad compiler without an explicit plan; extend parser/generator support component by component and framework by framework.

## Verify

```sh
pnpm registry:refresh
pnpm check-registry
pnpm check
```
