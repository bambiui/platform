# Bambi UI — Docs

The documentation site for Bambi UI, built with [Starlight](https://starlight.astro.build/) on Astro. It imports package source from `@bambiui/components` and tokens from `@bambiui/tokens`.

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
    styles/
      global.css            # Imports @bambiui/tokens/tokens.css
      preview.css           # .preview, .preview-row, .preview-col utility classes
```

## Adding a new component page

1. Create `src/content/docs/components/<name>.mdx`
2. Add it to the sidebar in `astro.config.mjs`:
   ```js
   { label: 'Component Name', slug: 'components/<name>' }
   ```
3. Import component source from `@bambiui/components`
4. Use `<Tabs syncKey="framework">` so tab selections stay in sync across sections

## Key configuration notes

- **Package source**: Docs should consume components from `@bambiui/components`, not local generated copies.
- **CSS imports**: `global.css` imports `@bambiui/tokens/tokens.css`; component CSS is imported by the component source.
- **Framework examples**: Use `<Tabs syncKey="framework">` to keep examples in sync.

## Preview classes

| Class          | Description                                      |
| -------------- | ------------------------------------------------ |
| `.preview`     | Bordered container wrapping a live example       |
| `.preview-row` | Flex row with `gap: 8px`, items aligned to `end` |
| `.preview-col` | Flex column with `gap: 16px`                     |
