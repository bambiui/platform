# bambiui Studio Agent Rules

## Responsibility

- Owns the static Astro studio served at `/studio`.
- Edits global token previews, component token overrides, pan/zoom UI, and studio-only presentation.
- Heavy previews, live examples, token editing, visual testing, and interactive demos live here — not in docs.

## Boundaries

- Keep `base: '/studio'` in `astro.config.mjs`.
- Global token edits apply to `document.documentElement`.
- Component token overrides apply to scoped selectors such as `.bambi-button`.
- Import tokens from `@bambiui/tokens/tokens.css` and source components from `@bambiui/components`.
- Keep dark mode aligned with docs through the `starlight-theme` localStorage key plus `data-theme` and `.dark`.
- Complex component previews should demonstrate the same root component supporting props-driven common usage and compound/composed advanced usage where useful. Do not add `*Simple` preview components.

## Forbidden

- Do not reintroduce `/builder` paths or `apps/builder` references.
- Do not make studio the source of truth for tokens or component APIs.
- Do not move component token defaults into global token CSS.
- Do not change deploy assumptions without updating `deploy-static` and `scripts/copy-registry-assets.mjs`.
- Do not add server/runtime dependencies; studio remains static.

## Golden References

- Astro base path: `astro.config.mjs`.
- Page entry and theme bootstrap: `src/pages/index.astro`.
- Studio behavior: `src/scripts/builder.ts`.
- Studio data model: `src/data/builderData.ts`.
- Studio styles: `src/styles/builder.css`.

## Verify

```sh
pnpm --filter studio check-types
pnpm --filter studio build
```

For token model changes, also run `pnpm check-tokens`.
