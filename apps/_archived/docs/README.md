# Archived

This docs app is suspended and is not an active workspace, build, registry, or CLI target. Do not use its old package references or examples as current bambiui architecture guidance.

# bambiui — Docs

The documentation site for bambiui, built with [Starlight](https://starlight.astro.build/) on Astro. Starlight provides the docs shell, routing, sidebar, and search. Docs pages are explanatory reference pages; rich live previews belong in Studio.

## Running locally

From the repo root, build the workspace packages first (required on first run):

```sh
pnpm build
```

Then start the dev server:

```sh
pnpm --filter docs dev
```

Or from this directory:

```sh
pnpm dev
```

The site runs at `http://localhost:4321`.

## Structure

```
apps/docs/
  astro.config.mjs          # Starlight config — customCss, sidebar
  src/
    content/
      docs/
        components/
          button.mdx        # Button component documentation
        tokens/
          theme.mdx         # Global token documentation
    styles/
      global.css            # Imports @bambiui/tokens/tokens.css
```

## Adding a new component page

1. Create `src/content/docs/components/<name>.mdx`
2. Add it to the sidebar in `astro.config.mjs`:
   ```js
   { label: 'Component Name', slug: 'components/<name>' }
   ```
3. Use code examples and reference tables instead of live previews
4. Use `<Tabs syncKey="framework">` so tab selections stay in sync across sections

## Key configuration notes

- **No live previews**: Do not import `@bambiui/components` into docs content. Keep interactive/rich previews in Studio.
- **CSS imports**: `global.css` imports `@bambiui/tokens/tokens.css`; component CSS is imported by the component source.
- **Framework examples**: Use `<Tabs syncKey="framework">` to keep examples in sync.
- **Complex component APIs**: Show props-driven root usage first for common/simple layouts, then compound/composed usage for advanced control. Avoid `*Simple` names; the root component remains the main entry point.
