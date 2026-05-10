# bambi-vue fixture

Vue/Vite fixture used by the bambiui CLI smoke tests.

This project intentionally contains generated bambiui files so the CLI can be tested against a real Vue app:

- `src/styles/bambi.css` mirrors `packages/tokens/src/tokens.css`.
- `src/components/ui/button/button.css` mirrors `packages/components/button/src/button.css`.
- `src/components/ui/button/index.ts` should re-export `Button`, recipe helpers, defaults, and public types.

Run from the monorepo root:

```sh
pnpm smoke:templates
```

Or run the fixture directly:

```sh
npm install
npm run dev
```
