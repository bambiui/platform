# bambi-next fixture

Next.js fixture used by the bambiui CLI smoke tests.

This project intentionally contains generated bambiui files so the CLI can be tested against a real React/Next app:

- `src/styles/bambi.css` mirrors `packages/registry/src/styles/bambi.css`.
- `src/components/ui/tabs/component/` mirrors CLI-installed Tabs output.
- `src/components/ui/tabs/tabs.ts` re-exports the installed React Tabs components.

Run from the monorepo root:

```sh
pnpm smoke:templates
```

Or run the fixture directly:

```sh
npm install
npm run dev
```

Open `http://localhost:3000`.
