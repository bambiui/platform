> **ARCHIVED — DO NOT USE AS ACTIVE REFERENCE**
> This app is suspended. It is not an active workspace target, build target, or registry/CLI consumer.
> Do not follow these instructions for active development. See root `AGENTS.md` for current architecture: CLI-first delivery, build-time generator, self-contained React registry output, and no runtime bambiui package.

# bambiui Studio Agent Rules

## Responsibility

- Historically owned the static Astro studio served at `/studio`.
- Edits global token previews, component token overrides, pan/zoom UI, and studio-only presentation.
- Heavy previews, live examples, token editing, visual testing, and interactive demos live here — not in docs.

## Boundaries

- Keep `base: '/studio'` in `astro.config.mjs`.
- Global token edits apply to `document.documentElement`.
- Component token overrides apply to scoped selectors such as `.bambi-button`.
- Historical note: old token/component package imports are not part of the current architecture.
- Keep dark mode aligned with docs through the `starlight-theme` localStorage key plus `data-theme` and `.dark`.
- Complex component previews should demonstrate the same root component supporting props-driven common usage and compound/composed advanced usage where useful. Do not add `*Simple` preview components.

## Forbidden

- Do not reintroduce `/builder` paths or `apps/builder` references.
- Do not make studio the source of truth for tokens or component APIs.
- Do not move component token defaults into global token CSS.
- Do not use this archived deploy flow as guidance for active `apps/www` registry asset hosting.
- Do not add server/runtime dependencies; studio remains static.
- Do not reintroduce legacy runtime-package terminology or guidance from this archived app.

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
