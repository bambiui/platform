# bambiui Components Agent Rules

## Responsibility

- Owns source-distributed component implementations for React, Svelte, Vue, and Astro.
- `button` is canonical for implementation shape, registry wiring, self-contained output, a11y, and styling patterns; not for visual design or API semantics.

## Boundaries

- Component source may depend on `@bambiui/core` inside this workspace, but CLI-installed output must remain self-contained.
- Keep shared visual styling in component CSS, not per-framework style branches.
- Keep component-local recipes component-local unless at least two components need the same helper.
- Public component APIs should map to shared contracts from `packages/core`.
- For a11y behavior, use each framework's own hooks, bindings, directives, event model, and lint/compiler feedback.

## Forbidden

- Do not add per-component packages, per-component build steps, or publish workflows.
- Do not duplicate recipes across framework files.
- Do not put component tokens in `packages/tokens/src/tokens.css`.
- Do not add framework-specific visual behavior unless markup or native behavior requires it.
- Do not hide accessibility behavior inside generic cross-framework runtime helpers.
- Do not import docs, builder, registry, or CLI code.

## Golden References

- Button source: `button/src/react.tsx`, `svelte.svelte`, `vue.vue`, `astro.astro`.
- Button CSS: `button/src/button.css`.
- Button recipe: `button/src/recipe.ts`.
- Button type bridge: `button/src/types.ts`.
- Package exports: `package.json`.

## Verify

```sh
pnpm --filter @bambiui/components check-types
pnpm --filter @bambiui/components lint
```

For registry-facing component changes, run `pnpm check`.
