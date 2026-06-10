# bambiui

Markup-first, source-distributed UI components with a local-file-copy CLI.

This is the standalone bambiui platform repo. It keeps the lightweight `src/core -> src/generator -> src/registry -> src/cli` flow and currently focuses on the locally authored `button` and `tabs` components.

## Quick start

```sh
pnpm install
pnpm bambi init --yes
pnpm bambi add tabs --framework react
```

The CLI writes source files into your project; installed output does not import runtime `@bambiui/*` packages.

## CLI

```sh
bambi init
bambi doctor
bambi doctor --json
bambi list
bambi list --json
bambi add button
bambi add tabs --framework react
bambi add tabs --plan
```

Supported framework targets:

- `vanilla`
- `react`
- `solid`
- `svelte`
- `vue`

## Component support

These components are authored in this repo under `src/core/components` and generated through the TypeScript generator:

- `button`
- `tabs`

The local registry supports vanilla output plus framework-native generated wrappers for React, Solid, Svelte, and Vue.

Run `bambi list` to see the currently available components.

## Development

Architecture and contribution docs:

- [`docs/architecture.md`](docs/architecture.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)

```sh
pnpm build             # TypeScript + Vite demo build
pnpm check:cli         # CLI typecheck + smoke test
pnpm check:generated   # generated output install + TS/TSX compile validation
pnpm smoke:templates   # install button/tabs into template fixture copies and compile
pnpm templates:update   # refresh committed template outputs using the CLI
pnpm smoke:pack        # pack tarball, install it, and run installed bambi binary
pnpm check             # build + CLI + template checks
pnpm check:publish     # full check + packed install smoke
```

Useful files:

```txt
src/core                 Local component source of truth
src/generator            Generic install planning and source transforms
src/registry             Local component registry and framework providers
src/cli                  CLI commands and project file writer
apps/templates           Template fixtures for framework install checks
scripts/smoke-cli.mjs    End-to-end CLI smoke test and generated TS/TSX compile validation
scripts/smoke-templates.mjs Template install smoke test
scripts/update-templates.mjs Refresh committed template outputs
scripts/smoke-pack.mjs  Packed npm tarball install smoke test
```

## Publish validation

Before publishing, run:

```sh
pnpm check:publish
```

This verifies the local build, CLI smoke tests, template installs, and a real `pnpm pack` tarball install into a temporary project.

## Migration note

This repo is intended to replace the old `platform` monorepo as a fresh, standalone codebase. New components should be authored in `src/core/components` and exposed through `src/registry` when they are ready.
