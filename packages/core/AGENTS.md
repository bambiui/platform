# bambiui Core Agent Rules

`packages/core` is the internal DOM Protocol source of truth. It owns component contracts, vanilla TypeScript controllers, shared DOM interfaces/utilities, and implemented primitives.

## Controller And Contract Rules

- Contracts define attribute shapes, event detail types, and controller option interfaces.
- Every controller must implement `sync(): void` and idempotent `destroy(): void`; `update?()` is optional.
- Controllers are internal authoring inputs and must be self-contained enough for the generator to inline behavior.
- Controller files may import only the sibling contract via `./<name>.contract.js` and implemented primitives via extensionless `@bambiui/core/primitives/<name>`.
- Do not add other `@bambiui/*` imports inside controller files.
- Re-export types that generated framework output needs from the component index or controller as the existing component pattern requires.
- If a controller uses primitives, list every required primitive source file in `registry.authoring.json` `primitiveFiles`.

## Boundaries

- Framework wrapper output belongs in `packages/registry/generated`, not here.
- Component CSS belongs in `packages/registry/src/styles`, not here.
- CLI logic, registry validation, and static hosting do not belong here.
- Do not import React, Solid, Svelte, Vue, or other framework packages.
- Public CLI output must not depend on this package at runtime.

## References

- Canonical component: `src/components/tabs/`
- DOM Protocol utilities: `src/dom/`
- Implemented primitives: `src/primitives/`
- Workspace export paths: `@bambiui/core/components/<name>` and `@bambiui/core/primitives/<name>`

## Verify

```sh
pnpm --filter @bambiui/core check-types
pnpm --filter @bambiui/core test:tabs
pnpm --filter @bambiui/core test:roving-focus
```

Run `pnpm registry:refresh && pnpm check` after contract, controller, primitive, or CSS-related authoring changes.
