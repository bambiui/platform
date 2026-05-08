# BambiUI

A multi-framework UI component library CLI — React, Svelte, Vue, and Astro components copied into your app as source.

**[Documentation](https://bambi-ui.com)** · **[Token Builder](https://bambi-ui.com/builder)** · **[GitHub](https://github.com/yusuffelekoglu/bambi-ui)**

## Workspace

| Package/App | Description |
|---|---|
| [`packages/cli`](packages/cli) | `bambiui` CLI that adds component source files to user projects |
| [`packages/core`](packages/core) | Shared contracts and framework-agnostic types |
| [`packages/tokens`](packages/tokens) | Primitive, semantic, intent, state, and component tokens |
| [`packages/recipes`](packages/recipes) | Shared recipe definitions for variants, sizes, and states |
| [`packages/components`](packages/components) | Source components for React, Svelte, Vue, and Astro |

## Apps

| App | Description |
|---|---|
| [`apps/docs`](apps/docs) | Starlight documentation site |
| [`apps/builder`](apps/builder) | Infinite-canvas design token editor, served at `/builder` |

## Getting started

### 1. Initialize

Run the CLI in your app:

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

The command creates the component under `src/components/ui/`. `init` creates global tokens at `src/styles/bambi.css`; `add button` creates the component styles at `src/styles/bambi-button.css`. Import both CSS files from your app's global stylesheet.

By default the CLI fetches source from the GitHub raw registry. For local development or a future hosted registry API, override the base:

```sh
npx bambiui init --registry-url https://raw.githubusercontent.com/yusuffelekoglu/bambi-ui/main
```

### 3. Use the component

```tsx
// React
import { Button } from './components/ui/button';
<Button intent="primary">Click me</Button>
```

```svelte
<!-- Svelte -->
<script>
  import Button from './components/ui/Button.svelte';
</script>
<Button intent="primary">Click me</Button>
```

```vue
<!-- Vue -->
<script setup>
import Button from './components/ui/Button.vue';
</script>
<template>
  <Button intent="primary">Click me</Button>
</template>
```

```astro
---
// Astro
import Button from './components/ui/Button.astro';
---
<Button intent="primary">Click me</Button>
```

## Component props

All framework implementations share the same props:

| Prop | Type | Default | Description |
|---|---|---|---|
| `intent` | `string` | `"primary"` | Meaning — `primary` `secondary` `danger` `success` `warning` |
| `appearance` | `string` | `"solid"` | Rendering style — `solid` `outline` `ghost` `link` |
| `size` | `string` | `"md"` | Button size — `sm` `md` `lg` `icon` |
| `loading` | `boolean` | `false` | Shows a spinner, sets `aria-busy`, disables pointer events |
| `disabled` | `boolean` | `false` | Native disabled state |
| `type` | `string` | `"button"` | HTML button type |

All additional HTML `<button>` attributes are forwarded to the element.

## Development

Requirements: Node ≥ 22, pnpm 9

```sh
# Install dependencies
pnpm install

# Build docs and builder
pnpm build

# Start the docs site
pnpm --filter docs dev

# Start the token builder
pnpm --filter builder dev

# Type-check everything
pnpm check-types
```

## Deployment

Both `docs` and `builder` deploy as a single Cloudflare Pages project. Run `pnpm deploy-static` to build everything and merge builder output into the docs dist:

```sh
pnpm deploy-static
# output → apps/docs/dist/
#   /          → docs site
#   /builder   → token builder
```

See [`apps/builder/README.md`](apps/builder/README.md) for Cloudflare Pages project settings.

## License

MIT
