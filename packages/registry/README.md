# @bambiui/registry

Internal registry package for generated public bambiui artifacts and CSS.

The CLI copies files referenced by root `registry.json` from this package into user projects. These files must be framework-ready and self-contained.

## Contents

```txt
src/styles/bambi.css              global style source
src/styles/tabs.css               canonical component CSS source
generated/shared/bambi-helpers.ts single shared public helper file
generated/tabs/                   canonical generated Tabs artifacts
```

## Registry Model

- Public manifest: root `registry.json`, version 2.
- Internal authoring manifest: root `registry.authoring.json`.
- Component files live under `generated/<name>/<framework>/`.
- Component CSS lives at `generated/<name>/<name>.css`.
- `registry.json.shared` points to `generated/shared/bambi-helpers.ts`.
- Helper usage is declared per component and framework in `components.<name>.helpers.<framework>`.

## Maintainer Commands

```sh
pnpm registry:refresh
pnpm check-registry
pnpm --filter @bambiui/registry check-types
```

Run `pnpm registry:refresh` after changing registry CSS, authoring manifests, contracts, controllers, or generator behavior that affects public artifacts.
