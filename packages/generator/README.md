# @bambiui/generator

Private generator package for bambiui registry artifacts.

The generator reads internal DOM Protocol contracts/controllers and emits framework-ready public source for React, Solid, Svelte 5, and Vue 3. It is maintainer tooling only; the CLI and installed user output must not depend on it.

## Contents

```txt
src/index.js       framework dispatch entrypoint
src/shared.js      parser and generation utilities
src/react/         React artifact generator
src/solid/         Solid artifact generator
src/svelte/        Svelte 5 artifact generator
src/vue/           Vue 3 artifact generator
src/__tests__/     generator tests
```

## Maintainer Commands

```sh
pnpm --filter @bambiui/generator test
pnpm registry:refresh
pnpm check-registry
```

`pnpm registry:refresh` is the normal entrypoint. It calls this package, writes generated files under `packages/registry/generated`, refreshes hashes, and validates the public registry.
