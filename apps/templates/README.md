# bambi template fixtures

Lightweight local fixtures used by `pnpm smoke:templates`.

The smoke runner copies each fixture to `.tmp-template-smoke`, runs the built CLI against the copy, installs `button` and `tabs`, asserts generated files, and compiles generated TypeScript/TSX where possible without external framework packages.
