# bambiui Core Agent Rules

## Responsibility

- Owns framework-agnostic contracts, shared type primitives, and component contract derivations.
- This package is the source of truth for reusable component API vocabulary.

## Boundaries

- Keep core free of framework imports, DOM behavior, CSS, CLI logic, docs logic, and registry fetching.
- Put shared component-agnostic contracts in `src/contracts.ts`.
- Put component-specific derived contracts in files such as `src/button.ts`.

## Forbidden

- Do not import React, Svelte, Vue, Astro, CLI, tokens, docs, or builder code.
- Do not add runtime styling, recipes, file generation, or registry logic.
- Do not duplicate component-specific defaults here unless they are true shared contracts.

## Golden References

- Shared primitives: `src/contracts.ts`.
- Button contract derivation: `src/button.ts`.
- Public barrel: `src/index.ts`.

## Verify

```sh
pnpm --filter @bambiui/core check-types
```

If exported contracts affect components or registry generation, run `pnpm check`.
