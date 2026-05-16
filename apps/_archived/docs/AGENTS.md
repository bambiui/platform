> **ARCHIVED — DO NOT USE AS ACTIVE REFERENCE**
> This app is suspended. It is not an active workspace target, build target, or registry/CLI consumer.
> Do not follow these instructions for active development. See root `AGENTS.md` for current architecture: CLI-first delivery, build-time generator, self-contained React registry output, and no runtime bambiui package.

# bambiui Docs Agent Rules

## Responsibility

- Owns Starlight docs content, examples, navigation, and public docs assets.
- Docs pages are historical explanatory reference pages only. Do not add live component previews or import old component packages into docs content.

## Boundaries

- Historical note: this app predates the current generated artifact registry model.
- Keep docs and builder theme behavior aligned through the shared `starlight-theme` key.
- Keep docs examples consistent with CLI-installed output.
- For complex components, document props-driven root usage first for common layouts and compound/composed usage second for advanced control. Avoid documenting `*Simple` component names unless the component source has a strong reason for one.
- Make clear that props-driven APIs render the same semantic structure as compound APIs and must preserve accessibility, keyboard behavior, focus management, and semantic HTML.
- Do not use these old framework example rules as guidance for current generated output targets. React output is the active target.

## Forbidden

- Do not make docs the source of truth for component APIs, recipes, registry data, or tokens.
- Do not duplicate generated component source inside docs.
- Do not change component behavior from docs-only files.
- Do not reintroduce legacy runtime-package terminology or guidance from this archived app.
- Do not rename the shared theme key without updating builder assumptions.

## Golden References

- Docs shell/config: `astro.config.mjs`.
- Global CSS and token import: `src/styles/global.css`.
- Component docs pattern: `src/content/docs/components/button.mdx`.
- Install flow docs: `src/content/docs/get-started.mdx`.

## Verify

```sh
pnpm --filter docs check-types
```

For any active documentation work, update root docs/README context instead and run the focused check for that active area.
