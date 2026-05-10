# BambiUI Templates

These apps are local fixture projects for testing the BambiUI CLI against real framework projects.

They are not part of the public product surface and are not distributed as starter templates yet. Keep them small, framework-specific, and useful for validating source-distributed component installs before adding or releasing components.

## Templates

- `bambi-next`: React/Next fixture.
- `bambi-svelte`: SvelteKit fixture.
- `bambi-vue`: Vue/Vite fixture.

## Smoke Test

From the repository root:

```sh
pnpm smoke:templates
```

The smoke test runs the local CLI against each template:

```sh
node packages/cli/src/index.js init --yes --framework <framework> --cwd <template> --registry-url <repo>
node packages/cli/src/index.js add button --framework <framework> --cwd <template> --registry-url <repo> --force
```

Then it verifies the expected generated files and runs the template's framework check.

If a template has no installed dependencies yet, install them explicitly:

```sh
pnpm smoke:templates -- --install
```

The templates use their own `package-lock.json` files, so the smoke script uses `npm ci` for template installs.

## Notes

- Do not commit `node_modules`, `.next`, `.svelte-kit`, `dist`, or other generated output.
- Generated BambiUI component files may be committed when they intentionally represent the current fixture state.
- These fixtures should stay boring: one page, one imported component, enough framework config to catch integration regressions.
