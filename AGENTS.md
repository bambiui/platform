# bambiui Agent Entry

bambiui is a pnpm + Turborepo monorepo for a CLI that copies source components for React, Svelte, Vue, and Astro into user projects. This file is the fast path for coding agents. Open `docs/agent-context.md` only for deeper architecture or deployment detail.

## Navigate

```txt
packages/cli        bambiui init/add; fetches registry assets and writes user files
packages/core       framework-agnostic contracts and shared type source of truth
packages/tokens     global CSS tokens only
packages/components source component implementations; button is canonical
apps/www            custom Astro marketing/landing site; served at /
apps/docs           Starlight documentation only; served at /docs
apps/studio         token builder, previews, playground; served at /studio
registry.json       manifest copied to the static site and consumed by CLI
```

Nested rules:

- `packages/cli/AGENTS.md`
- `packages/core/AGENTS.md`
- `packages/components/AGENTS.md`
- `apps/docs/AGENTS.md`
- `apps/studio/AGENTS.md`

## Architecture Principles

- Dependency direction: `cli -> registry/static files`; `components -> core`; `docs/studio -> components + tokens`.
- `packages/cli` must not depend on `@bambiui/components` or `@bambiui/tokens` at runtime.
- Installed component files must be self-contained after the CLI copies them.
- Shared contracts live in `packages/core/src/contracts.ts`; component-specific contracts derive from them.
- Global tokens live in `packages/tokens/src/tokens.css`; component token defaults live beside the component CSS.
- Component CSS should be shared across frameworks and driven by stable `data-*` attributes.
- Production output is `apps/www/dist`; docs and studio are merged in at `/docs` and `/studio`.

## Forbidden

- Do not create per-component packages, per-component build steps, or publish workflows.
- Do not import bambiui runtime packages from installed component output.
- Do not move component tokens such as `--bambi-button-*` into global `tokens.css`.
- Do not duplicate recipes across frameworks; use one component-local recipe when needed.
- Do not change studio `base: '/studio'` unless deployment changes too.
- Do not redesign registry, package layout, or runtime boundaries.
- Do not edit generated/template fixture files without checking their source.
- Do not reintroduce `/builder` paths or `apps/builder`.
- Do not treat `apps/docs` as the product landing page or add marketing sections to it.
- Do not add Starlight UI elements to `apps/www`.
- Do not add heavy live previews or playgrounds to `apps/docs`; put them in `apps/studio`.

## Golden References

- Button is canonical for implementation shape, registry wiring, self-contained output, a11y, and styling patterns; not for visual design or API semantics: `packages/components/button/src/**`.
- Core contracts are the source of truth: `packages/core/src/contracts.ts` and `packages/core/src/button.ts`.
- Registry patterns should be copied from the existing `button` entry in `registry.json`.
- Token layering is documented in `packages/tokens/src/tokens.css`.
- CLI registry flow starts in `packages/cli/src/utils/registry.js`, `commands/init.js`, and `commands/add.js`.

## Common Commands

```sh
pnpm install
pnpm check
pnpm build
pnpm check-types
pnpm --filter www dev
pnpm --filter docs dev
pnpm --filter studio dev
pnpm deploy-static
```

## Verification Matrix

| Change                                             | Run                                  |
| -------------------------------------------------- | ------------------------------------ |
| component source/CSS/contracts/CLI/registry/tokens | `pnpm check`                         |
| CLI only                                           | `pnpm --filter bambiui check`        |
| registry only                                      | `pnpm check-registry`                |
| token only                                         | `pnpm check-tokens`                  |
| docs only                                          | `pnpm --filter docs check-types`     |
| studio only                                        | `pnpm --filter studio check-types`   |
| www only                                           | `pnpm --filter www check-types`      |
| templates                                          | `pnpm smoke:templates`               |

## Add A Component

1. Reuse or add contracts in `packages/core/src/contracts.ts`.
2. Add source and CSS under `packages/components/<name>/src/`.
3. Copy the button registry shape; update `registry.json`.
4. Add docs under `apps/docs/src/content/docs/components/<name>.mdx`.
5. Run `pnpm check`.

## Component Standards

- Semantic HTML first; ARIA only when native semantics are not enough.
- Preserve keyboard access, focus, disabled, loading, and accessible names across frameworks.
- Use each framework's own hooks, bindings, directives, event model, and a11y tooling instead of generic cross-framework behavior helpers.
- Keep the public API equivalent, but write idiomatic framework source.
- Use `data-*` attributes for visual variants and states.

## Component API Convention

- New complex components should provide a compound API when the component has meaningful internal structure.
- When common usage is obvious, the same root component should also support a props-driven convenience API.
- Avoid `*Simple` component names unless there is a very strong reason.
- Compound subcomponents remain the source of truth for advanced layouts and custom composition.
- Props-driven APIs must internally render the same semantic structure as the compound API.
- Props-driven APIs must not weaken accessibility, keyboard behavior, focus management, or semantic HTML.
- Keep API concepts equivalent across React, Svelte, Vue, and Astro, but implement them idiomatically per framework.
- React can use `ReactNode` props such as `header`, `footer`, and `actions`; Svelte, Vue, and Astro should use idiomatic props and slots where those props do not map cleanly.
- Existing exports should not be removed.

## Registry Pattern

- `exportName`: public component export.
- `api.typeExports`: public installed type names.
- `api.types`: generated self-contained `types.ts` metadata.
- `style.from` and `style.fileName`: source CSS and installed CSS name.
- `shared`: files copied for every framework, or generated files such as `{ "kind": "types", "to": "types.ts", "generate": "types" }`.
- `files.react|svelte|vue|astro`: framework-specific source files copied into the user project.

## Multi-Agent Coordination

- Keep write scope narrow and explicit.
- One agent at a time for: `registry.json`, `packages/core/src/contracts.ts`, `packages/tokens/src/tokens.css`, `AGENTS.md`, `docs/agent-context.md`.
- Suggested split for a new component: Component Agent owns source/CSS, Docs Agent owns docs/examples, Registry/CLI Agent owns registry/CLI checks, QA Agent runs final verification.
- Do not revert or overwrite changes you did not make.

## Commit Rules

- Use commitlint-style short subjects only.
- Use prefixes like `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- No commit body, bullet list, or long explanation.
