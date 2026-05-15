# bambiui Templates

These apps are local fixture projects for testing the bambiui CLI against real framework projects.

They are not part of the public product surface. Keep them small, framework-specific, and useful for validating source-distributed component installs.

## Templates

- `bambi-next`: React/Next.js fixture.
- `bambi-svelte`: SvelteKit fixture.
- `bambi-vue`: Vue/Vite fixture.

Solid and HTML are covered by the CLI unit smoke (`node packages/cli/scripts/smoke.js`). Real template fixtures for those frameworks are a separate future task.

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

Expected generated output (example for `react`):

```
src/styles/bambi.css
src/components/ui/tabs/component/tabs.css
src/components/ui/tabs/component/types.ts
src/components/ui/tabs/component/define-contract.ts
src/components/ui/tabs/component/tabs.contract.ts
src/components/ui/tabs/component/tabs.controller.ts
src/components/ui/tabs/component/create-react-adapter.ts
src/components/ui/tabs/component/create-react-part.tsx
src/components/ui/tabs/component/use-bambi-controller.ts
src/components/ui/tabs/component/tabs.react.tsx
src/components/ui/tabs/tabs.ts
```

For `svelte`, replace `tabs.react.tsx` with `tabs.svelte`, `tabs-list.svelte`, `tabs-trigger.svelte`, `tabs-content.svelte`. For `vue`, replace with the equivalent `.vue` files.

If a template has no installed dependencies yet, install them first:

```sh
pnpm smoke:templates -- --install
```

The templates use their own lock files, so the smoke script uses `npm ci` for template installs.

## Notes

- Do not commit `node_modules`, `.next`, `.svelte-kit`, `dist`, or other generated output.
- Generated bambiui component files may be committed when they intentionally represent the current fixture state.
- These fixtures should stay boring: one page, one imported component, enough framework config to catch integration regressions.
