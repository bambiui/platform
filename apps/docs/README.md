# Bambi UI — Docs

The documentation site for Bambi UI, built with [Starlight](https://starlight.astro.build/) on Astro. All four framework button components (React, Svelte, Vue, Astro) render live on the same page.

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
  astro.config.mjs          # Starlight config — integrations, customCss, sidebar, noExternal
  src/
    content/
      docs/
        components/
          button.mdx        # Button component documentation
    styles/
      global.css            # Imports @bambiui/tokens/tokens.css + internal button CSS
      preview.css           # .preview, .preview-row, .preview-col utility classes
```

## Adding a new component page

1. Create `src/content/docs/components/<name>.mdx`
2. Add it to the sidebar in `astro.config.mjs`:
   ```js
   { label: 'Component Name', slug: 'components/<name>' }
   ```
3. Import the framework components at the top of the MDX file
4. Use `<Tabs syncKey="framework">` so tab selections stay in sync across sections

## Key configuration notes

- **`vite.ssr.noExternal`**: Any workspace package imported in MDX must be listed here, otherwise Astro's SSR bundler won't process it.
- **CSS imports**: The token andgenerated button CSS are loaded via Starlight's `customCss` array, not PostCSS `@import` — PostCSS cannot resolve package.json `exports` fields.
- **Framework integrations**: `@astrojs/react`, `@astrojs/svelte`, `@astrojs/vue` are all registered, enabling all four frameworks in a single MDX file.

## Preview classes

| Class | Description |
|---|---|
| `.preview` | Bordered container wrapping a live example |
| `.preview-row` | Flex row with `gap: 8px`, items aligned to `end` |
| `.preview-col` | Flex column with `gap: 16px` |
