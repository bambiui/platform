# @bambi-ui/theme

Design tokens and utilities for Bambi UI — CSS custom properties, optional Tailwind v4 integration, and the `cn()` class merging helper.

## Installation

```sh
npm install @bambi-ui/theme
```

## Usage

### CSS tokens

Import the token sheet into your global CSS:

```css
@import '@bambi-ui/theme/tokens.css';
```

This defines all `--bambi-*` custom properties on `:root` with dark mode overrides on `.dark`.

### `cn()` utility

```ts
import { cn } from '@bambi-ui/theme';

cn('base-class', isActive && 'active', className);
```

A lightweight wrapper around `clsx` + `tailwind-merge`. Safe to use without Tailwind.

## Token reference

### Colors (OKLCH)

All color tokens have light and dark mode values. Dark overrides live on `.dark`.

| Token | Light | Dark |
|---|---|---|
| `--bambi-primary` | `oklch(55% 0.22 250)` | `oklch(65% 0.22 250)` |
| `--bambi-primary-foreground` | `oklch(98% 0 0)` | `oklch(9% 0 0)` |
| `--bambi-secondary` | `oklch(96% 0 0)` | `oklch(14% 0 0)` |
| `--bambi-secondary-foreground` | `oklch(9% 0 0)` | `oklch(98% 0 0)` |
| `--bambi-accent` | `oklch(93% 0 0)` | `oklch(18% 0 0)` |
| `--bambi-accent-foreground` | `oklch(9% 0 0)` | `oklch(98% 0 0)` |
| `--bambi-destructive` | `oklch(55% 0.22 25)` | `oklch(60% 0.22 25)` |
| `--bambi-destructive-foreground` | `oklch(98% 0 0)` | `oklch(98% 0 0)` |
| `--bambi-success` | `oklch(55% 0.17 145)` | `oklch(65% 0.17 145)` |
| `--bambi-success-foreground` | `oklch(98% 0 0)` | `oklch(98% 0 0)` |
| `--bambi-warning` | `oklch(75% 0.17 70)` | `oklch(80% 0.17 70)` |
| `--bambi-warning-foreground` | `oklch(15% 0 0)` | `oklch(15% 0 0)` |
| `--bambi-background` | `oklch(100% 0 0)` | `oklch(9% 0 0)` |
| `--bambi-foreground` | `oklch(9% 0 0)` | `oklch(98% 0 0)` |
| `--bambi-border` | `oklch(70% 0 0)` | `oklch(40% 0 0)` |
| `--bambi-ring` | `oklch(55% 0.22 250)` | `oklch(65% 0.22 250)` |

### Typography

| Token | Value |
|---|---|
| `--bambi-font-sans` | `system-ui, sans-serif` |
| `--bambi-font-mono` | `ui-monospace, monospace` |
| `--bambi-text-xs` | `0.75rem` |
| `--bambi-text-sm` | `0.875rem` |
| `--bambi-text-base` | `1rem` |
| `--bambi-text-lg` | `1.125rem` |
| `--bambi-font-weight-normal` | `400` |
| `--bambi-font-weight-medium` | `500` |
| `--bambi-font-weight-semibold` | `600` |
| `--bambi-font-weight-bold` | `700` |

### Border radius

| Token | Value |
|---|---|
| `--bambi-radius-sm` | `0.25rem` |
| `--bambi-radius-md` | `0.375rem` |
| `--bambi-radius-lg` | `0.5rem` |
| `--bambi-radius-xl` | `0.75rem` |
| `--bambi-radius-full` | `9999px` |

## Overriding tokens

```css
:root {
  --bambi-primary: oklch(60% 0.25 30); /* custom brand color */
}

.dark {
  --bambi-primary: oklch(70% 0.25 30);
}
```

## Tailwind v4

The token sheet includes a `@theme inline` block that maps Bambi tokens to Tailwind v4 design system variables. Import `tokens.css` in your Tailwind entry point and use standard Tailwind utilities alongside Bambi components.
