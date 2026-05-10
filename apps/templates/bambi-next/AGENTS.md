<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# bambiui fixture notes

This app is a CLI smoke-test fixture, not a public starter template.

- Generated bambiui files are intentionally committed.
- `src/styles/bambi.css` should mirror `packages/tokens/src/tokens.css`.
- `src/components/ui/button/button.css` should mirror `packages/components/button/src/button.css`.
- `src/components/ui/button/index.ts` should re-export `Button`, recipe helpers, defaults, and public types.
