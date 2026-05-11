# bambiui

A CLI-first, source-distributed UI toolkit for React, Svelte, Vue, and Astro.

**[Documentation](https://bambiui.com/docs)** · **[Studio](https://bambiui.com/studio)** · **[GitHub](https://github.com/bambiui/platform)**

## Workspace

| Package/App                                  | Description                                                     |
| -------------------------------------------- | --------------------------------------------------------------- |
| [`packages/cli`](packages/cli)               | `bambiui` CLI that adds component source files to user projects |
| [`packages/core`](packages/core)             | Shared contracts and framework-agnostic types                   |
| [`packages/tokens`](packages/tokens)         | Global primitive, semantic, intent, and state design tokens     |
| [`packages/components`](packages/components) | Source components for React, Svelte, Vue, and Astro             |

## Apps

| App                          | Description                                                        |
| ---------------------------- | ------------------------------------------------------------------ |
| [`apps/www`](apps/www)       | Custom Astro marketing/landing site, served at `/`                 |
| [`apps/docs`](apps/docs)     | Starlight documentation site, served at `/docs`                    |
| [`apps/studio`](apps/studio) | Grid-based token editor and component playground, served at `/studio` |

## Getting started

### 1. Initialize

Run the CLI package in your app.

```sh
npx bambiui init
```

### 2. Add a component

```sh
npx bambiui add button
```

Framework override is available when detection is not enough:

```sh
npx bambiui add button --framework react
npx bambiui add button --framework svelte
npx bambiui add button --framework vue
npx bambiui add button --framework astro
```

The command creates the component under `src/components/ui/button/`. `init` creates global tokens at `src/styles/bambi.css`; `add button` keeps component CSS and component-local token defaults next to the component source and imports it automatically.

By default the CLI fetches source from the hosted bambiui registry. For local development or a preview registry, override the base:

```sh
npx bambiui init --registry-url https://bambiui.com
```

The current site domain is `https://bambiui.com`; production deploys expose `registry.json`, `registry.schema.json`, and registry source files at the site root.

### 3. Use the component

```tsx
// React
import { Button } from "./components/ui/button";
<Button intent="primary">Click me</Button>;
```

```svelte
<!-- Svelte -->
<script>
  import { Button } from './components/ui/button';
</script>
<Button intent="primary">Click me</Button>
```

```vue
<!-- Vue -->
<script setup>
import { Button } from "./components/ui/button";
</script>
<template>
  <Button intent="primary">Click me</Button>
</template>
```

```astro
---
// Astro
import { Button } from './components/ui/button';
---
<Button intent="primary">Click me</Button>
```

## Component props

All framework implementations share the same props:

| Prop         | Type      | Default     | Description                                                  |
| ------------ | --------- | ----------- | ------------------------------------------------------------ |
| `intent`     | `string`  | `"primary"` | Meaning — `primary` `secondary` `danger` `success` `warning` |
| `appearance` | `string`  | `"solid"`   | Rendering style — `solid` `outline` `ghost` `link`           |
| `size`       | `string`  | `"md"`      | Button size — `sm` `md` `lg` `icon`                          |
| `loading`    | `boolean` | `false`     | Shows a spinner, sets `aria-busy`, disables pointer events   |
| `disabled`   | `boolean` | `false`     | Native disabled state                                        |
| `type`       | `string`  | `"button"`  | HTML button type                                             |

All additional HTML `<button>` attributes are forwarded to the element.

## Component API convention

Complex components expose composition-first compound primitives, with props-driven convenience on the same root component when common usage is obvious. Avoid separate `*Simple` names; the compound API stays the source of truth for advanced layouts, and convenience props must render the same semantic structure without weakening accessibility. React may use `ReactNode` props such as `header` and `footer`; Svelte, Vue, and Astro should use idiomatic props and slots.

## Development

Requirements: Node ≥ 22.12.0, pnpm 9

```sh
# Install dependencies
pnpm install

# Start the marketing site
pnpm --filter www dev

# Start the docs site
pnpm --filter docs dev

# Start the studio
pnpm --filter studio dev

# Type-check everything
pnpm check-types

# Full local verification
pnpm check
```

## Deployment

`www`, `docs`, and `studio` deploy as a single Cloudflare Pages project. Run `pnpm deploy-static` to build all three, merge outputs into `apps/www/dist`, and publish the static registry manifest plus all source files referenced by it:

```sh
pnpm deploy-static
# output → apps/www/dist/
#   /          → marketing site
#   /docs      → documentation
#   /studio    → token editor and playground
#   /registry.json
#   /registry.schema.json
#   /packages/... → source files used by the CLI registry
```

See [`apps/studio/README.md`](apps/studio/README.md) for Cloudflare Pages project settings.

## License

MIT
