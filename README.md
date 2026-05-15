# bambiui

DOM Protocol based, CLI-first UI kit.

> **Status:** Architecture reset in progress. docs/studio temporarily suspended.  
> Current focus: stabilize React as the first canonical adapter target with Tabs.

## Quick Start

```sh
npx bambiui init
npx bambiui add tabs --framework react
```

## Architecture

bambiui uses a DOM Protocol model. Each component has three layers:

- **Controller** — vanilla TypeScript, manages DOM state via `data-*` attributes. No framework dependency.
- **CSS** — driven entirely by `data-*` attribute selectors. No JavaScript class toggling.
- **Framework wrapper** — a thin bridge. Translates props → DOM attributes, mounts/destroys the controller, calls `controller.sync()` on prop changes. Contains zero behavior logic.

CLI output is **self-contained**: copied files have no `@bambiui/*` runtime imports.

## Frameworks

bambiui is currently focusing on React as the first canonical adapter target.
Vue, Svelte and Solid support are intentionally removed during the generic adapter migration and will be rebuilt later.

## Usage

### Init

```sh
npx bambiui init
# Creates bambiui.config.json and copies src/styles/bambi.css
```

### Add a component

```sh
npx bambiui add tabs --framework react
# Copies to src/components/ui/tabs/:
#   component/tabs.react.tsx   component/tabs.controller.ts
#   component/tabs.contract.ts  component/tabs.css  tabs.ts
```

## Controlled / Uncontrolled

```tsx
// Uncontrolled — controller manages state internally
<Tabs defaultValue="one">...</Tabs>

// Controlled — you manage state, controller fires bambi:value-change
<Tabs value={tab} onValueChange={setTab}>...</Tabs>
```

## Workspace

| Package                       | Description                                          |
| ----------------------------- | ---------------------------------------------------- |
| `packages/cli`                | bambiui CLI — init, add                              |
| `packages/core`               | DOM protocol interfaces, utilities, tab controller   |
| `packages/registry`           | CLI-installable component source templates           |
| `apps/templates`              | Template projects for CLI smoke tests                |
| `apps/_archived/`             | docs, studio, www — suspended                        |

## Commands

```sh
pnpm install
pnpm check           # check-types + check-registry + CLI smoke tests
pnpm check-registry  # validate registry.json v2 schema
pnpm check-types     # TypeScript across all packages
```
