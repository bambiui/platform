# Contributing to bambiui

This repo is the new standalone bambiui codebase. Keep changes scoped, generated output honest, and validation green.

## Current supported scope

Components currently supported by the local authoring registry:

- `button`
- `tabs`

Framework targets:

- `vanilla`
- `react`
- `solid`
- `svelte`
- `vue`

Do not advertise or add old `platform` components unless they are migrated into `src/core/components` and exposed through `src/registry`.

## Architecture rule

The active flow is:

```txt
src/core -> src/generator -> src/registry -> src/cli -> user/template project
```

Rules:

- `src/core` is the source of truth for component behavior.
- `src/generator` must stay generic.
- Framework-specific generation belongs in `src/registry/frameworks/*`.
- CLI should consume registry/generator metadata instead of hardcoded component branches.
- Installed output must not import `@bambiui/*`, `src/core`, `src/generator`, or internal authoring files.
- Component state and styling should use serializable `data-*` attributes.
- Do not put callbacks, objects, or functions into `data-*` attributes.

## Adding a component

1. Add source under `src/core/components/<name>/`.
2. Export it from `src/core/components/index.ts`.
3. Add styles under the component folder.
4. Register it in `src/registry/registry.ts`.
5. Ensure framework providers can generate the desired output from parsed metadata.
6. Add CLI smoke coverage.
7. Add template smoke expectations.
8. Run:

```sh
pnpm check
```

## Validation commands

```sh
pnpm build             # app/demo build
pnpm check:cli         # CLI typecheck + CLI smoke
pnpm smoke:templates   # install into framework templates and compile
pnpm check             # full current gate
```

## Before submitting

- Keep `bambi list` accurate.
- Keep README supported-scope accurate.
- Do not commit generated temp folders:
  - `.tmp-cli-smoke`
  - `.tmp-template-smoke`
  - `dist`
  - `dist-cli`
- Prefer small migrations over bulk copying old platform artifacts.
