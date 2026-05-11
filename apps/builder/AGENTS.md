# bambiui Builder Agent Rules

## Responsibility

- Owns the static Astro token builder served at `/builder`.
- Edits global token previews, component token overrides, pan/zoom UI, and builder-only presentation.

## Boundaries

- Keep `base: '/builder'` in `astro.config.mjs`.
- Global token edits apply to `document.documentElement`.
- Component token overrides apply to scoped selectors such as `.bambi-button`.
- Import tokens from `@bambiui/tokens/tokens.css` and source components from `@bambiui/components`.
- Keep dark mode aligned with docs through the `starlight-theme` localStorage key plus `data-theme` and `.dark`.

## Forbidden

- Do not make builder the source of truth for tokens or component APIs.
- Do not move component token defaults into global token CSS.
- Do not change docs deployment assumptions without updating `deploy-static`.
- Do not add server/runtime dependencies; builder remains static.

## Golden References

- Astro base path: `astro.config.mjs`.
- Page entry and theme bootstrap: `src/pages/index.astro`.
- Builder behavior: `src/scripts/builder.ts`.
- Builder data model: `src/data/builderData.ts`.
- Builder styles: `src/styles/builder.css`.

## Verify

```sh
pnpm --filter builder check-types
pnpm --filter builder build
```

For token model changes, also run `pnpm check-tokens`.
