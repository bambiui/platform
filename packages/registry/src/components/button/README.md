# Button

Button follows the DOM Protocol model internally. Public CLI artifacts are self-contained implementations generated under `packages/registry/generated/button/{react,solid,svelte,vue}/`.

Generated artifacts are copied into user projects by the CLI and do not require `@bambiui/core`, `@bambiui/generator`, or any runtime bambiui package. Supported frameworks: React, Solid, Svelte 5, Vue 3.

## Usage

```tsx
import { Button } from "./components/ui/button";

export function Example() {
  return <Button>Save changes</Button>;
}
```

## Polymorphic Root

```tsx
<Button as="a" href="/settings" variant="outline">
  Settings
</Button>
```

## Props

- `as`: rendered element tag. Defaults to `"button"`.
- `variant`: `"primary"`, `"secondary"`, `"outline"`, `"ghost"`, `"danger"`, `"success"`, or `"warning"`.
- `size`: `"sm"`, `"md"`, `"lg"`, or `"icon"`.
- `disabled`: disables interaction.
- `loading`: marks the button busy and disables interaction.
