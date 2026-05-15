# bambiui Core Agent Rules

## Responsibility

`packages/core` is the DOM Protocol source of truth for bambiui components. It owns:

- Component contracts (`<name>.contract.ts`) — DOM attribute shapes, event detail types, controller options interfaces.
- Component controllers (`<name>.controller.ts`) — vanilla TypeScript classes that implement `BambiController`.
- DOM Protocol shared interfaces and utilities (`src/dom/`).

## Controller Rules

- Every controller must implement `sync(): void` and `destroy(): void`. `update?()` is optional but recommended.
- Controllers must be **self-contained**: no imports from `@bambiui/core` or any other `@bambiui/*` package within the controller file. Inline all needed helpers and types.
- The only allowed sibling import is from `./<name>.contract.js` (the co-located contract file).
- Controllers may import implemented shared primitives from `@bambiui/core/primitives/<name>` using extensionless package specifiers in workspace source. The CLI tolerates `.js`, but new source should omit it.
- If a controller uses primitives, every primitive file, including transitive primitive dependencies, must be listed explicitly in `registry.json` `primitiveFiles`.
- This self-contained constraint lets the CLI copy the controller directly into a user project without any runtime `@bambiui/*` dependency.

## Boundaries

- Framework code (React, Vue, Svelte, Solid, HTML wrappers) belongs in `packages/registry`, not here.
- CSS belongs in `packages/registry/src/styles/`, not here.
- CLI logic, registry schema, and deployment scripts do not belong here.
- Do not import from framework packages (React, Svelte, Vue, Solid).

## Golden References

- Canonical component: `src/components/tabs/` (contract + controller).
- Component exports: `@bambiui/core/components/<name>` is the standard workspace import path.
- Primitive exports: `@bambiui/core/primitives/<name>` is the standard workspace import path for implemented primitives; `@bambiui/core/primitives` exports only primitives that are implemented and tested.
- DOM Protocol types and shared interfaces: `src/dom/`.

## Forbidden

- Do not write component behavior in framework wrappers — that belongs in the controller here.
- Do not add `@bambiui/*` imports inside controller files.
- Do not put CSS or framework wrapper files in this package.
- Do not reference `src/contracts.ts`, `src/button.ts`, or any other pre-DOM-Protocol paths — those files no longer exist.

## Verify

```sh
pnpm --filter @bambiui/core check-types
```

If controllers or contracts change, run `pnpm check` from the repo root.
