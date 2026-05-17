# bambiui Templates

These apps are local fixture projects for testing the bambiui CLI against real framework projects.

They are not part of the public product surface. Keep them small, framework-specific, and useful for validating public artifact component installs.

## Templates

- `bambi-react`: React/Next.js fixture.
- `bambi-solid`: SolidStart SSR fixture.
- `bambi-svelte`: SvelteKit SSR fixture.
- `bambi-vue`: Nuxt SSR fixture.

## Smoke Test

From the repository root:

```sh
pnpm smoke:templates
```

The smoke test runs the local CLI against each template:

```sh
node packages/cli/src/index.js init --yes --framework <framework> --cwd <template> --registry-url <repo>
node packages/cli/src/index.js add tabs --framework <framework> --cwd <template> --registry-url <repo> --force
```

Then it verifies the expected generated files and runs the template's framework check.

Expected generated output varies by framework. Example for `react`:

```
src/styles/bambi.css
src/components/ui/bambi-helpers.ts
src/components/ui/tabs/index.tsx
src/components/ui/tabs/tabs.css
```

Example for `svelte` / `vue`, the `tabs/` directory contains per-part component files instead of a single `index.tsx`.

If a template has no installed dependencies yet, install them first:

```sh
pnpm smoke:templates -- --install
```

The smoke script detects whether a `package-lock.json` exists in each template directory: if it does, it runs `npm ci`; otherwise it falls back to `npm install`. All four templates currently carry committed lock files, so `--install` runs `npm ci` for each.

## Notes

- Do not commit `node_modules`, `.next`, `dist`, or other generated output.
- Generated bambiui component files may be committed when they intentionally represent the current fixture state.
- Internal contract, controller, primitive, generator, or runtime package files must not appear in template output.
- Template output must stay self-contained: no `@bambiui/*` runtime imports.
- These fixtures should stay boring: one SSR-rendered page, one imported component, enough framework config to catch integration regressions.
