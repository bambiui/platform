# bambi-react fixture

Next.js fixture used by the bambiui CLI smoke tests.

This project intentionally contains generated bambiui files so the CLI can be tested against a real React/Next app:

- `src/styles/bambi.css` mirrors `packages/registry/src/styles/bambi.css`.
- `src/components/ui/tabs/` mirrors CLI-installed Tabs public output.
- Tabs output contains `index.tsx` and `tabs.css`.
- Installed bambiui output must stay self-contained, with no `@bambiui/*` runtime imports or internal contract/controller/generator files.

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
