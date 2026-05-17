# bambiui CLI Agent Rules

`packages/cli` owns the published `bambiui` executable, `init`, `add`, registry fetching, public artifact copying, and CLI smoke tests. Treat `registry.json` as external public input.

## Current Behavior

For `bambiui add <component> --framework <framework>`:

1. Read `bambiui.config.json` and flags.
2. Fetch/read public `registry.json` and require `version: 2`.
3. Copy `styles.global` to the configured global style file.
4. Copy `components[component].files[framework][]` into `componentDir/<name>/`.
5. Copy `components[component].css` into the component directory when declared.
6. If `components[component].helpers[framework]` is non-empty, copy `manifest.shared` to `componentDir/bambi-helpers.ts`.

The CLI does not run the generator, parse contracts, rewrite internal imports, or copy authoring inputs.

## Boundaries

- CLI runtime must not import `@bambiui/core`, `@bambiui/generator`, or `@bambiui/registry`.
- Installed output must be self-contained: no runtime `@bambiui/*` imports, contracts, controllers, internal primitives, or generator files.
- Preserve `--registry-url` for local registry testing.
- Keep framework support limited to `react`, `solid`, `svelte`, and `vue`.
- Do not change registry semantics without updating `scripts/check-registry.mjs`.

## Useful Files

- Command behavior: `src/commands/init.js`, `src/commands/add.js`
- Registry fetch/copy: `src/utils/registry.js`
- Framework detection/config: `src/utils/framework.js`
- Smoke coverage: `scripts/smoke.js`

## Verify

```sh
pnpm --filter bambiui check-types
pnpm --filter bambiui smoke
pnpm --filter bambiui check
```

Run `pnpm registry:refresh && pnpm check-registry` if registry assumptions or artifact paths change.
