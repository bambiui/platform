<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# bambiui fixture notes

This app is a CLI smoke-test fixture, not a public starter template.

- Generated bambiui files are intentionally committed.
- `src/styles/bambi.css` should mirror `packages/registry/src/styles/bambi.css` plus CLI-added component CSS imports.
- Component CSS should live in `src/styles/`.
- `src/components/ui/tabs/` should mirror CLI-installed Tabs public output.
- Tabs output should contain only `index.tsx`; Tabs CSS should be `src/styles/tabs.css`.
- Installed output must stay self-contained: no `@bambiui/*` runtime imports and no contract, controller, primitive, or generator files.
- Do not add non-React framework fixtures here; React output is the active smoke target.
