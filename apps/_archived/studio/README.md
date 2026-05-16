# Archived

This studio app is suspended and is not an active workspace, build, registry, or CLI target. Do not use its old package, token, component, or legacy runtime-package references as current bambiui architecture guidance.

Current bambiui uses CLI-first delivery:

- `packages/core` keeps internal DOM Protocol contracts, controllers, and primitive logic.
- `packages/generator` creates generated artifacts at maintainer/build time.
- `packages/registry` stores self-contained React output and CSS for CLI copying.
- `packages/cli` copies registry artifacts into user projects without runtime `@bambiui/*` dependencies.
- `apps/www` is the active static host for the landing/site and registry assets.

React is the first generated output target. Non-React framework output is deferred until the React output is stable.
