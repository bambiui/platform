# @bambiui/core

Internal DOM Protocol source package for bambiui.

This package owns component contracts, vanilla TypeScript controllers, shared DOM utilities, and implemented primitives. It is an authoring input for generated public artifacts; user-installed component output must not depend on it at runtime.

## Contents

```txt
src/components/tabs/   canonical contract and controller
src/dom/               controller, attribute, event, and mount utilities
src/primitives/        implemented DOM primitives
contract/              contract authoring helpers
runtime/               internal runtime helpers
```

## Controller Model

- Controllers express state through serializable `data-*` attributes.
- Controlled mode fires `bambi:<event-name>` and leaves source state to the host framework.
- Uncontrolled mode mutates source state and fires the same event.
- `sync()` and `destroy()` are required; `update?()` is optional.

## Maintainer Commands

```sh
pnpm --filter @bambiui/core check-types
pnpm --filter @bambiui/core test:tabs
pnpm --filter @bambiui/core test:roving-focus
```

Run `pnpm registry:refresh && pnpm check` from the repo root after changing contracts, controllers, primitives, or behavior that affects generated artifacts.
