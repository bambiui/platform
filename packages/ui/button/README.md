# @bambi-ui/button

Framework-agnostic core for Bambi UI's Button — shared TypeScript types and base CSS. This package is a dependency of all framework-specific button packages; you typically won't install it directly.

## What's in this package

- **Types** — `ButtonVariant`, `ButtonSize`, `ButtonBaseProps` exported from `dist/index.d.ts`
- **CSS** — `src/index.css` — complete button styles driven by CSS custom properties

## Installation

```sh
npm install @bambi-ui/button
```

## Usage

### CSS

```css
/* In your global stylesheet, after the token sheet */
@import '@bambi-ui/button/index.css';
```

### Types

```ts
import type { ButtonBaseProps, ButtonVariant, ButtonSize } from '@bambi-ui/button';
```

## Type reference

```ts
type ButtonVariant =
  | 'primary' | 'secondary' | 'outline' | 'ghost'
  | 'link' | 'destructive' | 'success' | 'warning';

type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonBaseProps {
  variant?: ButtonVariant;  // default: 'primary'
  size?: ButtonSize;        // default: 'md'
  loading?: boolean;        // default: false
}
```

## CSS token reference

All styles are customizable via CSS custom properties. See the [Button documentation](https://bambi-ui.dev/components/button#css-tokens) for the full token table.

Quick examples:

```css
:root {
  --bambi-button-radius: 999px;         /* pill shape */
  --bambi-button-hover-opacity: 0.8;    /* stronger hover dim */
  --bambi-button-primary-bg: oklch(60% 0.25 30); /* custom primary color */
}
```
