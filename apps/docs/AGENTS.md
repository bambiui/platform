# bambiui Docs Agent Rules

## Responsibility

- Owns Starlight docs content, examples, previews, navigation, and public docs assets.
- Docs dogfood source components and tokens through workspace packages.

## Boundaries

- Import product components from `@bambiui/components`, not generated template copies.
- Import global tokens through docs global CSS.
- Keep docs and builder theme behavior aligned through the shared `starlight-theme` key.
- Keep docs examples consistent with CLI-installed output.

## Forbidden

- Do not make docs the source of truth for component APIs, recipes, registry data, or tokens.
- Do not duplicate generated component source inside docs.
- Do not change component behavior from docs-only files.
- Do not rename the shared theme key without updating builder assumptions.

## Golden References

- Docs shell/config: `astro.config.mjs`.
- Global CSS and token import: `src/styles/global.css`.
- Preview utilities: `src/styles/preview.css`.
- Component docs pattern: `src/content/docs/components/button.mdx`.
- Install flow docs: `src/content/docs/get-started.mdx`.

## Verify

```sh
pnpm --filter docs check-types
```

For docs that mention registry, CLI, or tokens, also run the focused check for that area.
