# bambiui CLI Agent Rules

## Responsibility

- Owns the `bambiui` executable, `init`, `add`, registry fetching, file copying, and CLI smoke tests.
- Treats `registry.json` and static registry files as external input.

## What `add` Does (v2 model)

For `bambiui add <component> --framework <fw>`:
1. Reads `bambiui.config.json`
2. Reads `registry.json` (must be version 2)
3. Creates `componentDir/<name>/component/` and copies there:
   - `contractFiles[]` — shared contract helper files
   - `contract` — component contract file
   - `controller` — component controller file
   - `style` — component CSS file
   - `adapter[framework][]` — React adapter helper files
   - `files[framework][]` — React wrapper file(s)
4. Writes barrel `componentDir/<name>/<name>.ts` via `getIndexContent(framework, componentName)`
5. Applies `flattenPackageImports` transform to all copied files:
   - `@bambiui/core/components/<name>` → local controller file from registry metadata
   - `@bambiui/adapters/<framework>` → local adapter entry file from registry metadata
   - `@bambiui/core/contract` → `"./types"`
   - Relative `.js` extensions stripped for bundler compat

No type generation. No recipe.ts.

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
- Installed output must be self-contained (no `@bambiui/*` runtime imports).
- Registry version check: reject manifests where `version !== 2`.
- Preserve `--registry-url` flow for local development.

## Forbidden

- Do not add component package dependencies to `packages/cli/package.json`.
- Do not hardcode local workspace paths into installed output.
- Do not generate `types.ts` or `recipe.ts` — the new model has no generated files.
- Do not add Astro or restore non-React framework support without a plan.
- Do not change registry semantics without updating `scripts/check-registry.mjs`.

## Golden References

- Registry fetch/copy: `src/utils/registry.js`
- Framework options / barrel generation: `src/utils/framework.js`
- Command behavior: `src/commands/init.js`, `src/commands/add.js`
- Smoke coverage: `scripts/smoke.js`

## Verify

```sh
pnpm --filter bambiui check-types
pnpm --filter bambiui smoke
pnpm --filter bambiui check
pnpm check-registry   # after registry.json changes
```
