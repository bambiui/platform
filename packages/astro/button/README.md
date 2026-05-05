# @bambi-astro/button

Accessible, themeable Button component for Astro — 8 variants, 4 sizes, loading state, and icon support.

## Installation

```sh
npm install @bambi-astro/button @bambi-ui/theme
```

## Setup

Add the token sheet and button CSS to your global stylesheet, or via Astro's `customCss` in `astro.config.mjs`:

```js
// astro.config.mjs
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      customCss: [
        './src/styles/global.css', // contains @import rules for tokens + button CSS
      ],
    }),
  ],
});
```

```css
/* src/styles/global.css */
@import '@bambi-ui/theme/tokens.css';
@import '@bambi-ui/button/index.css';
```

## Usage

```astro
---
import { Button } from '@bambi-astro/button';
---

<Button>Click me</Button>
<Button variant="secondary" size="lg">Large secondary</Button>
<Button loading>Saving…</Button>
<Button disabled>Disabled</Button>
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `ButtonVariant` | `"primary"` | Visual style |
| `size` | `ButtonSize` | `"md"` | Size |
| `loading` | `boolean` | `false` | Spinner + `aria-busy`, disables pointer events |
| `disabled` | `boolean` | `false` | Native disabled |
| `type` | `"button" \| "submit" \| "reset"` | `"button"` | HTML type |
| `id` | `string` | — | HTML id |
| `class` | `string` | — | Additional CSS classes |

All other attributes are forwarded via `{...attrs}`.

### Variants

```astro
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

```astro
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
<Button size="icon" aria-label="Add"><PlusIcon /></Button>
```

## Source-shipped

This package ships `.astro` source files directly — there is no pre-build step. Astro compiles the component at build time with zero client-side JavaScript by default.

## Accessibility

- `type="button"` is the default, preventing accidental form submissions.
- `aria-busy` is set when `loading` is true.
- `aria-disabled` is set when `loading || disabled`.
- Focus ring is always visible (`:focus-visible`).
- Loading spinner has `aria-hidden="true"`.
