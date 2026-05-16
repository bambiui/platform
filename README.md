# bambiui

DOM Protocol based, CLI-first UI kit.

> **Status:** Architecture reset in progress. docs/studio temporarily suspended.

## Quick Start

```sh
npx bambiui init
npx bambiui add tabs --framework react
npx bambiui add tabs --framework solid
npx bambiui add tabs --framework svelte
npx bambiui add tabs --framework vue
```

If framework auto-detection is inconclusive, the CLI uses React defaults.

## Architecture

bambiui uses a DOM Protocol model. Internal component contracts and controllers are transformed by the build-time generator into public generated artifacts. The CLI copies those artifacts into user projects; users do not install runtime bambiui packages.

Each component has three layers:

- **Controller** — vanilla TypeScript, manages DOM state via `data-*` attributes. No framework dependency.
- **CSS** — driven entirely by `data-*` attribute selectors. No JavaScript class toggling.
- **Framework wrapper** — generated framework output source (React, Solid, Svelte, Vue) that translates props → DOM attributes, mounts/destroys the controller behavior, calls `controller.sync()` on prop changes, and contains zero independent behavior logic.

CLI output is **self-contained registry output**: copied files have no `@bambiui/*` runtime imports and do not include contract, controller, primitive, or generator files.

## Frameworks

Supported output targets: **React**, **Solid**, **Svelte 5**, **Vue 3**.

## Usage

### Init

```sh
npx bambiui init
# Creates bambiui.config.json and copies src/styles/bambi.css
```

### Add a component

```sh
# React
npx bambiui add tabs --framework react
# → src/components/ui/tabs/index.tsx + tabs.css

# Solid
npx bambiui add tabs --framework solid
# → src/components/ui/tabs/index.tsx + tabs.css

# Svelte 5
npx bambiui add tabs --framework svelte
# → src/components/ui/tabs/{Tabs,TabsList,TabsTrigger,TabsContent}.svelte + index.ts + tabs.css

# Vue 3
npx bambiui add tabs --framework vue
# → src/components/ui/tabs/{Tabs,TabsList,TabsTrigger,TabsContent}.vue + index.ts + tabs.css

# All frameworks also copy once to src/components/ui/ (when helpers are used):
#   bambi-helpers.ts
# And ensure the global style file exists at src/styles/bambi.css
```

## Controlled / Uncontrolled

```tsx
// Uncontrolled — controller manages state internally
<Tabs defaultValue="one">...</Tabs>

// Controlled — you manage state, controller fires bambi:value-change
<Tabs value={tab} onValueChange={(detail) => setTab(detail.value)}>...</Tabs>
```

`onValueChange` receives `{ value, previousValue, source }`. Use `value` for controlled state updates. `source` is `"click"` or `"keyboard"`.

## Workspace

| Package                       | Description                                          |
| ----------------------------- | ---------------------------------------------------- |
| `packages/cli`                | bambiui CLI — init, add                              |
| `packages/core`               | DOM protocol interfaces, utilities, tab controller   |
| `packages/generator`          | Contract parsers and framework artifact generators   |
| `packages/registry`           | Generated public artifacts and component CSS         |
| `apps/templates`              | Template projects for CLI smoke tests (react, solid, svelte, vue) |
| `apps/www`                    | Active minimal static host for registry assets       |
| `apps/_archived/`             | docs, studio, old www — suspended                    |

## Commands

```sh
pnpm install
pnpm check           # check-types + check-registry + CLI smoke tests
pnpm check-registry  # validate registry.json v2 schema
pnpm check-types     # TypeScript across all packages
```
