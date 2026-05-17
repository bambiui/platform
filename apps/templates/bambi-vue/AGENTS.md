# bambiui fixture notes

This app is a CLI smoke-test fixture, not a public starter template.

- Generated bambiui files are intentionally committed.
- `src/styles/bambi.css` should mirror `packages/registry/src/styles/bambi.css` plus CLI-added component CSS imports.
- Component CSS should live in `src/styles/`.
- `src/components/ui/tabs/` should mirror CLI-installed Tabs vue output.
- Tabs output should contain `Tabs.vue`, `TabsList.vue`, `TabsTrigger.vue`, `TabsContent.vue`, and `index.ts`; Tabs CSS should be `src/styles/tabs.css`.
- Installed output must stay self-contained: no `@bambiui/*` runtime imports and no contract, controller, primitive, or generator files.
- Do not add non-Vue framework fixtures here; Vue output is the active smoke target for this template.
