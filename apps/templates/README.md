# bambiui Templates

These apps are local fixture projects for testing the bambiui CLI against real framework projects.

They are not part of the public product surface. Keep them small, framework-specific, and useful for validating public artifact component installs.

## Templates

- `bambi-react`: React/Next.js fixture.

bambiui is currently focusing on React as the first generated output target.
Vue, Svelte and Solid output targets are not the current focus; React output is being stabilized first.

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
src/components/ui/tabs/index.tsx
src/components/ui/tabs/tabs.css
```

If a template has no installed dependencies yet, install them first:

```sh
pnpm smoke:templates -- --install
```

The templates use their own lock files, so the smoke script uses `npm ci` for template installs.

## Notes

- Do not commit `node_modules`, `.next`, `dist`, or other generated output.
- Generated bambiui component files may be committed when they intentionally represent the current fixture state.
- Internal contract, controller, primitive, generator, or runtime package files must not appear in template output.
- Template output must stay self-contained: no `@bambiui/*` runtime imports.
- These fixtures should stay boring: one page, one imported component, enough framework config to catch integration regressions.
