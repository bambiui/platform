# bambiui CLI Agent Rules

## Responsibility

- Owns the `bambiui` executable, `init`, `add`, registry fetching, file copying, generated installed files, and CLI smoke tests.
- Treat `registry.json` and static registry files as external input to the CLI.

## Boundaries

- CLI runtime must not import `@bambiui/components` or `@bambiui/tokens`.
- CLI-installed component output must be self-contained in user projects.
- Preserve `--registry-url` and `BAMBIUI_REGISTRY_URL` flows.
- Keep generated `types.ts` driven by registry metadata, not by package runtime imports.

## Forbidden

- Do not add component package dependencies to `packages/cli/package.json`.
- Do not hardcode local workspace paths into installed output.
- Do not make `add` require docs, builder, or component package runtime code.
- Do not change registry semantics without updating `scripts/check-registry.mjs` and docs.

## Golden References

- Registry fetch/copy: `src/utils/registry.js`.
- Installed file naming/barrel generation: `src/utils/framework.js`.
- Generated types source: `src/utils/files.js`.
- Command behavior: `src/commands/init.js`, `src/commands/add.js`.
- Smoke coverage: `scripts/smoke.js`.

## Verify

```sh
pnpm --filter bambiui check-types
pnpm --filter bambiui smoke
pnpm --filter bambiui check
```

Registry-affecting CLI changes should also run `pnpm check-registry`.
