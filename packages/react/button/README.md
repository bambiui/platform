# @bambi-react/button

Accessible, themeable Button component for React 19 — 8 variants, 4 sizes, loading state, and icon support.

## Installation

```sh
npm install @bambi-react/button @bambi-ui/theme
```

## Setup

Add the token sheet and button CSS to your global stylesheet:

```css
@import '@bambi-ui/theme/tokens.css';
@import '@bambi-ui/button/index.css';
```

## Usage

```tsx
import { Button } from '@bambi-react/button';

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
| `ref` | `Ref<HTMLButtonElement>` | — | Forwarded ref |
| `className` | `string` | — | Additional CSS classes |

All other `HTMLButtonElement` attributes are forwarded.

### Variants

```tsx
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

```tsx
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
<Button size="icon" aria-label="Add"><PlusIcon /></Button>
```

### Loading state

During loading the button's text is visually hidden (`opacity: 0`) but remains readable by screen readers. `aria-busy="true"` is set automatically.

```tsx
<Button loading>Saving…</Button>
```

## Accessibility

- `type="button"` is the default, preventing accidental form submissions.
- `aria-busy` is set when `loading` is true.
- `aria-disabled` is set when `loading || disabled`.
- Focus ring is always visible (`:focus-visible`).
- Loading spinner has `aria-hidden="true"`.

## Types

```ts
import type { ButtonProps, ButtonVariant, ButtonSize, ButtonBaseProps } from '@bambi-react/button';
```
