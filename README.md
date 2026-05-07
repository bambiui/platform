# Bambi UI

A multi-framework UI component library — React, Svelte, Vue, and Astro — with a shared design token system and zero runtime overhead.

**[Documentation](https://bambi-ui.com)** · **[Token Builder](https://bambi-ui.com/builder)** · **[GitHub](https://github.com/yusuffelekoglu/bambi-ui)**

## Packages

| Package | Description |
|---|---|
| [`@bambi-ui/theme`](packages/ui/theme) | Design tokens (CSS custom properties) + `cn()` utility |
| [`@bambi-ui/button`](packages/ui/button) | Shared button types and base CSS |
| [`@bambi-react/button`](packages/react/button) | Button component for React 19 |
| [`@bambi-svelte/button`](packages/svelte/button) | Button component for Svelte 5 |
| [`@bambi-vue/button`](packages/vue/button) | Button component for Vue 3 |
| [`@bambi-astro/button`](packages/astro/button) | Button component for Astro |

## Apps

| App | Description |
|---|---|
| [`apps/docs`](apps/docs) | Starlight documentation site |
| [`apps/builder`](apps/builder) | Infinite-canvas design token editor, served at `/builder` |

## Getting started

### 1. Install

Pick the package for your framework:

```sh
# React
npm install @bambi-react/button @bambi-ui/theme

# Svelte
npm install @bambi-svelte/button @bambi-ui/theme

# Vue
npm install @bambi-vue/button @bambi-ui/theme

# Astro
npm install @bambi-astro/button @bambi-ui/theme
```

### 2. Add CSS to your global stylesheet

```css
@import '@bambi-ui/theme/tokens.css';
@import '@bambi-ui/button/index.css';
```

### 3. Use the component

```tsx
// React
import { Button } from '@bambi-react/button';
<Button variant="primary">Click me</Button>
```

```svelte
<!-- Svelte -->
<script>
  import { Button } from '@bambi-svelte/button';
</script>
<Button variant="primary">Click me</Button>
```

```vue
<!-- Vue -->
<script setup>
import { Button } from '@bambi-vue/button';
</script>
<template>
  <Button variant="primary">Click me</Button>
</template>
```

```astro
---
// Astro
import { Button } from '@bambi-astro/button';
---
<Button variant="primary">Click me</Button>
```

## Component props

All framework implementations share the same props:

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `string` | `"primary"` | Visual style — `primary` `secondary` `outline` `ghost` `link` `destructive` `success` `warning` |
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

# Build all packages
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
