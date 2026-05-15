# bambiui CLI Agent Rules

## Responsibility

- Owns the `bambiui` executable, `init`, `add`, registry fetching, public artifact copying, and CLI smoke tests.
- Treats `registry.json` as public external input.

## What `add` Does (v2 public artifact model)

For `bambiui add <component> --framework <fw>`:
1. Reads `bambiui.config.json`.
2. Reads public `registry.json` (must be version 2).
3. Copies `styles.global` to the configured global style file.
4. Copies only `components[component].files[framework][]` into `componentDir/<name>/`.

The CLI does not copy contracts, controllers, adapter helpers, primitives, or generator inputs. It does not run the internal DOM Protocol pipeline or rewrite `@bambiui/*` imports. Public registry files must already be framework-ready and self-contained.

## Frameworks

Supported: `react`

bambiui is currently focusing on React as the first canonical adapter target. Vue, Svelte and Solid support are intentionally removed during the generic adapter migration and will be rebuilt later.

## Config Shape (bambiui.config.json)

```json
{ "framework": "react", "componentDir": "src/components/ui", "styleFile": "src/styles/bambi.css" }
```

Note: `tokensFile` is the old key name. CLI reads both for backwards compat via `mergeConfig`.

## Boundaries

- CLI runtime must NOT import `@bambiui/core` or `@bambiui/registry`.
- Installed output must be self-contained and must not contain `@bambiui/*` runtime imports.
- Registry version check: reject manifests where `version !== 2`.
- Preserve `--registry-url` flow for local development.

## Forbidden

- Do not add component package dependencies to `packages/cli/package.json`.
- Do not hardcode local workspace paths into installed output.
- Do not generate or copy `types.ts`, `define-contract.ts`, controller files, adapter helper files, or primitive files into user projects.
- Do not add import rewrite logic for internal package imports; fix the generated public artifact instead.
- Do not add Astro or restore non-React framework support without a plan.
- Do not change registry semantics without updating `scripts/check-registry.mjs`.

## Golden References

- Registry fetch/copy: `src/utils/registry.js`
- Framework options / import hint helpers: `src/utils/framework.js`
- Command behavior: `src/commands/init.js`, `src/commands/add.js`
- Smoke coverage: `scripts/smoke.js`

## Verify

```sh
pnpm --filter bambiui check-types
pnpm --filter bambiui smoke
pnpm --filter bambiui check
pnpm check-registry
```
