# @bambi-vue/button

Accessible, themeable Button component for Vue 3 — 8 variants, 4 sizes, loading state, and icon support.

## Installation

```sh
npm install @bambi-vue/button @bambi-ui/theme
```

## Setup

Add the token sheet and button CSS to your global stylesheet:

```css
@import '@bambi-ui/theme/tokens.css';
@import '@bambi-ui/button/index.css';
```

## Usage

```vue
<script setup>
import { Button } from '@bambi-vue/button';
</script>

<template>
  <Button>Click me</Button>
  <Button variant="secondary" size="lg">Large secondary</Button>
  <Button :loading="true">Saving…</Button>
  <Button disabled>Disabled</Button>
</template>
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `ButtonVariant` | `"primary"` | Visual style |
| `size` | `ButtonSize` | `"md"` | Size |
| `loading` | `boolean` | `false` | Spinner + `aria-busy`, disables pointer events |
| `disabled` | `boolean` | `false` | Native disabled |
| `type` | `"button" \| "submit" \| "reset"` | `"button"` | HTML type |
| `class` | `string` | — | Additional CSS classes |

Additional attributes are forwarded via `v-bind="attrs"` (`inheritAttrs: false`).

### Variants

```vue
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="success">Success</Button>
<Button variant="warning">Warning</Button>
```

### Sizes

```vue
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
<Button size="icon" aria-label="Add"><PlusIcon /></Button>
```

### Loading state

```vue
<Button :loading="isSaving">Saving…</Button>
```

## Source-shipped

This package ships `.vue` source files directly — there is no pre-build step. Your bundler (Vite / Nuxt) compiles the component. This keeps bundle size minimal and enables full tree-shaking.

## Accessibility

- `type="button"` is the default, preventing accidental form submissions.
- `aria-busy` is set when `loading` is true.
- `aria-disabled` is set when `loading || disabled`.
- Focus ring is always visible (`:focus-visible`).
- Loading spinner has `aria-hidden="true"`.
