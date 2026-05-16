# bambiui fixture notes

This app is a CLI smoke-test fixture, not a public starter template.

- Generated bambiui files are intentionally committed.
- `src/styles/bambi.css` should mirror `packages/registry/src/styles/bambi.css`.
- `src/components/ui/tabs/` should mirror CLI-installed Tabs solid output.
- Tabs output should contain only `index.tsx` and `tabs.css`.
- Installed output must stay self-contained: no `@bambiui/*` runtime imports and no contract, controller, primitive, or generator files.
- Do not add non-Solid framework fixtures here; Solid output is the active smoke target for this template.
