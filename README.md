# bambiui

DOM Protocol based, CLI-first UI kit.

> **Status:** Architecture reset in progress. docs/studio temporarily suspended.  
> Current focus: stabilize React as the first framework target with Tabs.

## Quick Start

```sh
npx bambiui init
npx bambiui add tabs --framework react
```

If framework auto-detection is inconclusive during this React-only phase, the CLI uses React defaults.

## Architecture

bambiui uses a DOM Protocol model. Internal component contracts and controllers are transformed by the build-time generator into public generated artifacts. The CLI copies those artifacts into user projects; users do not install runtime bambiui packages.

Each component has three layers:

- **Controller** — vanilla TypeScript, manages DOM state via `data-*` attributes. No framework dependency.
- **CSS** — driven entirely by `data-*` attribute selectors. No JavaScript class toggling.
- **Framework wrapper** — generated React output source that translates props → DOM attributes, mounts/destroys the controller behavior, calls `controller.sync()` on prop changes, and contains zero independent behavior logic.

CLI output is **self-contained registry output**: copied files have no `@bambiui/*` runtime imports and do not include contract, controller, primitive, or generator files.

## Frameworks

React is the first and primary generated output target. Vue, Svelte, Solid, and other framework targets are not the current focus; React output is being stabilized first.

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
#   index.tsx
#   tabs.css
# Copies once to src/components/ui/ (only for components that use shared helpers):
#   bambi-helpers.ts
# Also ensures the global style file exists at src/styles/bambi.css
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
| `apps/templates`              | Template project for CLI smoke tests (bambi-react)   |
| `apps/www`                    | Active minimal static host for registry assets       |
| `apps/_archived/`             | docs, studio, old www — suspended                    |

## Commands

```sh
pnpm install
pnpm check           # check-types + check-registry + CLI smoke tests
pnpm check-registry  # validate registry.json v2 schema
pnpm check-types     # TypeScript across all packages
```
